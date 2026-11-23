const crypto = require("crypto");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Hash used to store and look up a reset token. The raw token is never saved. */
function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/** Creates a single-use token: send `token` by email, store `tokenHash`. */
function createResetToken(now = Date.now()) {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now + RESET_TOKEN_TTL_MS),
  };
}

module.exports = { RESET_TOKEN_TTL_MS, createResetToken, hashResetToken };
