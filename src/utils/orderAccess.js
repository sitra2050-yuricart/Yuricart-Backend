const { signToken, verifyToken } = require("./jwt");
const { UnauthorizedError } = require("./ApiError");

const ORDER_LINK_TTL = "180d";

/** Signed token that lets whoever holds an emailed link see one order, nothing else. */
function signOrderToken(orderNumber) {
  return signToken({ purpose: "order-track", orderNumber }, ORDER_LINK_TTL);
}

/** Returns the order number a token was issued for, or throws. */
function verifyOrderToken(token) {
  const payload = verifyToken(token);
  if (payload.purpose !== "order-track" || !payload.orderNumber) {
    throw new UnauthorizedError("Invalid or expired link");
  }
  return payload.orderNumber;
}

module.exports = { signOrderToken, verifyOrderToken };
