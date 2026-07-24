const BaseRepository = require("./base.repository");

const ORDER_INCLUDE = {
  cashier: { select: { id: true, name: true } },
  orderItems: {
    include: {
      product: { select: { id: true, name: true } },
      orderItemFlavors: {
        include: {
          flavor: { select: { id: true, name: true, additionalPrice: true } },
        },
      },
    },
  },
};

class OrderRepository extends BaseRepository {
  constructor() {
    super("order");
  }

  findByIdFull(id) {
    return this.model.findUnique({ where: { id }, include: ORDER_INCLUDE });
  }

  findByOrderNumber(orderNumber) {
    return this.model.findUnique({
      where: { orderNumber },
      include: ORDER_INCLUDE,
    });
  }

  findAllPaginated({ skip, take, where = {} }) {
    return this.findWithPagination({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  findByCashier(cashierId, { skip, take, where = {} } = {}) {
    return this.findWithPagination({
      where: { cashierId, ...where },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: skip || 0,
      take: take || 10,
    });
  }

  // ── Reports ───────────────────────────────────────────────

  sumByDateRange(startDate, endDate, cashierId = null) {
    const where = {
      createdAt: { gte: startDate, lte: endDate },
      status: "DELIVERED",
      ...(cashierId ? { cashierId } : {}),
    };

    return this.prisma.$transaction([
      this.model.aggregate({
        where,
        _sum: { total: true, discount: true, tax: true },
        _count: { id: true },
      }),
    ]);
  }

  dailyBreakdown(startDate, endDate) {
    return this.prisma.$queryRaw`
      SELECT
        DATE("createdAt") AS date,
        COUNT(*)          AS "orderCount",
        SUM(total)        AS "salesTotal",
        SUM(discount)     AS "totalDiscount",
        SUM(tax)          AS "totalTax"
      FROM orders
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND status = 'DELIVERED'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;
  }

  /**
   * Full order creation inside a transaction
   * Uses explicit connect for all relations (Prisma 7 compatible)
   */
  async createFull({ orderData, items }, tx) {
    const client = tx || this.prisma;

    const { cashierId, ...restOrderData } = orderData;

    const order = await client.order.create({
      data: {
        ...restOrderData,
        cashier: { connect: { id: cashierId } },
        orderItems: {
          create: items.map(
            ({ productId, quantity, unitPrice, notes, flavorIds }) => ({
              product: { connect: { id: productId } },
              quantity,
              unitPrice,
              notes,
              orderItemFlavors: flavorIds?.length
                ? {
                    create: flavorIds.map((flavorId) => ({
                      flavor: { connect: { id: flavorId } },
                    })),
                  }
                : undefined,
            }),
          ),
        },
      },
      include: ORDER_INCLUDE,
    });

    return order;
  }
}

module.exports = new OrderRepository();
