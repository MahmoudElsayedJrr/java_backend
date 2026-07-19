const orderRepo = require("../repositories/order.repository");
const productRepo = require("../repositories/product.repository");
const inventoryRepo = require("../repositories/inventory.repository");
const auditLogRepo = require("../repositories/auditLog.repository");
const prisma = require("../config/prisma");
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
} = require("../utils/errors");
const {
  AUDIT_ACTIONS,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  SOCKET_EVENTS,
  ORDER_TYPE,
  SHIPPING_FEE,
} = require("../constants");
const {
  generateOrderNumber,
  calculateOrderTotals,
  parsePagination,
} = require("../utils/helpers");
const { getIO } = require("../sockets");

const TAX_RATE = parseFloat(process.env.TAX_RATE || 0);

class OrderService {
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.status) where.status = query.status;
    if (query.orderType) where.orderType = query.orderType;
    if (query.cashierId) where.cashierId = query.cashierId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    const { data, total } = await orderRepo.findAllPaginated({
      skip,
      take: limit,
      where,
    });
    return { data, total, page, limit };
  }

  async getById(id) {
    const order = await orderRepo.findByIdFull(id);
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }

  async getMyCashierOrders(cashierId, query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.status) where.status = query.status;
    const { data, total } = await orderRepo.findByCashier(cashierId, {
      skip,
      take: limit,
      where,
    });
    return { data, total, page, limit };
  }

  async create(data, cashierId) {
    const {
      items,
      paymentMethod,
      discount = 0,
      notes,
      orderType,
      deliveryAddress,
    } = data;

    // Validate delivery address
    if (orderType === ORDER_TYPE.DELIVERY && !deliveryAddress?.trim()) {
      throw new BadRequestError(
        "Delivery address is required for delivery orders",
      );
    }

    // ── Enrich items ────────────────────────────────────────
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await productRepo.findForOrder(item.productId);
        if (!product)
          throw new NotFoundError(
            `Product ${item.productId} not found or inactive`,
          );

        let flavorAdditional = 0;
        if (item.flavorIds?.length) {
          const validFlavors = product.productFlavors.map((pf) => pf.flavorId);
          const invalid = item.flavorIds.filter(
            (fId) => !validFlavors.includes(fId),
          );
          if (invalid.length) {
            throw new BadRequestError(
              `Flavors [${invalid.join(", ")}] not available for product ${product.name}`,
            );
          }
          flavorAdditional = item.flavorIds.reduce((sum, fId) => {
            const pf = product.productFlavors.find((p) => p.flavorId === fId);
            return sum + parseFloat(pf?.flavor?.additionalPrice || 0);
          }, 0);
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: parseFloat(product.basePrice) + flavorAdditional,
          notes: item.notes || null,
          flavorIds: item.flavorIds || [],
          available: product.inventory?.quantity ?? 0,
          name: product.name,
        };
      }),
    );

    // ── Check stock ─────────────────────────────────────────
/*     for (const item of enrichedItems) {
      if (item.available < item.quantity) {
        throw new ConflictError(
          `Insufficient stock for "${item.name}". Available: ${item.available}, requested: ${item.quantity}`,
        );
      }
    } */

    // ── Calculate totals ────────────────────────────────────
    const totals = calculateOrderTotals(enrichedItems, discount, TAX_RATE);
    const shippingFee = orderType === ORDER_TYPE.DELIVERY ? SHIPPING_FEE : 0;
    const finalTotal = parseFloat((totals.total + shippingFee).toFixed(2));

    // ── DB Transaction ──────────────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);

      const created = await orderRepo.createFull(
        {
          orderData: {
            orderNumber,
            cashierId,
            paymentMethod,
            notes,
            orderType,
            deliveryAddress:
              orderType === ORDER_TYPE.DELIVERY ? deliveryAddress : null,
            shippingFee,
            ...totals,
            total: finalTotal,
            status: ORDER_STATUS.PENDING,
          },
          items: enrichedItems,
        },
        tx,
      );

      for (const item of enrichedItems) {
        await inventoryRepo.deductStock(item.productId, item.quantity, tx);
      }

      return created;
    });

    // ── Audit + Socket ──────────────────────────────────────
    await auditLogRepo.log({
      userId: cashierId,
      action: AUDIT_ACTIONS.ORDER_CREATED,
      entity: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        total: finalTotal,
        orderType,
      },
    });

    getIO()?.emit(SOCKET_EVENTS.ORDER_CREATED, { order });

    return order;
  }

  async updateStatus(id, newStatus, actorId) {
    const order = await orderRepo.findByIdFull(id);
    if (!order) throw new NotFoundError("Order not found");

    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Cannot transition order from ${order.status} to ${newStatus}`,
      );
    }

    const updated = await orderRepo.update(id, { status: newStatus });

    await auditLogRepo.log({
      userId: actorId,
      action:
        newStatus === ORDER_STATUS.CANCELLED
          ? AUDIT_ACTIONS.ORDER_CANCELLED
          : AUDIT_ACTIONS.ORDER_UPDATED,
      entity: "Order",
      entityId: id,
      metadata: { from: order.status, to: newStatus },
    });

    const event =
      newStatus === ORDER_STATUS.CANCELLED
        ? SOCKET_EVENTS.ORDER_CANCELLED
        : SOCKET_EVENTS.ORDER_UPDATED;

    getIO()?.emit(event, { order: updated });

    return updated;
  }
}

module.exports = new OrderService();
