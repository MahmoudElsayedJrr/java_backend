const orderRepo = require("../repositories/order.repository");
const productRepo = require("../repositories/product.repository");
const auditLogRepo = require("../repositories/auditLog.repository");
const prisma = require("../config/prisma");
const {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} = require("../utils/errors");
const {
  AUDIT_ACTIONS,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  SOCKET_EVENTS,
  ORDER_TYPE,
  SHIPPING_FEE,
  ROLES,
} = require("../constants");
const {
  generateOrderNumber,
  calculateOrderTotals,
  parsePagination,
} = require("../utils/helpers");
const { getIO } = require("../sockets");

const TAX_RATE = parseFloat(process.env.TAX_RATE || 0);

class OrderService {
  // ── Admin: all orders ─────────────────────────────────────
  async getAll(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.status) where.status = query.status;
    if (query.orderType) where.orderType = query.orderType;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
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

  // ── Admin: delivery orders only ───────────────────────────
  async getDeliveryOrders(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = { orderType: ORDER_TYPE.DELIVERY };
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    const { data, total } = await orderRepo.findAllPaginated({
      skip,
      take: limit,
      where,
    });
    return { data, total, page, limit };
  }

  // ── Admin: dine-in orders only ────────────────────────────
  async getDineInOrders(query) {
    const { page, limit, skip } = parsePagination(query);
    const where = { orderType: ORDER_TYPE.DINE_IN };
    if (query.status) where.status = query.status;
    const { data, total } = await orderRepo.findAllPaginated({
      skip,
      take: limit,
      where,
    });
    return { data, total, page, limit };
  }

  // ── Cashier: own orders ───────────────────────────────────
  async getMyCashierOrders(cashierId, query) {
    const { page, limit, skip } = parsePagination(query);
    const where = {};
    if (query.status) where.status = query.status;
    if (query.orderType) where.orderType = query.orderType;
    const { data, total } = await orderRepo.findByCashier(cashierId, {
      skip,
      take: limit,
      where,
    });
    return { data, total, page, limit };
  }

  // ── Customer: own orders ──────────────────────────────────
  async getMyCustomerOrders(customerId, query) {
    const { page, limit, skip } = parsePagination(query);
    const where = { cashierId: customerId };
    if (query.status) where.status = query.status;
    const { data, total } = await orderRepo.findAllPaginated({
      skip,
      take: limit,
      where,
    });
    return { data, total, page, limit };
  }

  // ── Customer: single order (own only) ────────────────────
  async getCustomerOrderById(orderId, customerId) {
    const order = await orderRepo.findByIdFull(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.cashierId !== customerId) {
      throw new ForbiddenError("You can only view your own orders");
    }
    return order;
  }

  // ── Create order ──────────────────────────────────────────
  async create(data, userId, userRole) {
    const {
      items,
      paymentMethod,
      discount = 0,
      notes,
      orderType,
      deliveryAddress,
    } = data;

    // Customer can only make DELIVERY orders
    if (userRole === ROLES.CUSTOMER && orderType !== ORDER_TYPE.DELIVERY) {
      throw new BadRequestError("Customers can only place delivery orders");
    }

    if (orderType === ORDER_TYPE.DELIVERY && !deliveryAddress?.trim()) {
      throw new BadRequestError(
        "Delivery address is required for delivery orders",
      );
    }

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

        const basePrice = parseFloat(product.basePrice);
        const discountVal = parseFloat(product.discount || 0);
        const discountedPrice = discountVal > 0 ? basePrice * (1 - discountVal / 100) : basePrice;

        return {
          productId: item.productId,

          quantity: item.quantity,
          unitPrice: discountedPrice + flavorAdditional,
          notes: item.notes || null,
          flavorIds: item.flavorIds || [],
          available: product.inventory?.quantity ?? 0,
          name: product.name,
        };
      }),
    );

    const totals = calculateOrderTotals(enrichedItems, discount, TAX_RATE);
    const shippingFee = orderType === ORDER_TYPE.DELIVERY ? SHIPPING_FEE : 0;
    const finalTotal = parseFloat((totals.total + shippingFee).toFixed(2));

    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);

      const created = await orderRepo.createFull(
        {
          orderData: {
            orderNumber,
            cashierId: userId,
            paymentMethod,
            paymentStatus: "PENDING",
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

      return created;
    });

    await auditLogRepo.log({
      userId,
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

  // ── Confirm payment (Admin or Cashier) ────────────────────
  async confirmPayment(orderId, actorId) {
    const order = await orderRepo.findByIdFull(orderId);
    if (!order) throw new NotFoundError("Order not found");

    if (order.paymentStatus === "CONFIRMED") {
      throw new BadRequestError("Payment already confirmed");
    }

    const updated = await orderRepo.update(orderId, {
      paymentStatus: "CONFIRMED",
    });

    await auditLogRepo.log({
      userId: actorId,
      action: "PAYMENT_CONFIRMED",
      entity: "Order",
      entityId: orderId,
      metadata: {
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
      },
    });

    getIO()?.emit(SOCKET_EVENTS.ORDER_UPDATED, { order: updated });

    return updated;
  }

  // ── Update order status ───────────────────────────────────
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
