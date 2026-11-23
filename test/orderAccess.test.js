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

const { orderConfirmationEmailHtml, orderStatusEmailHtml } = require("../src/services/emailService");

const sampleOrder = {
  orderNumber: "YC-20261124-0001",
  customerName: "Amina <b>Wanjiru</b>",
  email: "amina@example.com",
  phone: "0712345678",
  address: "Moi Avenue",
  city: "Nairobi",
  county: "Nairobi",
  paymentMethod: "mpesa",
  paymentStatus: "pending",
  subtotal: 43500,
  shipping: 500,
  discount: 0,
  total: 44000,
  createdAt: "2026-11-24T08:00:00Z",
  items: [
    { title: "HP EliteBook 830 G5", quantity: 1, price: 42000, image: "https://res.cloudinary.com/x/a.jpg" },
    { title: "Sleeve", quantity: 1, price: 1500, image: "" },
  ],
};

test("the confirmation email shows images, totals, delivery and a tracking link", () => {
  const html = orderConfirmationEmailHtml(sampleOrder);
  assert.match(html, /<img src="https:\/\/res\.cloudinary\.com\/x\/a\.jpg"/);
  assert.match(html, /KES 44,000/);
  assert.match(html, /KES 500/); // delivery
  assert.match(html, /Moi Avenue/);
  assert.match(html, /M-Pesa/);
  assert.match(html, /\/track\?orderNumber=YC-20261124-0001&amp;token=/);
  assert.match(html, /WhatsApp/); // manual payment note
  // content from the customer is escaped
  assert.ok(!html.includes("<b>Wanjiru</b>"));
});

test("a status email names the new status and shows the tracking number", () => {
  const html = orderStatusEmailHtml({ ...sampleOrder, trackingNumber: "TRK-77" }, "shipped");
  assert.match(html, /on its way/i);
  assert.match(html, /TRK-77/);
});
