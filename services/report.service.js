const orderRepo = require("../repositories/order.repository");
const prisma = require("../config/prisma");

function getDayBounds(dateInput) {
  let y, m, d;
  if (!dateInput) {
    const now = new Date();
    if (now.getHours() < 3) {
      now.setDate(now.getDate() - 1);
    }
    y = now.getFullYear();
    m = now.getMonth();
    d = now.getDate();
  } else if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      y = parts[0];
      m = parts[1] - 1;
      d = parts[2];
    } else {
      const dt = new Date(dateInput);
      y = dt.getFullYear();
      m = dt.getMonth();
      d = dt.getDate();
    }
  } else if (dateInput instanceof Date) {
    y = dateInput.getFullYear();
    m = dateInput.getMonth();
    d = dateInput.getDate();
  } else {
    const now = new Date();
    if (now.getHours() < 3) {
      now.setDate(now.getDate() - 1);
    }
    y = now.getFullYear();
    m = now.getMonth();
    d = now.getDate();
  }

  // Full business day: 03:00:00.000 (y, m, d) to 02:59:59.999 (y, m, d + 1)
  const startOfDay = new Date(y, m, d, 3, 0, 0, 0);
  const endOfDay = new Date(y, m, d + 1, 2, 59, 59, 999);

  // Shift 1 (Morning): 08:00:00.000 to 15:59:59.999 on day D
  const morningStart = new Date(y, m, d, 8, 0, 0, 0);
  const morningEnd = new Date(y, m, d, 15, 59, 59, 999);

  // Shift 2 (Evening/Night): 16:00:00.000 on day D to 02:59:59.999 on day D+1
  const eveningStart = new Date(y, m, d, 16, 0, 0, 0);
  const eveningEnd = new Date(y, m, d + 1, 2, 59, 59, 999);

  const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return { startOfDay, endOfDay, morningStart, morningEnd, eveningStart, eveningEnd, dateStr };
}

