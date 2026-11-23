/**
 * Picks the delivery rule for a region and prices it. Pure, so the order
 * service and the public quote use exactly the same logic.
 */
function pickShippingRule(rules, region) {
  if (!rules.length) return null;

  if (region) {
    const wanted = String(region).trim().toLowerCase();
    const byRegion = rules.find((rule) =>
      (rule.regions || []).some((r) => String(r).trim().toLowerCase() === wanted),
    );
    if (byRegion) return byRegion;
  }

  return rules.find((rule) => !(rule.regions || []).length) || rules[0];
}

/** Delivery cost in KES for a subtotal, honouring a free-delivery threshold. */
function shippingCostForRule(rule, subtotal) {
  if (!rule) return 0;
  if (rule.freeAbove !== undefined && rule.freeAbove !== null && subtotal >= rule.freeAbove) {
    return 0;
  }
  return rule.rate;
}

module.exports = { pickShippingRule, shippingCostForRule };
