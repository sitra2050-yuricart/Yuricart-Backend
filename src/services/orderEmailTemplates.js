const { escapeHtml } = require("../utils/escapeHtml");

// Site palette (see the storefront design system). Emails need inline styles and tables.
const NAVY = "#003B73";
const ORANGE = "#C2410C";
const SOFT = "#eef3f9";
const TEXT = "#1f2937";
const MUTED = "#4b5563";
const LINE = "#e5e7eb";

const PAYMENT_METHODS = {
  cod: "Pay on delivery",
  mpesa: "M-Pesa",
  whatsapp: "Pay via WhatsApp",
  card: "Card",
};

const PAYMENT_STATUSES = {
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

const STATUS_COPY = {
  pending: { label: "Order received", text: "We have your order and will contact you shortly to confirm it." },
  confirmed: { label: "Confirmed", text: "We have confirmed your order." },
  processing: { label: "Being prepared", text: "We are checking and packing your items." },
  shipped: { label: "On its way", text: "Your order is on its way to you." },
  delivered: { label: "Delivered", text: "Your order was delivered. Thank you for shopping with us." },
  cancelled: { label: "Cancelled", text: "This order was cancelled. If that is a surprise, contact us and we will help." },
};

const STATUS_TONE = {
  pending: { bg: "#fffbeb", fg: "#78350f" },
  confirmed: { bg: SOFT, fg: NAVY },
  processing: { bg: SOFT, fg: NAVY },
  shipped: { bg: NAVY, fg: "#ffffff" },
  delivered: { bg: "#ecfdf5", fg: "#065f46" },
  cancelled: { bg: "#fef2f2", fg: "#991b1b" },
};

const money = (value) => `KES ${Number(value || 0).toLocaleString("en-US")}`;

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function itemRows(items) {
  return (items || [])
    .map((item) => {
      const image = isHttpUrl(item.image)
        ? `<img src="${escapeHtml(item.image)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:10px;background:${SOFT}" />`
        : `<div style="width:64px;height:64px;border-radius:10px;background:${SOFT}"></div>`;
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${LINE};width:76px;vertical-align:top">${image}</td>
        <td style="padding:12px 8px;border-bottom:1px solid ${LINE};vertical-align:top">
          <div style="font-size:15px;font-weight:bold;color:${TEXT};line-height:1.35">${escapeHtml(item.title)}</div>
          <div style="font-size:13px;color:${MUTED};margin-top:4px">${Number(item.quantity)} × ${money(item.price)}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${LINE};text-align:right;vertical-align:top;font-size:15px;font-weight:bold;color:${TEXT};white-space:nowrap">${money(item.price * item.quantity)}</td>
      </tr>`;
    })
    .join("");
}

function totalsRows(order) {
  const rows = [];
  const subtotal = Number(order.subtotal || 0);
  if (subtotal > 0 && subtotal !== Number(order.total)) rows.push(["Subtotal", money(subtotal), MUTED]);
  if (Number(order.discount) > 0) rows.push(["Discount", `−${money(order.discount)}`, "#065f46"]);
  if (Number(order.shipping) > 0) rows.push(["Delivery", money(order.shipping), MUTED]);
  return rows
    .map(
      ([label, value, color]) =>
        `<tr><td style="padding:3px 0;font-size:14px;color:${color}">${label}</td><td style="padding:3px 0;font-size:14px;color:${color};text-align:right">${value}</td></tr>`,
    )
    .join("");
}

function infoBlock(title, bodyHtml) {
  return `
  <td valign="top" style="padding:0 6px 12px 0;width:50%">
    <div style="background:${SOFT};border-radius:12px;padding:14px 16px">
      <div style="font-size:12px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:${NAVY};margin-bottom:6px">${title}</div>
      <div style="font-size:14px;color:${TEXT};line-height:1.5">${bodyHtml}</div>
    </div>
  </td>`;
}

/**
 * One layout for order emails: site header, order summary with product images,
 * totals, delivery and payment details, and a button to track the order.
 */
function renderOrderEmail({ order, heading, intro, statusKey, trackUrl, siteUrl }) {
  const status = STATUS_COPY[statusKey];
  const tone = STATUS_TONE[statusKey];
  const place = [order.city, order.county].filter(Boolean).join(", ");
  const firstName = String(order.customerName || "").trim().split(/\s+/)[0];
  const manualPayment = order.paymentMethod === "mpesa" || order.paymentMethod === "whatsapp";

  const statusPill = status
    ? `<span style="display:inline-block;background:${tone.bg};color:${tone.fg};border-radius:999px;padding:5px 14px;font-size:13px;font-weight:bold">${escapeHtml(status.label)}</span>`
    : "";

  const delivery = `
    <strong>${escapeHtml(order.customerName)}</strong><br/>
    ${order.address ? `${escapeHtml(order.address)}<br/>` : ""}
    ${place ? `${escapeHtml(place)}<br/>` : ""}
    ${order.phone ? escapeHtml(order.phone) : ""}`;

  const payment = `
    ${escapeHtml(PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod || "")}<br/>
    <span style="color:${MUTED}">${escapeHtml(PAYMENT_STATUSES[order.paymentStatus] || "")}</span>`;

  const tracking = order.trackingNumber
    ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT}">Tracking number: <strong>${escapeHtml(order.trackingNumber)}</strong></p>`
    : "";

  const paymentNote = manualPayment && order.paymentStatus !== "paid"
    ? `<div style="background:#fffbeb;border-radius:12px;padding:14px 16px;margin:0 0 20px;font-size:14px;color:#78350f;line-height:1.5">We will send you the ${order.paymentMethod === "mpesa" ? "M-Pesa" : "payment"} details on WhatsApp. Quote order <strong>#${escapeHtml(order.orderNumber)}</strong> when you pay.</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:${TEXT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:${NAVY};padding:20px 28px">
          <a href="${escapeHtml(siteUrl)}" style="color:#ffffff;text-decoration:none;font-size:22px;font-weight:bold;letter-spacing:.2px">Yuricart</a>
          <span style="color:#bcd0e6;font-size:13px;margin-left:8px">Electronics</span>
        </td></tr>
        <tr><td style="height:4px;background:${ORANGE};font-size:0;line-height:0">&nbsp;</td></tr>

        <tr><td style="padding:28px 28px 8px">
          <h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;color:${TEXT}">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${MUTED}">${firstName ? `Hi ${escapeHtml(firstName)}, ` : ""}${escapeHtml(intro)}</p>
          <p style="margin:0 0 4px;font-size:14px;color:${MUTED}">Order <strong style="color:${TEXT}">#${escapeHtml(order.orderNumber)}</strong> &nbsp;·&nbsp; ${escapeHtml(formatDate(order.createdAt))}</p>
          <p style="margin:8px 0 0">${statusPill}</p>
          ${status ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:${TEXT}">${escapeHtml(status.text)}</p>` : ""}
        </td></tr>

        <tr><td style="padding:16px 28px 0">
          ${tracking}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(order.items)}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
            ${totalsRows(order)}
            <tr>
              <td style="padding:10px 0 0;font-size:17px;font-weight:bold;color:${TEXT}">Total</td>
              <td style="padding:10px 0 0;font-size:17px;font-weight:bold;color:${NAVY};text-align:right">${money(order.total)}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 28px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${infoBlock("Delivery to", delivery)}
            ${infoBlock("Payment", payment)}
          </tr></table>
          ${paymentNote}
        </td></tr>

        <tr><td align="center" style="padding:8px 28px 28px">
          <a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:999px">Track your order</a>
          <p style="margin:14px 0 0;font-size:13px;color:${MUTED}">No login needed. This link opens only this order.</p>
        </td></tr>

        <tr><td style="background:#f7f8fa;padding:18px 28px;font-size:12px;line-height:1.6;color:${MUTED};text-align:center">
          Questions about your order? Reply to this email or visit <a href="${escapeHtml(siteUrl)}/contact" style="color:${NAVY}">our contact page</a>.<br/>
          Yuricart Electronics · <a href="${escapeHtml(siteUrl)}" style="color:${NAVY}">${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { renderOrderEmail, STATUS_COPY };
