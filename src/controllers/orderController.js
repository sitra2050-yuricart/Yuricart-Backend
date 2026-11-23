const {
  createOrder,
  findOrdersByEmail,
  getAdminOrderById,
  getUserOrders,
  listAdminOrders,
  trackOrder,
  updateOrderStatus,
} = require("../services/orderService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { sendOrderListEmail } = require("../services/emailService");
const { User } = require("../models/User");

const createPublicOrder = asyncHandler(async (req, res) => {
  const customerId =
    req.user?.role === "customer" ? req.user.sub : undefined;
  const customerEmail =
    req.user?.role === "customer" ? req.user.email : undefined;

  const order = await createOrder(req.body, customerId, customerEmail);
  sendSuccess(res, order, 201);
});

const trackPublicOrder = asyncHandler(async (req, res) => {
  const order = await trackOrder(req.params.orderNumber, {
    email: req.query.email,
    token: req.query.token,
  });
  sendSuccess(res, order);
});

const GENERIC_LOOKUP_MESSAGE =
  "If we have orders for that email, we have sent the order numbers to it.";

const lookupOrders = asyncHandler(async (req, res) => {
  const orders = await findOrdersByEmail(req.body.email);
  // Same answer whether or not orders exist, so addresses cannot be probed.
  // Awaited: serverless can stop the process once the response is sent.
  if (orders.length) {
    await sendOrderListEmail({ to: req.body.email.toLowerCase(), orders });
  }
  sendSuccess(res, { message: GENERIC_LOOKUP_MESSAGE });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select("email emailVerified");
  const result = await getUserOrders(
    req.user.sub,
    user?.email || req.user.email,
    req.query,
    Boolean(user?.emailVerified),
  );
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminOrders = asyncHandler(async (req, res) => {
  const result = await listAdminOrders(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminOrder = asyncHandler(async (req, res) => {
  const order = await getAdminOrderById(req.params.id);
  sendSuccess(res, order);
});

const patchAdminOrder = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(
    req.params.id,
    req.body,
  );
  sendSuccess(res, order);
});

module.exports = {
  createPublicOrder,
  trackPublicOrder,
  lookupOrders,
  getMyOrders,
  getAdminOrders,
  getAdminOrder,
  patchAdminOrder,
};
