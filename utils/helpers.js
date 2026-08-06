/**
 * Generate a unique order number
 * Format: JC-YYYYMMDD-XXXX  e.g. JC-20240615-0042
 */
const generateOrderNumber = async (prisma) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;

  // عد كل الأوردرات اللي orderNumber بيبدأ بـ JC-YYYYMMDD
  const count = await prisma.order.count({
    where: {
      orderNumber: { startsWith: `JC-${datePart}` },
    },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `JC-${datePart}-${sequence}`;
};

/**
 * Calculate order totals
 * discountPercent: 0–100 (percentage, not a fixed amount)
 * Each item must have: { unitPrice, quantity }  ← unitPrice already includes flavor extras
 */
const calculateOrderTotals = (items, discountPercent = 0, taxRate = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + parseFloat(item.unitPrice) * item.quantity;
  }, 0);

  const pct = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  const discount = parseFloat(((subtotal * pct) / 100).toFixed(2));
  const taxable = subtotal - discount;
  const tax = parseFloat(((taxable * taxRate) / 100).toFixed(2));
  const total = parseFloat((taxable + tax).toFixed(2));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    tax,
    total,
  };
};

/**
 * Strip undefined keys from an object (useful for partial updates)
 */
const stripUndefined = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
};

/**
 * Convert string to boolean safely
 */
const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

/**
 * Parse pagination query params with safe defaults
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page || 1, 10));
  const limit = Math.min(100, parseInt(query.limit || 10, 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = {
  generateOrderNumber,
  calculateOrderTotals,
  stripUndefined,
  toBoolean,
  parsePagination,
};
