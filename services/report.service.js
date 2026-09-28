const orderRepo = require("../repositories/order.repository");
const prisma = require("../config/prisma");

function getDayBounds(dateInput) {
  let y, m, d;
  if (!dateInput) {
    const now = new Date();
    const cairoNow = new Date(now.getTime() + 3 * 3600 * 1000);
    if (cairoNow.getUTCHours() < 3) {
      cairoNow.setUTCDate(cairoNow.getUTCDate() - 1);
    }
    y = cairoNow.getUTCFullYear();
    m = cairoNow.getUTCMonth();
    d = cairoNow.getUTCDate();
  } else if (typeof dateInput === "string") {
    const parts = dateInput.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      y = parts[0];
      m = parts[1] - 1;
      d = parts[2];
    } else {
      const dt = new Date(dateInput);
      y = dt.getUTCFullYear();
      m = dt.getUTCMonth();
      d = dt.getUTCDate();
    }
  } else if (dateInput instanceof Date) {
    const cairoDt = new Date(dateInput.getTime() + 3 * 3600 * 1000);
    if (cairoDt.getUTCHours() < 3) {
      cairoDt.setUTCDate(cairoDt.getUTCDate() - 1);
    }
    y = cairoDt.getUTCFullYear();
    m = cairoDt.getUTCMonth();
    d = cairoDt.getUTCDate();
  } else {
    const now = new Date();
    const cairoNow = new Date(now.getTime() + 3 * 3600 * 1000);
    if (cairoNow.getUTCHours() < 3) {
      cairoNow.setUTCDate(cairoNow.getUTCDate() - 1);
    }
    y = cairoNow.getUTCFullYear();
    m = cairoNow.getUTCMonth();
    d = cairoNow.getUTCDate();
  }

  // Cairo business day: 03:00:00 Cairo = 00:00:00 UTC, 02:59:59 Cairo next day = 23:59:59 UTC
  const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

  // Shift 1 (Morning): 8:00 AM - 4:00 PM Cairo => 05:00:00 Z to 12:59:59 Z
  const morningStart = new Date(Date.UTC(y, m, d, 5, 0, 0, 0));
  const morningEnd = new Date(Date.UTC(y, m, d, 12, 59, 59, 999));

  // Shift 2 (Evening): 4:00 PM - 3:00 AM Cairo next day => 13:00:00 Z to 23:59:59 Z
  const eveningStart = new Date(Date.UTC(y, m, d, 13, 0, 0, 0));
  const eveningEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

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
