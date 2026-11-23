const test = require("node:test");
const assert = require("node:assert/strict");
const { attachProductCounts } = require("../src/utils/categoryCounts");

test("categories get their active product count, zero when none", () => {
  const counts = new Map([["a1", 12], ["a2", 3]]);
  const result = attachProductCounts(
    [
      { _id: "a1", name: "Laptops" },
      { _id: "a2", name: "Printers" },
      { _id: "a3", name: "Accessories" },
    ],
    counts,
  );
  assert.deepEqual(
    result.map((c) => [c.name, c.productCount]),
    [["Laptops", 12], ["Printers", 3], ["Accessories", 0]],
  );
});

test("ids that are objects are matched by their string form", () => {
  const id = { toString: () => "abc123" };
  const result = attachProductCounts([{ _id: id }], new Map([["abc123", 5]]));
  assert.equal(result[0].productCount, 5);
});

test("the original category fields are kept", () => {
  const [category] = attachProductCounts([{ _id: "x", slug: "tablets", name: "Tablets" }], new Map());
  assert.equal(category.slug, "tablets");
  assert.equal(category.name, "Tablets");
});
