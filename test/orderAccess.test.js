const test = require("node:test");
const assert = require("node:assert/strict");

process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.JWT_SECRET = "test-secret-test-secret-123456";
process.env.CLOUDINARY_CLOUD_NAME = "x";
process.env.CLOUDINARY_API_KEY = "x";
process.env.CLOUDINARY_API_SECRET = "x";
process.env.FRONTEND_URL = "https://www.yuricart.com";

const { signOrderToken, verifyOrderToken } = require("../src/utils/orderAccess");
const { signCustomerToken } = require("../src/utils/jwt");
const { createResetToken } = require("../src/utils/resetToken");
const { trackOrderQuerySchema, orderLookupSchema } = require("../src/validators/orderValidator");
const { orderListEmailHtml, orderTrackUrl } = require("../src/services/emailService");

test("an order link token only opens the order it was issued for", () => {
  const token = signOrderToken("YC-1");
  assert.equal(verifyOrderToken(token), "YC-1");
});

test("a login token cannot be used as an order link", () => {
  const login = signCustomerToken({ sub: "u1", email: "a@b.co", role: "customer" });
  assert.throws(() => verifyOrderToken(login));
  assert.throws(() => verifyOrderToken("not-a-token"));
});

test("tracking needs an email or a token", () => {
  assert.equal(trackOrderQuerySchema.safeParse({}).success, false);
  assert.equal(trackOrderQuerySchema.safeParse({ email: "a@b.co" }).success, true);
  assert.equal(trackOrderQuerySchema.safeParse({ token: "x".repeat(40) }).success, true);
  assert.equal(orderLookupSchema.safeParse({ email: "nope" }).success, false);
});

test("the tracking link carries the order number and a token", () => {
  const url = orderTrackUrl("YC-9");
  assert.match(url, /\/track\?orderNumber=YC-9&token=/);
});

test("the order list email links every order and escapes content", () => {
  const html = orderListEmailHtml([
    { orderNumber: "YC-1", total: 1000, orderStatus: "pending" },
    { orderNumber: "YC-<2>", total: 2000, orderStatus: "shipped" },
  ]);
  assert.match(html, /#YC-1/);
  assert.ok(!html.includes("YC-<2>"));
  assert.equal((html.match(/>Track</g) || []).length, 2);
});

test("verification tokens can have their own lifetime", () => {
  const now = 1_000_000;
  const { expiresAt } = createResetToken(now, 24 * 60 * 60 * 1000);
  assert.equal(expiresAt.getTime(), now + 24 * 60 * 60 * 1000);
  assert.equal(createResetToken(now).expiresAt.getTime(), now + 60 * 60 * 1000);
});
