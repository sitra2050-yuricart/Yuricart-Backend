const { Router } = require("express");
const {
  customerLogin,
  customerLogout,
  customerRegister,
  forgotPassword,
  getCustomerMe,
  resetPassword,
} = require("../../controllers/authController");
const { authLimiter } = require("../../middleware/rateLimit");
const { authenticate, requireCustomer } = require("../../middleware/auth");
const { validateBody } = require("../../middleware/validate");
const {
  customerLoginSchema,
  customerRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../../validators/authValidator");

const router = Router();

router.post("/register", authLimiter, validateBody(customerRegisterSchema), customerRegister);
router.post("/login", authLimiter, validateBody(customerLoginSchema), customerLogin);
router.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), resetPassword);
router.post("/logout", customerLogout);
router.get("/me", authenticate, requireCustomer, getCustomerMe);

module.exports = router;
