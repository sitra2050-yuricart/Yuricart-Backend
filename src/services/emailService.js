const SibApiV3Sdk = require("sib-api-v3-sdk");
const { env } = require("../config/env");
const { escapeHtml } = require("../utils/escapeHtml");

let defaultClient = null;
let apiInstance = null;

function initBrevo() {
  if (defaultClient) return true;
  if (!env.BREVO_API_KEY) {
    console.warn("Email not sent — BREVO_API_KEY not configured.");
    return false;
  }
  defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications["api-key"];
  apiKey.apiKey = env.BREVO_API_KEY;
  apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  return true;
}

/** Sends one email. Returns true when Brevo accepted it, false if skipped or failed. */
async function sendMail({ to, subject, html }) {
  if (!initBrevo()) return false;
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.sender = {
      name: env.BREVO_FROM_NAME,
      email: env.BREVO_FROM_EMAIL,
    };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return false;
  }
}

function orderStatusEmailHtml(order, newStatus) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(item.title)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">KES ${(item.price * item.quantity).toLocaleString()}</td></tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#333">Order Status Update</h2>
  <p>Hi <strong>${escapeHtml(order.customerName)}</strong>,</p>
  <p>The status of your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been updated to:</p>
  <p style="font-size:18px;font-weight:bold;color:#2563eb;text-transform:capitalize">${escapeHtml(newStatus)}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:center">Qty</th><th style="padding:8px 12px;text-align:right">Price</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <p style="font-size:16px"><strong>Total: KES ${order.total.toLocaleString()}</strong></p>
  <p style="color:#666;margin-top:24px">Thank you for shopping with Yuricart!</p>
</body>
</html>`;
}

function orderConfirmationEmailHtml(order) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(item.title)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">KES ${(item.price * item.quantity).toLocaleString()}</td></tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#333">Order Confirmed!</h2>
  <p>Hi <strong>${escapeHtml(order.customerName)}</strong>,</p>
  <p>Thank you for your order! Your order <strong>#${escapeHtml(order.orderNumber)}</strong> has been placed successfully.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:center">Qty</th><th style="padding:8px 12px;text-align:right">Price</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <p style="font-size:16px"><strong>Total: KES ${order.total.toLocaleString()}</strong></p>
  <p style="color:#666;margin-top:24px">We will notify you when your order status changes.</p>
  <p style="color:#666">Thank you for shopping with Yuricart!</p>
</body>
</html>`;
}

function productRequestEmailHtml({ customerName, customerEmail, productName, quantity, message }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#333">New Product Request</h2>
  <p>A customer has requested a product:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px 12px;font-weight:bold">Customer Name</td><td style="padding:6px 12px">${escapeHtml(customerName)}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold">Customer Email</td><td style="padding:6px 12px">${escapeHtml(customerEmail)}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:bold">Product Name</td><td style="padding:6px 12px">${escapeHtml(productName)}</td></tr>
    ${quantity ? `<tr><td style="padding:6px 12px;font-weight:bold">Requested Quantity</td><td style="padding:6px 12px">${escapeHtml(quantity)}</td></tr>` : ""}
    ${message ? `<tr><td style="padding:6px 12px;font-weight:bold">Message</td><td style="padding:6px 12px">${escapeHtml(message)}</td></tr>` : ""}
  </table>
</body>
</html>`;
}

function passwordResetEmailHtml({ name, resetUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222">
  <h2 style="color:#003B73">Reset your password</h2>
  <p>Hi ${escapeHtml(name)},</p>
  <p>We received a request to reset your Yuricart password. This link works once and expires in 1 hour.</p>
  <p style="margin:24px 0"><a href="${escapeHtml(resetUrl)}" style="background:#003B73;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
  <p style="font-size:13px;color:#555">If the button does not work, copy this link into your browser:<br/>${escapeHtml(resetUrl)}</p>
  <p style="font-size:13px;color:#555">Did not ask for this? You can ignore this email. Your password stays the same.</p>
</body>
</html>`;
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  await sendMail({
    to,
    subject: "Reset your Yuricart password",
    html: passwordResetEmailHtml({ name, resetUrl }),
  });
}

const PAYMENT_LABELS = {
  cod: "Cash on delivery",
  mpesa: "M-Pesa",
  whatsapp: "Order on WhatsApp",
  card: "Card",
};

/** Who should be told about a new order: ORDER_NOTIFY_EMAILS, else ADMIN_EMAIL. */
function getOrderNotifyRecipients() {
  if (env.ORDER_NOTIFY_EMAILS && env.ORDER_NOTIFY_EMAILS.length) {
    return env.ORDER_NOTIFY_EMAILS;
  }
  return env.ADMIN_EMAIL ? [env.ADMIN_EMAIL.toLowerCase()] : [];
}

