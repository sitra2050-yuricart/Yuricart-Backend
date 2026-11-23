const { Router } = require("express");
const {
  createPublicOrder,
  getMyOrders,
  lookupOrders,
  trackPublicOrder,
} = require("../../controllers/orderController");
const {
  authenticate,
  optionalAuthenticate,
  requireCustomer,
} = require("../../middleware/auth");
const { validateBody, validateParams, validateQuery } = require("../../middleware/validate");
const { authLimiter } = require("../../middleware/rateLimit");
const { paginationQuerySchema } = require("../../validators/common");
const {
  createOrderSchema,
  orderLookupSchema,
  orderNumberParamSchema,
  trackOrderQuerySchema,
} = require("../../validators/orderValidator");

const router = Router();

router.post("/", optionalAuthenticate, validateBody(createOrderSchema), createPublicOrder);
router.post("/lookup", authLimiter, validateBody(orderLookupSchema), lookupOrders);
router.get(
  "/track/:orderNumber",
  authLimiter,
  validateParams(orderNumberParamSchema),
  validateQuery(trackOrderQuerySchema),
  trackPublicOrder,
);
router.get(
  "/my",
  authenticate,
  requireCustomer,
  validateQuery(paginationQuerySchema),
  getMyOrders,
);

module.exports = router;
