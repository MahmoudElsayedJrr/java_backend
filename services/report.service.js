const orderRepo = require('../repositories/order.repository');
const prisma    = require('../config/prisma');

class ReportService {
  async daily(date) {
    const target     = date ? new Date(date) : new Date();
    const startOfDay = new Date(target.setHours(0, 0, 0, 0));
    const endOfDay   = new Date(target.setHours(23, 59, 59, 999));

    const [aggregate] = await orderRepo.sumByDateRange(startOfDay, endOfDay);
    const topProducts  = await _topProducts(startOfDay, endOfDay);

    return {
      date:          startOfDay.toISOString().slice(0, 10),
      orderCount:    Number(aggregate?._count?.id      || 0),
      salesTotal:    parseFloat(aggregate?._sum?.total    || 0),
      totalTax:      parseFloat(aggregate?._sum?.tax      || 0),
      totalDiscount: parseFloat(aggregate?._sum?.discount || 0),
      topProducts:   _serializeRows(topProducts),
    };
  }

  async weekly(startDate) {
    const start = startDate ? new Date(startDate) : _daysAgo(6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const breakdown   = await orderRepo.dailyBreakdown(start, end);
    const [aggregate] = await orderRepo.sumByDateRange(start, end);

    return {
      from:          start.toISOString().slice(0, 10),
      to:            end.toISOString().slice(0, 10),
      orderCount:    Number(aggregate?._count?.id      || 0),
      salesTotal:    parseFloat(aggregate?._sum?.total    || 0),
      totalTax:      parseFloat(aggregate?._sum?.tax      || 0),
      totalDiscount: parseFloat(aggregate?._sum?.discount || 0),
      dailyBreakdown: _serializeRows(breakdown).map((row) => ({
        date:          row.date,
        orderCount:    Number(row.orderCount),
        salesTotal:    parseFloat(row.salesTotal),
        totalDiscount: parseFloat(row.totalDiscount),
        totalTax:      parseFloat(row.totalTax),
      })),
    };
  }

  async monthly(year, month) {
    const y = year  || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;

    const start = new Date(y, m - 1, 1, 0, 0, 0);
    const end   = new Date(y, m,     0, 23, 59, 59);

    const breakdown   = await orderRepo.dailyBreakdown(start, end);
    const [aggregate] = await orderRepo.sumByDateRange(start, end);
    const topProducts  = await _topProducts(start, end);

    return {
      year:          Number(y),
      month:         Number(m),
      orderCount:    Number(aggregate?._count?.id      || 0),
      salesTotal:    parseFloat(aggregate?._sum?.total    || 0),
      totalTax:      parseFloat(aggregate?._sum?.tax      || 0),
      totalDiscount: parseFloat(aggregate?._sum?.discount || 0),
      dailyBreakdown: _serializeRows(breakdown).map((row) => ({
        date:       row.date,
        orderCount: Number(row.orderCount),
        salesTotal: parseFloat(row.salesTotal),
      })),
      topProducts: _serializeRows(topProducts),
    };
  }
}

// ── Private helpers ──────────────────────────────────────────

// Convert all BigInt values in raw query results to Number
function _serializeRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k,
        typeof v === 'bigint' ? Number(v) : v,
      ])
    )
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
        AND o.status      =  'DELIVERED'
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
      AND o.status      =  'DELIVERED'
    GROUP BY p.id, p.name
    ORDER BY "totalQuantity" DESC
    LIMIT 5
  `;
}

const _daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

module.exports = new ReportService();