/** The email the shop owner gets when a customer places an order. */
function adminNewOrderEmailHtml(order, adminOrdersUrl) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(item.title)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${escapeHtml(item.quantity)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">KES ${(item.price * item.quantity).toLocaleString()}</td></tr>`,
    )
    .join("");

  const row = (label, value) =>
    value
      ? `<tr><td style="padding:4px 12px;color:#666;vertical-align:top">${label}</td><td style="padding:4px 12px"><strong>${escapeHtml(value)}</strong></td></tr>`
      : "";

  const address = [order.address, order.city, order.county]
    .filter(Boolean)
    .join(", ");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222">
  <h2 style="color:#003B73;margin-bottom:4px">New order #${escapeHtml(order.orderNumber)}</h2>
  <p style="margin-top:0;color:#555">A customer just placed an order on yuricart.com.</p>
  <table style="border-collapse:collapse;margin:12px 0">
    ${row("Customer", order.customerName)}
    ${row("Phone", order.phone)}
    ${row("Email", order.email)}
    ${row("Deliver to", address)}
    ${row("Payment", PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod)}
    ${row("Notes", order.notes)}
  </table>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead><tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:center">Qty</th><th style="padding:8px 12px;text-align:right">Price</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <p style="margin:2px 0">Subtotal: KES ${Number(order.subtotal || 0).toLocaleString()}</p>
  <p style="margin:2px 0">Delivery: KES ${Number(order.shipping || 0).toLocaleString()}</p>
  ${order.discount ? `<p style="margin:2px 0">Discount: -KES ${Number(order.discount).toLocaleString()}</p>` : ""}
  <p style="font-size:18px;margin:8px 0"><strong>Total: KES ${Number(order.total || 0).toLocaleString()}</strong></p>
  <p style="margin:24px 0"><a href="${escapeHtml(adminOrdersUrl)}" style="background:#003B73;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Open orders</a></p>
</body>
</html>`;
}

/**
 * Tells the shop owner about a new order. Returns how many recipients were
 * emailed, and logs loudly when nobody can be notified so it is not silent.
 */
async function sendAdminNewOrderEmail(order) {
  const recipients = getOrderNotifyRecipients();
  if (!recipients.length) {
    console.warn(
      `New order #${order.orderNumber}: nobody was notified. Set ORDER_NOTIFY_EMAILS (or ADMIN_EMAIL) and BREVO_API_KEY.`,
    );
    return 0;
  }

  const baseUrl = (env.SITE_URL || env.FRONTEND_URL[0]).replace(/\/+$/, "");
  const html = adminNewOrderEmailHtml(order, `${baseUrl}/admin/orders`);
  const subject = `New order #${order.orderNumber} - KES ${Number(order.total || 0).toLocaleString()}`;

  const results = await Promise.all(
    recipients.map((to) => sendMail({ to, subject, html })),
  );
  const sent = results.filter(Boolean).length;
  if (sent < recipients.length) {
    console.error(
      `New order #${order.orderNumber}: ${recipients.length - sent} of ${recipients.length} owner notifications failed.`,
    );
  }
  return sent;
}

async function sendOrderConfirmationEmail(order) {
  if (!order.email) return;
  await sendMail({
    to: order.email,
    subject: `Order Confirmed — #${order.orderNumber}`,
    html: orderConfirmationEmailHtml(order),
  });
}

async function sendOrderStatusEmail(order, newStatus) {
  if (!order.email) return;
  await sendMail({
    to: order.email,
    subject: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} — #${order.orderNumber}`,
    html: orderStatusEmailHtml(order, newStatus),
  });
}

async function sendProductRequestEmail({ customerName, customerEmail, productName, quantity, message }) {
  const adminEmail = env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set — cannot send product request notification.");
    return;
  }
  await sendMail({
    to: adminEmail,
    subject: `New Product Request from ${customerName}`,
    html: productRequestEmailHtml({ customerName, customerEmail, productName, quantity, message }),
  });

  if (customerEmail) {
    await sendMail({
      to: customerEmail,
      subject: "We received your product request",
      html: `<p>Hi <strong>${escapeHtml(customerName)}</strong>,</p><p>Thank you for your interest in <strong>${escapeHtml(productName)}</strong>. We have received your request and will notify you when it becomes available.</p><p>Best regards,<br/>Yuricart Team</p>`,
    });
  }
}

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendAdminNewOrderEmail,
  adminNewOrderEmailHtml,
  getOrderNotifyRecipients,
  sendPasswordResetEmail,
  sendProductRequestEmail,
  passwordResetEmailHtml,
};
