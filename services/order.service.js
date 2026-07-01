const orderRepo     = require('../repositories/order.repository');
const productRepo   = require('../repositories/product.repository');
const inventoryRepo = require('../repositories/inventory.repository');
const auditLogRepo  = require('../repositories/auditLog.repository');
const prisma        = require('../config/prisma');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const { AUDIT_ACTIONS, ORDER_STATUS, ORDER_STATUS_TRANSITIONS, SOCKET_EVENTS } = require('../constants');
const { generateOrderNumber, calculateOrderTotals } = require('../utils/helpers');
const { parsePagination } = require('../utils/helpers');
const { getIO } = require('../sockets');

const TAX_RATE = parseFloat(process.env.TAX_RATE || 14);

class OrderService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.status)    where.status    = query.status;
    if (query.cashierId) where.cashierId = query.cashierId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to)   where.createdAt.lte = new Date(query.to);
    }

    const { data, total } = await orderRepo.findAllPaginated({ skip, take: limit, where });
    return { data, total, page, limit };
  }

  async getById(id) {
    const order = await orderRepo.findByIdFull(id);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async getMyCashierOrders(cashierId, query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.status) where.status = query.status;

    const { data, total } = await orderRepo.findByCashier(cashierId, { skip, take: limit, where });
    return { data, total, page, limit };
  }

  /**
   * Full order creation flow — all inside a DB transaction:
   * 1. Validate items + fetch prices
   * 2. Validate flavors belong to products
   * 3. Check inventory
   * 4. Calculate totals
   * 5. Generate order number
   * 6. Create order + items + flavors atomically
   * 7. Deduct inventory
   * 8. Audit log
   * 9. Emit socket event
   */
  async create(data, cashierId) {
    const { items, paymentMethod, discount = 0, notes } = data;

    // ── Step 1: Validate & enrich items ────────────────────
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await productRepo.findForOrder(item.productId);
        if (!product) throw new NotFoundError(`Product ${item.productId} not found or inactive`);

        // Validate flavors belong to this product
        let flavorAdditional = 0;
        if (item.flavorIds?.length) {
          const validFlavors = product.productFlavors.map((pf) => pf.flavorId);
          const invalid      = item.flavorIds.filter((fId) => !validFlavors.includes(fId));
          if (invalid.length) {
            throw new BadRequestError(`Flavors [${invalid.join(', ')}] not available for product ${product.name}`);
          }
          flavorAdditional = item.flavorIds.reduce((sum, fId) => {
            const pf = product.productFlavors.find((p) => p.flavorId === fId);
            return sum + parseFloat(pf?.flavor?.additionalPrice || 0);
          }, 0);
        }

        return {
          productId:  item.productId,
          quantity:   item.quantity,
          unitPrice:  parseFloat(product.basePrice) + flavorAdditional,
          notes:      item.notes || null,
          flavorIds:  item.flavorIds || [],
          // for stock check
          available:  product.inventory?.quantity ?? 0,
          name:       product.name,
          flavors:    product.productFlavors.map((pf) => ({ additionalPrice: pf.flavor.additionalPrice })),
        };
      })
    );

    // ── Step 2: Check inventory for all items ───────────────
    for (const item of enrichedItems) {
      if (item.available < item.quantity) {
        throw new ConflictError(
          `Insufficient stock for "${item.name}". Available: ${item.available}, requested: ${item.quantity}`
        );
      }
    }

    // ── Step 3: Calculate totals ────────────────────────────
    const totals = calculateOrderTotals(enrichedItems, discount, TAX_RATE);

    // ── Step 4: Run DB transaction ──────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      // Generate unique order number
      const orderNumber = await generateOrderNumber(tx);

      // Create order + items + flavors
      const created = await orderRepo.createFull(
        {
          orderData: {
            orderNumber,
            cashierId,
            paymentMethod,
            notes,
            ...totals,
            status: ORDER_STATUS.PENDING,
          },
          items: enrichedItems,
        },
        tx
      );

      // Deduct inventory for each item
      for (const item of enrichedItems) {
        await inventoryRepo.deductStock(item.productId, item.quantity, tx);
      }

      return created;
    });

    // ── Step 5: Audit + Socket ──────────────────────────────
    await auditLogRepo.log({
      userId:   cashierId,
      action:   AUDIT_ACTIONS.ORDER_CREATED,
      entity:   'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, total: order.total },
    });

    getIO()?.emit(SOCKET_EVENTS.ORDER_CREATED, { order });

    return order;
  }

  /**
   * Update order status — enforces valid transitions
   */
  async updateStatus(id, newStatus, actorId) {
    const order = await orderRepo.findByIdFull(id);
    if (!order) throw new NotFoundError('Order not found');

    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Cannot transition order from ${order.status} to ${newStatus}`
      );
    }

    const updated = await orderRepo.update(id, { status: newStatus });

    await auditLogRepo.log({
      userId:   actorId,
      action:   newStatus === ORDER_STATUS.CANCELLED
                  ? AUDIT_ACTIONS.ORDER_CANCELLED
                  : AUDIT_ACTIONS.ORDER_UPDATED,
      entity:   'Order',
      entityId: id,
      metadata: { from: order.status, to: newStatus },
    });

    const event = newStatus === ORDER_STATUS.CANCELLED
      ? SOCKET_EVENTS.ORDER_CANCELLED
      : SOCKET_EVENTS.ORDER_UPDATED;

    getIO()?.emit(event, { order: updated });

    return updated;
  }
}

module.exports = new OrderService();
