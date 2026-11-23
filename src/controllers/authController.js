const { env } = require("../config/env");
const { User } = require("../models/User");
const { BadRequestError, UnauthorizedError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { signAdminToken, signCustomerToken } = require("../utils/jwt");
const { sendSuccess } = require("../utils/response");
const { sendPasswordResetEmail, sendVerificationEmail } = require("../services/emailService");
const { createResetToken, hashResetToken } = require("../utils/resetToken");

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Stores a fresh verification token on the user and emails the link. */
async function issueVerificationEmail(user) {
  const { token, tokenHash, expiresAt } = createResetToken(
    Date.now(),
    EMAIL_VERIFICATION_TTL_MS,
  );
  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = expiresAt;
  await user.save();
  // Awaited: serverless can stop the process once the response is sent.
  await sendVerificationEmail({ to: user.email, name: user.name, token });
}

const customerCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const adminCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 8 * 60 * 60 * 1000,
};

/** clearCookie only works when path/sameSite/secure match how the cookie was set. */
function clearCookieOptions({ maxAge, ...options }) {
  return options;
}

const GENERIC_RESET_MESSAGE =
  "If an account exists for that email, we have sent a link to reset the password.";

const healthCheck = asyncHandler(async (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    service: "yuricart-api",
    timestamp: new Date().toISOString(),
  });
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);

  if (!user || user.role !== "admin" || user.status !== "active") {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signAdminToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.cookie("admin_token", token, adminCookieOptions);

  sendSuccess(res, {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

const adminLogout = asyncHandler(async (_req, res) => {
  res.clearCookie("admin_token", clearCookieOptions(adminCookieOptions));
  sendSuccess(res, { message: "Logged out successfully" });
});

const getAdminMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select("-password");

  if (!user || user.role !== "admin") {
    throw new UnauthorizedError("Admin not found");
  }

  sendSuccess(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });
});

const customerRegister = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new BadRequestError("Email already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "customer",
    status: "active",
  });

  await issueVerificationEmail(user);

  const token = signCustomerToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.cookie("customer_token", token, customerCookieOptions);

  sendSuccess(
    res,
    {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        emailVerified: false,
      },
    },
    201,
  );
});

const customerLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);

  if (!user || user.role !== "customer") {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.status === "blocked") {
    throw new UnauthorizedError("Account is blocked. Contact support.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signCustomerToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.cookie("customer_token", token, customerCookieOptions);

  sendSuccess(res, {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      emailVerified: Boolean(user.emailVerified),
    },
  });
});

const customerLogout = asyncHandler(async (_req, res) => {
  res.clearCookie("customer_token", clearCookieOptions(customerCookieOptions));
  sendSuccess(res, { message: "Logged out successfully" });
});

const getCustomerMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select("-password");

  if (!user || user.role !== "customer") {
    throw new UnauthorizedError("Customer not found");
  }

  sendSuccess(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    status: user.status,
    emailVerified: Boolean(user.emailVerified),
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    emailVerificationTokenHash: hashResetToken(req.body.token),
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpires");

  if (!user || user.role !== "customer") {
    throw new BadRequestError(
      "This confirmation link is invalid or has expired. Request a new one.",
    );
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  sendSuccess(res, { message: "Your email is confirmed." });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user || user.role !== "customer") {
    throw new UnauthorizedError("Customer not found");
  }
  if (!user.emailVerified) await issueVerificationEmail(user);
  sendSuccess(res, { message: "We have sent a confirmation link to your email." });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });

  // Same answer whether or not the account exists, so emails cannot be probed.
  if (user && user.role === "customer" && user.status === "active") {
    const { token, tokenHash, expiresAt } = createResetToken();
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpires = expiresAt;
    await user.save();

    const baseUrl = (env.SITE_URL || env.FRONTEND_URL[0]).replace(/\/+$/, "");
    // Awaited: serverless can stop the process once the response is sent.
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: `${baseUrl}/reset-password?token=${token}`,
    });
  }

  sendSuccess(res, { message: GENERIC_RESET_MESSAGE });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");

  if (!user || user.role !== "customer") {
    throw new BadRequestError(
      "This reset link is invalid or has expired. Request a new one.",
    );
  }

  user.password = password; // hashed by the pre-save hook
  user.emailVerified = true; // they just proved they own this mailbox
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendSuccess(res, {
    message: "Your password has been changed. You can now log in.",
  });
});

module.exports = {
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  healthCheck,
  adminLogin,
  adminLogout,
  getAdminMe,
  customerRegister,
  customerLogin,
  customerLogout,
  getCustomerMe,
};
