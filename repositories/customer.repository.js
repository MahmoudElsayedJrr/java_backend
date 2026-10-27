const BaseRepository = require("./base.repository");

class CustomerRepository extends BaseRepository {
  constructor() {
    super("customer");
  }

  async findWithStats({ skip = 0, take = 50, search = "" } = {}) {
    const where = {};
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { phone: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [customers, total] = await this.prisma.$transaction([
      this.model.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
        include: {
          orders: {
            select: {
              id: true,
              total: true,
              paymentStatus: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      this.model.count({ where }),
    ]);

    const data = customers.map((c) => {
      const orders = c.orders || [];
      const pendingOrders = orders.filter((o) => o.paymentStatus === "PENDING" && o.status !== "CANCELLED");
      const totalDebt = pendingOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
      const totalOrders = orders.length;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        notes: c.notes,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        totalOrders,
        unpaidOrdersCount: pendingOrders.length,
        totalDebt: parseFloat(totalDebt.toFixed(2)),
      };
    });

    return { data, total };
  }

  async findByIdWithOrders(id) {
    const customer = await this.model.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            cashier: { select: { id: true, name: true } },
            orderItems: {
              include: {
                product: { select: { id: true, name: true, imageUrl: true } },
                orderItemFlavors: {
                  include: {
                    flavor: { select: { id: true, name: true, additionalPrice: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!customer) return null;

    const orders = customer.orders || [];
    const pendingOrders = orders.filter((o) => o.paymentStatus === "PENDING" && o.status !== "CANCELLED");
    const totalDebt = pendingOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    return {
      ...customer,
      totalOrders: orders.length,
      unpaidOrdersCount: pendingOrders.length,
      totalDebt: parseFloat(totalDebt.toFixed(2)),
    };
  }
}

module.exports = new CustomerRepository();
