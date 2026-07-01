// ============================================================
// App-wide constants — single source of truth
// ============================================================

const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  CASHIER: "CASHIER",
});

const ORDER_STATUS = Object.freeze({
  PENDING: "PENDING",
  PREPARING: "PREPARING",
  READY: "READY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
});

const PAYMENT_METHOD = Object.freeze({
  CASH: "CASH",
  INSTAPAY: "INSTAPAY",
  VODAFONE_CASH: "VODAFONE_CASH",
});

const STORAGE_BUCKETS = Object.freeze({
  PRODUCTS: process.env.SUPABASE_BUCKET_PRODUCTS || "product-images",
  CATEGORIES: process.env.SUPABASE_BUCKET_CATEGORIES || "category-images",
});

// Valid order status transitions — enforces flow
const ORDER_STATUS_TRANSITIONS = Object.freeze({
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
});

const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
});

const AUDIT_ACTIONS = Object.freeze({
  // Auth
  LOGIN: "AUTH_LOGIN",
  LOGOUT: "AUTH_LOGOUT",
  // Users
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  // Products
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_DELETED: "PRODUCT_DELETED",
  // Categories
  CATEGORY_CREATED: "CATEGORY_CREATED",
  CATEGORY_UPDATED: "CATEGORY_UPDATED",
  CATEGORY_DELETED: "CATEGORY_DELETED",
  // Flavors
  FLAVOR_CREATED: "FLAVOR_CREATED",
  FLAVOR_UPDATED: "FLAVOR_UPDATED",
  FLAVOR_DELETED: "FLAVOR_DELETED",
  // Orders
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  // Inventory
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
});

const SOCKET_EVENTS = Object.freeze({
  ORDER_CREATED: "order_created",
  ORDER_UPDATED: "order_updated",
  ORDER_CANCELLED: "order_cancelled",
  SHIFT_OPENED: "shift_opened",
  SHIFT_CLOSED: "shift_closed",
});

module.exports = {
  ROLES,
  ORDER_STATUS,
  PAYMENT_METHOD,
  STORAGE_BUCKETS,
  ORDER_STATUS_TRANSITIONS,
  HTTP_STATUS,
  AUDIT_ACTIONS,
  SOCKET_EVENTS,
};
