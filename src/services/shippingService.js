const { Shipping } = require("../models/Shipping");
const { NotFoundError } = require("../utils/ApiError");
const { buildPaginationMeta, getPagination } = require("../utils/pagination");
const { pickShippingRule, shippingCostForRule } = require("../utils/shippingRules");

async function loadActiveRules() {
  return Shipping.find({ status: "active" }).sort({ rate: 1 }).lean();
}

async function calculateShippingCost(subtotal, region) {
  return shippingCostForRule(pickShippingRule(await loadActiveRules(), region), subtotal);
}

/** What delivery will cost, plus the threshold for free delivery when there is one. */
async function quoteShipping(subtotal, region) {
  const rule = pickShippingRule(await loadActiveRules(), region);
  const shipping = shippingCostForRule(rule, subtotal);
  return {
    shipping,
    freeAbove: rule && rule.freeAbove !== undefined && rule.freeAbove !== null ? rule.freeAbove : null,
    zone: rule ? rule.name : null,
  };
}

async function listAdminShipping(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Shipping.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Shipping.countDocuments(filter),
  ]);

  return { items, meta: buildPaginationMeta(total, page, limit) };
}

async function getShippingById(id) {
  const rule = await Shipping.findById(id).lean();
  if (!rule) throw new NotFoundError("Shipping rule not found");
  return rule;
}

async function createShipping(input) {
  return Shipping.create(input);
}

async function updateShipping(id, input) {
  const rule = await Shipping.findByIdAndUpdate(id, input, {
    new: true,
    runValidators: true,
  }).lean();

  if (!rule) throw new NotFoundError("Shipping rule not found");
  return rule;
}

async function deleteShipping(id) {
  const rule = await Shipping.findByIdAndDelete(id);
  if (!rule) throw new NotFoundError("Shipping rule not found");
  return { id };
}

module.exports = {
  quoteShipping,
  calculateShippingCost,
  listAdminShipping,
  getShippingById,
  createShipping,
  updateShipping,
  deleteShipping,
};
