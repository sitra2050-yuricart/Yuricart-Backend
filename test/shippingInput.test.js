const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanRegions, splitShippingInput } = require("../src/utils/shippingInput");
const { createShippingSchema, updateShippingSchema } = require("../src/validators/shippingValidator");

test("area names are trimmed and de-duplicated ignoring case", () => {
  assert.deepEqual(cleanRegions([" Nairobi ", "nairobi", "Westlands", "", "  "]), ["Nairobi", "Westlands"]);
  assert.deepEqual(cleanRegions(undefined), []);
});

test("a null threshold is removed, not saved as zero (zero would mean always free)", () => {
  const { set, unset } = splitShippingInput({ name: "A", rate: 500, freeAbove: null });
  assert.equal("freeAbove" in set, false);
  assert.deepEqual(unset, { freeAbove: "" });
});

test("a real threshold, and a threshold left alone, are kept as they are", () => {
  assert.equal(splitShippingInput({ freeAbove: 50000 }).set.freeAbove, 50000);
  assert.equal("freeAbove" in splitShippingInput({ rate: 100 }).set, false);
  assert.deepEqual(splitShippingInput({ rate: 100 }).unset, {});
});

test("the name is trimmed and regions cleaned", () => {
  const { set } = splitShippingInput({ name: "  Nairobi  ", regions: ["a", "A "] });
  assert.equal(set.name, "Nairobi");
  assert.deepEqual(set.regions, ["a"]);
});

test("the validator accepts null for the threshold instead of turning it into 0", () => {
  assert.equal(updateShippingSchema.parse({ freeAbove: null }).freeAbove, null);
  assert.equal(updateShippingSchema.parse({ freeAbove: "50000" }).freeAbove, 50000);
  assert.equal("freeAbove" in updateShippingSchema.parse({ rate: 100 }), false);
  assert.throws(() => createShippingSchema.parse({ name: "A", rate: -1 }));
  assert.throws(() => createShippingSchema.parse({ name: "A", rate: 100, freeAbove: -5 }));
});
