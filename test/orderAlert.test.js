process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.JWT_SECRET = "test-secret-test-secret-123456";
process.env.CLOUDINARY_CLOUD_NAME = "x";
process.env.CLOUDINARY_API_KEY = "x";
process.env.CLOUDINARY_API_SECRET = "x";
process.env.FRONTEND_URL = "https://www.yuricart.com";
process.env.ORDER_NOTIFY_EMAILS = "Owner@Gmail.com, second@example.com";

const test = require("node:test");
const assert = require("node:assert/strict");

const { env } = require("../src/config/env");
const resendModule = require("resend");

// Record what would be sent to Resend instead of calling the network.
const sentMails = [];
let failFor = null;
resendModule.Resend = function Resend() {
  this.emails = {
    send: async (mail) => {
      if (failFor && mail.to[0] === failFor) {
        return { data: null, error: { message: "resend rejected" } };
      }
      sentMails.push(mail);
      return { data: { id: "x" }, error: null };
    },
  };
};

const {
  adminNewOrderEmailHtml,
  getOrderNotifyRecipients,
  sendAdminNewOrderEmail,
  passwordResetEmailHtml,
} = require("../src/services/emailService");

const order = {
  orderNumber: "YC-20261123-0001",
  customerName: 'Amina <img src=x onerror="alert(1)">',
  phone: "0712345678",
  email: "amina@example.com",
  address: "Moi Avenue, Bazaar Plaza",
  city: "Nairobi",
  county: "Nairobi",
  paymentMethod: "mpesa",
  notes: "<script>steal()</script>",
  items: [{ title: "HP EliteBook <b>830</b>", quantity: 2, price: 30000 }],
  subtotal: 60000,
  shipping: 500,
  discount: 1000,
  total: 59500,
};

test("recipients come from ORDER_NOTIFY_EMAILS, lowercased", () => {
  assert.deepEqual(getOrderNotifyRecipients(), ["owner@gmail.com", "second@example.com"]);
});

test("recipients fall back to ADMIN_EMAIL, then to nobody", () => {
  const saved = { notify: env.ORDER_NOTIFY_EMAILS, admin: env.ADMIN_EMAIL };
  try {
    env.ORDER_NOTIFY_EMAILS = [];
    env.ADMIN_EMAIL = "Admin@Yuricart.com";
    assert.deepEqual(getOrderNotifyRecipients(), ["admin@yuricart.com"]);
    env.ADMIN_EMAIL = undefined;
    assert.deepEqual(getOrderNotifyRecipients(), []);
  } finally {
    env.ORDER_NOTIFY_EMAILS = saved.notify;
    env.ADMIN_EMAIL = saved.admin;
  }
});

test("the owner email has the order details, link and totals, and escapes customer text", () => {
  const html = adminNewOrderEmailHtml(order, "https://www.yuricart.com/admin/orders");
  assert.match(html, /New order #YC-20261123-0001/);
  assert.match(html, /0712345678/);
  assert.match(html, /M-Pesa/);
  assert.match(html, /Total: KES 59,500/);
  assert.match(html, /href="https:\/\/www\.yuricart\.com\/admin\/orders"/);
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes("<script>steal"));
  assert.ok(!html.includes("<b>830</b>"));
  assert.ok(html.includes("&lt;img"));
});

test("without a Resend key nothing is sent and the owner count is zero", async () => {
  env.RESEND_API_KEY = undefined;
  sentMails.length = 0;
  const errors = [];
  const realError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  try {
    assert.equal(await sendAdminNewOrderEmail(order), 0);
  } finally {
    console.error = realError;
  }
  assert.equal(sentMails.length, 0);
  assert.ok(errors.some((e) => /owner notifications failed/.test(e)));
});

test("with a key, every recipient gets the alert", async () => {
  env.RESEND_API_KEY = "test-key";
  sentMails.length = 0;
  assert.equal(await sendAdminNewOrderEmail(order), 2);
  assert.deepEqual(sentMails.map((m) => m.to[0]), ["owner@gmail.com", "second@example.com"]);
  assert.match(sentMails[0].subject, /New order #YC-20261123-0001 - KES 59,500/);
});

test("one failing recipient does not stop the others", async () => {
  env.RESEND_API_KEY = "test-key";
  sentMails.length = 0;
  failFor = "owner@gmail.com";
  const realError = console.error;
  console.error = () => {};
  try {
    assert.equal(await sendAdminNewOrderEmail(order), 1);
  } finally {
    console.error = realError;
    failFor = null;
  }
  assert.deepEqual(sentMails.map((m) => m.to[0]), ["second@example.com"]);
});

test("no recipients configured warns instead of failing silently", async () => {
  const saved = { notify: env.ORDER_NOTIFY_EMAILS, admin: env.ADMIN_EMAIL };
  const warnings = [];
  const realWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    env.ORDER_NOTIFY_EMAILS = [];
    env.ADMIN_EMAIL = undefined;
    assert.equal(await sendAdminNewOrderEmail(order), 0);
  } finally {
    console.warn = realWarn;
    env.ORDER_NOTIFY_EMAILS = saved.notify;
    env.ADMIN_EMAIL = saved.admin;
  }
  assert.ok(warnings.some((w) => /nobody was notified/.test(w)));
});

test("existing password reset email is still escaped", () => {
  const html = passwordResetEmailHtml({ name: "<b>x</b>", resetUrl: "https://a.b/?t=1" });
  assert.ok(!html.includes("<b>x</b>"));
});
