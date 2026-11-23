// Run with: npm test   (Node's built-in test runner, no database needed)
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.JWT_SECRET = "test-secret-test-secret-123456";
process.env.CLOUDINARY_CLOUD_NAME = "x";
process.env.CLOUDINARY_API_KEY = "x";
process.env.CLOUDINARY_API_SECRET = "x";
process.env.FRONTEND_URL = "https://www.yuricart.com";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createResetToken, hashResetToken, RESET_TOKEN_TTL_MS } = require("../src/utils/resetToken");
const { escapeHtml } = require("../src/utils/escapeHtml");
const { passwordResetEmailHtml } = require("../src/services/emailService");

test("reset token is 64 hex chars, stored only as a hash, valid for one hour", () => {
  const now = 1_700_000_000_000;
  const { token, tokenHash, expiresAt } = createResetToken(now);
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(tokenHash, hashResetToken(token));
  assert.notEqual(tokenHash, token);
  assert.equal(expiresAt.getTime(), now + RESET_TOKEN_TTL_MS);
  assert.notEqual(createResetToken().token, createResetToken().token);
});

test("escapeHtml neutralises markup and quotes", () => {
  assert.equal(escapeHtml('<script>"x"&\'y\'</script>'), "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;");
  assert.equal(escapeHtml(undefined), "");
});

test("reset email escapes the customer name and the link", () => {
  const html = passwordResetEmailHtml({
    name: '<img src=x onerror="alert(1)">',
    resetUrl: 'https://www.yuricart.com/reset-password?token=abc"><script>1</script>',
  });
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes("<script>1"));
  assert.ok(html.includes("&lt;img"));
});

// --- controller flow with a stubbed model and mailer
const emailPath = require.resolve("../src/services/emailService");
const sent = [];
const realEmail = require(emailPath);
require.cache[emailPath].exports = {
  ...realEmail,
  sendPasswordResetEmail: async (args) => {
    sent.push(args);
  },
};

const { User } = require("../src/models/User");
const { forgotPassword, resetPassword } = require("../src/controllers/authController");

function run(handler, body) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, payload });
      },
    };
    handler({ body }, res, (error) => resolve({ error }));
  });
}

function fakeUser(over = {}) {
  return {
    name: "Amina",
    email: "amina@example.com",
    role: "customer",
    status: "active",
    saved: 0,
    async save() {
      this.saved += 1;
    },
    ...over,
  };
}

test("forgot password sends a link for a real customer and stores only the hash", async () => {
  sent.length = 0;
  const user = fakeUser();
  User.findOne = async () => user;

  const { status, payload } = await run(forgotPassword, { email: "Amina@Example.com" });

  assert.equal(status, 200);
  assert.equal(payload.success, true);
  assert.equal(sent.length, 1);
  const token = new URL(sent[0].resetUrl).searchParams.get("token");
  assert.equal(new URL(sent[0].resetUrl).origin, "https://www.yuricart.com");
  assert.equal(user.passwordResetTokenHash, hashResetToken(token));
  assert.ok(user.passwordResetExpires > new Date());
  assert.equal(user.saved, 1);
});

test("forgot password gives the same answer for unknown, blocked and admin accounts", async () => {
  for (const found of [null, fakeUser({ status: "blocked" }), fakeUser({ role: "admin" })]) {
    sent.length = 0;
    User.findOne = async () => found;
    const { status, payload } = await run(forgotPassword, { email: "x@example.com" });
    assert.equal(status, 200);
    assert.equal(payload.success, true);
    assert.equal(sent.length, 0);
  }
});

test("reset password changes the password and burns the token", async () => {
  const token = createResetToken();
  const user = fakeUser({
    passwordResetTokenHash: token.tokenHash,
    passwordResetExpires: token.expiresAt,
  });
  let query;
  User.findOne = (q) => {
    query = q;
    return { select: async () => user };
  };

  const { status } = await run(resetPassword, { token: token.token, password: "new-password-1" });

  assert.equal(status, 200);
  assert.equal(query.passwordResetTokenHash, token.tokenHash);
  assert.ok(query.passwordResetExpires.$gt instanceof Date);
  assert.equal(user.password, "new-password-1");
  assert.equal(user.passwordResetTokenHash, undefined);
  assert.equal(user.passwordResetExpires, undefined);
  assert.equal(user.saved, 1);
});

test("reset password rejects an invalid or expired token", async () => {
  User.findOne = () => ({ select: async () => null });
  const { error } = await run(resetPassword, { token: "a".repeat(64), password: "new-password-1" });
  assert.equal(error.statusCode, 400);
  assert.match(error.message, /invalid or has expired/);
});