class ReportService {
  async daily(date) {
    const { startOfDay, endOfDay, morningStart, morningEnd, eveningStart, eveningEnd, dateStr } = getDayBounds(date);

    const [aggregate] = await orderRepo.sumByDateRange(startOfDay, endOfDay);
    const topProducts = await _topProducts(startOfDay, endOfDay);

    const validOrderWhere = (start, end) => ({
      createdAt: { gte: start, lte: end },
      OR: [
        { status: "DELIVERED" },
        { orderType: "DINE_IN", status: { not: "CANCELLED" } },
      ],
    });

    // Morning shift aggregation
    const morningAgg = await orderRepo.prisma.order.aggregate({
      where: validOrderWhere(morningStart, morningEnd),
      _sum: { total: true },
      _count: { id: true },
    });

    // Evening shift aggregation
    const eveningAgg = await orderRepo.prisma.order.aggregate({
      where: validOrderWhere(eveningStart, eveningEnd),
      _sum: { total: true },
      _count: { id: true },
    });

    // Payment breakdown
    const paymentBreakdown = await orderRepo.prisma.order.groupBy({
      by: ["paymentMethod"],
      where: validOrderWhere(startOfDay, endOfDay),
      _sum: { total: true },
      _count: { id: true },
    });

    // Order type breakdown
    const typeBreakdown = await orderRepo.prisma.order.groupBy({
      by: ["orderType"],
      where: validOrderWhere(startOfDay, endOfDay),
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      date: dateStr,
      orderCount: Number(aggregate?._count?.id || 0),
      salesTotal: parseFloat(aggregate?._sum?.total || 0),
      totalTax: parseFloat(aggregate?._sum?.tax || 0),
      totalDiscount: parseFloat(aggregate?._sum?.discount || 0),
      shiftBreakdown: {
        morning: {
          label: "Morning Shift (8:00 AM - 4:00 PM)",
          orderCount: Number(morningAgg?._count?.id || 0),
          total: parseFloat(morningAgg?._sum?.total || 0),
        },
        evening: {
          label: "Evening Shift (4:00 PM - 3:00 AM)",
          orderCount: Number(eveningAgg?._count?.id || 0),
          total: parseFloat(eveningAgg?._sum?.total || 0),
        },
      },
      topProducts: _serializeRows(topProducts),
      paymentBreakdown: paymentBreakdown.map((p) => ({
        method: p.paymentMethod,
        orderCount: Number(p._count.id),
        total: parseFloat(p._sum.total || 0),
      })),
      typeBreakdown: typeBreakdown.map((t) => ({
        type: t.orderType,
        orderCount: Number(t._count.id),
        total: parseFloat(t._sum.total || 0),
      })),
    };
  }

  async custom(from, to) {
    if (!from || !to) throw new Error("from and to dates are required");

    const { startOfDay: start, dateStr: fromStr } = getDayBounds(from);
    const { endOfDay: end, dateStr: toStr } = getDayBounds(to);

    const breakdown = await orderRepo.dailyBreakdown(start, end);
    const [aggregate] = await orderRepo.sumByDateRange(start, end);
    const topProducts = await _topProducts(start, end);

    const validOrderWhere = (s, e) => ({
      createdAt: { gte: s, lte: e },
      OR: [
        { status: "DELIVERED" },
        { orderType: "DINE_IN", status: { not: "CANCELLED" } },
      ],
    });

    // Payment method breakdown
    const paymentBreakdown = await orderRepo.prisma.order.groupBy({
      by: ["paymentMethod"],
      where: validOrderWhere(start, end),
      _sum: { total: true },
      _count: { id: true },
    });

    // Order type breakdown
    const typeBreakdown = await orderRepo.prisma.order.groupBy({
      by: ["orderType"],
      where: validOrderWhere(start, end),
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      from: fromStr,
      to: toStr,
      orderCount: Number(aggregate?._count?.id || 0),
      salesTotal: parseFloat(aggregate?._sum?.total || 0),
      totalTax: parseFloat(aggregate?._sum?.tax || 0),
      totalDiscount: parseFloat(aggregate?._sum?.discount || 0),
      dailyBreakdown: _serializeRows(breakdown).map((row) => ({
        date: row.date,
        orderCount: Number(row.orderCount),
        salesTotal: parseFloat(row.salesTotal),
      })),
      topProducts: _serializeRows(topProducts),
      paymentBreakdown: paymentBreakdown.map((p) => ({
        method: p.paymentMethod,
        orderCount: Number(p._count.id),
        total: parseFloat(p._sum.total || 0),
      })),
      typeBreakdown: typeBreakdown.map((t) => ({
        type: t.orderType,
        orderCount: Number(t._count.id),
        total: parseFloat(t._sum.total || 0),
      })),
    };
  }

  async weekly(startDate) {
    const { startOfDay: start } = getDayBounds(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(2, 59, 59, 999);

    const breakdown = await orderRepo.dailyBreakdown(start, end);
    const [aggregate] = await orderRepo.sumByDateRange(start, end);

    const fromStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const toStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    return {
      from: fromStr,
      to: toStr,
      orderCount: Number(aggregate?._count?.id || 0),
      salesTotal: parseFloat(aggregate?._sum?.total || 0),
      totalTax: parseFloat(aggregate?._sum?.tax || 0),
      totalDiscount: parseFloat(aggregate?._sum?.discount || 0),
      dailyBreakdown: _serializeRows(breakdown).map((row) => ({
        date: row.date,
        orderCount: Number(row.orderCount),
        salesTotal: parseFloat(row.salesTotal),
        totalDiscount: parseFloat(row.totalDiscount),
        totalTax: parseFloat(row.totalTax),
      })),
    };
  }

  async monthly(year, month) {
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;

    const start = new Date(y, m - 1, 1, 3, 0, 0, 0);
    const end = new Date(y, m, 1, 2, 59, 59, 999);

    const breakdown = await orderRepo.dailyBreakdown(start, end);
    const [aggregate] = await orderRepo.sumByDateRange(start, end);
    const topProducts = await _topProducts(start, end);

    return {
      year: Number(y),
      month: Number(m),
      orderCount: Number(aggregate?._count?.id || 0),
      salesTotal: parseFloat(aggregate?._sum?.total || 0),
      totalTax: parseFloat(aggregate?._sum?.tax || 0),
      totalDiscount: parseFloat(aggregate?._sum?.discount || 0),
      dailyBreakdown: _serializeRows(breakdown).map((row) => ({
        date: row.date,
        orderCount: Number(row.orderCount),
        salesTotal: parseFloat(row.salesTotal),
      })),
      topProducts: _serializeRows(topProducts),
    };
  }
}

// ── Private helpers ──────────────────────────────────────────

function _serializeRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        typeof v === "bigint" ? Number(v) : v,
      ]),
    ),
  );
}

async function _topProducts(start, end, cashierId = null) {
  if (cashierId) {
    return prisma.$queryRaw`
      SELECT p.id, p.name,
        SUM(oi.quantity)                  AS "totalQuantity",
        SUM(oi.quantity * oi."unitPrice") AS "totalRevenue"
      FROM order_items oi
      JOIN orders o   ON o.id = oi."orderId"
      JOIN products p ON p.id = oi."productId"
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
        AND (o.status = 'DELIVERED' OR (o."orderType" = 'DINE_IN' AND o.status != 'CANCELLED'))
        AND o."cashierId" =  ${cashierId}
      GROUP BY p.id, p.name
      ORDER BY "totalQuantity" DESC
      LIMIT 5
    `;
  }

  return prisma.$queryRaw`
    SELECT p.id, p.name,
      SUM(oi.quantity)                  AS "totalQuantity",
      SUM(oi.quantity * oi."unitPrice") AS "totalRevenue"
    FROM order_items oi
    JOIN orders o   ON o.id = oi."orderId"
    JOIN products p ON p.id = oi."productId"
    WHERE o."createdAt" >= ${start}
      AND o."createdAt" <= ${end}
      AND (o.status = 'DELIVERED' OR (o."orderType" = 'DINE_IN' AND o.status != 'CANCELLED'))
    GROUP BY p.id, p.name
    ORDER BY "totalQuantity" DESC
    LIMIT 5
  `;
}

module.exports = new ReportService();
