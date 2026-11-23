const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

/**
 * Tight per-IP limit for sign-in, sign-up and password reset.
 * Note: the store is in memory, so on serverless each instance counts on its
 * own. It still blunts simple brute force; a shared store is a later upgrade.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please wait a few minutes and try again.",
  },
});

module.exports = { authLimiter };
