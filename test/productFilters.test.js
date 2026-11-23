const test = require("node:test");
const assert = require("node:assert/strict");
const { buildStockFilter } = require("../src/utils/productFilters");

test("inStock=true keeps only products with stock", () => {
  assert.deepEqual(buildStockFilter("true"), { stock: { $gt: 0 } });
  assert.deepEqual(buildStockFilter("1"), { stock: { $gt: 0 } });
  assert.deepEqual(buildStockFilter(true), {});
});

test("anything else leaves the list unfiltered so sold-out products still show", () => {
  for (const value of [undefined, "", "false", "0", "yes", null]) {
    assert.deepEqual(buildStockFilter(value), {}, String(value));
  }
});
