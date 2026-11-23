const test = require("node:test");
const assert = require("node:assert/strict");
const { pickShippingRule, shippingCostForRule } = require("../src/utils/shippingRules");

const rules = [
  { name: "Nairobi CBD", rate: 200, freeAbove: 50000, regions: ["Nairobi CBD", "Nairobi"] },
  { name: "Countrywide", rate: 800, regions: [] },
];

test("a region matches its rule, ignoring case and spaces", () => {
  assert.equal(pickShippingRule(rules, "  nairobi cbd ").name, "Nairobi CBD");
});

test("an unknown or missing region uses the catch-all rule", () => {
  assert.equal(pickShippingRule(rules, "Mombasa").name, "Countrywide");
  assert.equal(pickShippingRule(rules, undefined).name, "Countrywide");
});

test("with no catch-all, the first rule is used and no rules means no delivery cost", () => {
  assert.equal(pickShippingRule([rules[0]], "Mombasa").name, "Nairobi CBD");
  assert.equal(pickShippingRule([], "Nairobi"), null);
  assert.equal(shippingCostForRule(null, 1000), 0);
});

test("the delivery rate applies until the free-delivery threshold", () => {
  assert.equal(shippingCostForRule(rules[0], 49999), 200);
  assert.equal(shippingCostForRule(rules[0], 50000), 0);
  assert.equal(shippingCostForRule(rules[1], 1000000), 800);
});
