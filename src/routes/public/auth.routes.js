const { Router } = require("express");
const {
  customerLogin,
  customerLogout,
  customerRegister,
  forgotPassword,
  getCustomerMe,
  resendVerification,
  resetPassword,
  verifyEmail,
} = require("../../controllers/authController");
const { authLimiter } = require("../../middleware/rateLimit");
const { authenticate, requireCustomer } = require("../../middleware/auth");
const { validateBody } = require("../../middleware/validate");
const {
  customerLoginSchema,
  customerRegisterSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} = require("../../validators/authValidator");

const router = Router();

router.post("/register", authLimiter, validateBody(customerRegisterSchema), customerRegister);
router.post("/login", authLimiter, validateBody(customerLoginSchema), customerLogin);
router.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), resetPassword);
router.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), verifyEmail);
router.post("/resend-verification", authLimiter, authenticate, requireCustomer, resendVerification);
router.post("/logout", customerLogout);
router.get("/me", authenticate, requireCustomer, getCustomerMe);

module.exports = router;
