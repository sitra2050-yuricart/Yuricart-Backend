const { Resend } = require("resend");
const { env } = require("../config/env");
const { escapeHtml } = require("../utils/escapeHtml");
const { signOrderToken } = require("../utils/orderAccess");

function siteUrl() {
  return (env.SITE_URL || env.FRONTEND_URL[0]).replace(/\/+$/, "");
}

/** Link that opens one order without logging in or knowing the email. */
function orderTrackUrl(orderNumber) {
  return `${siteUrl()}/track?orderNumber=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(signOrderToken(orderNumber))}`;
}

function trackButtonHtml(orderNumber) {
  const url = orderTrackUrl(orderNumber);
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#003B73;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Track your order</a></p>`;
}

let resend = null;

function initResend() {
  if (resend) return true;
  if (!env.RESEND_API_KEY) {
    console.warn("Email not sent — RESEND_API_KEY not configured.");
    return false;
  }
  resend = new Resend(env.RESEND_API_KEY);
  return true;
}

/** Sends one email. Returns true when Resend accepted it, false if skipped or failed. */
async function sendMail({ to, subject, html }) {
  if (!initResend()) return false;
  try {
    const { error } = await resend.emails.send({
      from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error("Failed to send email:", error.message);
      return false;
    }
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
  ${trackButtonHtml(order.orderNumber)}
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
  ${trackButtonHtml(order.orderNumber)}
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

function verifyEmailHtml({ name, verifyUrl }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222">
  <h2 style="color:#003B73">Confirm your email</h2>
  <p>Hi ${escapeHtml(name)},</p>
  <p>Confirm this email address to see your past orders in your Yuricart account. The link works for 24 hours.</p>
  <p style="margin:24px 0"><a href="${escapeHtml(verifyUrl)}" style="background:#003B73;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Confirm email</a></p>
  <p style="font-size:13px;color:#555">If the button does not work, copy this link into your browser:<br/>${escapeHtml(verifyUrl)}</p>
  <p style="font-size:13px;color:#555">Did not create an account? You can ignore this email.</p>
</body>
</html>`;
}

async function sendVerificationEmail({ to, name, token }) {
  await sendMail({
    to,
    subject: "Confirm your Yuricart email",
    html: verifyEmailHtml({ name, verifyUrl: `${siteUrl()}/verify-email?token=${token}` }),
  });
}

function orderListEmailHtml(orders) {
  const rows = orders
    .map(
      (order) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee"><strong>#${escapeHtml(order.orderNumber)}</strong><br/><span style="color:#666;font-size:13px">KES ${Number(order.total || 0).toLocaleString()} � ${escapeHtml(order.orderStatus)}</span></td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right"><a href="${escapeHtml(orderTrackUrl(order.orderNumber))}" style="color:#003B73;font-weight:bold">Track</a></td></tr>`,
    )
    .join("");
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222">
  <h2 style="color:#003B73">Your Yuricart orders</h2>
  <p>You asked for the order numbers placed with this email address. Use a link to see where an order is.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
  <p style="font-size:13px;color:#555">Did not ask for this? You can ignore this email.</p>
</body>
</html>`;
}

async function sendOrderListEmail({ to, orders }) {
  await sendMail({
    to,
    subject: "Your Yuricart order numbers",
    html: orderListEmailHtml(orders),
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
      `New order #${order.orderNumber}: nobody was notified. Set ORDER_NOTIFY_EMAILS (or ADMIN_EMAIL) and RESEND_API_KEY.`,
    );
    return 0;
  }

  const html = adminNewOrderEmailHtml(order, `${siteUrl()}/admin/orders`);
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
  sendVerificationEmail,
  sendOrderListEmail,
  orderListEmailHtml,
  orderTrackUrl,
  sendProductRequestEmail,
  passwordResetEmailHtml,
};
