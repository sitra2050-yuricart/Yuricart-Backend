process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.JWT_SECRET = "test-secret-test-secret-123456";
process.env.CLOUDINARY_CLOUD_NAME = "x";
process.env.CLOUDINARY_API_KEY = "x";
process.env.CLOUDINARY_API_SECRET = "x";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSuggestFilter, escapeRegex } = require("../src/utils/productSuggest");
const { productSuggestQuerySchema } = require("../src/validators/productValidator");

const matches = (filter, title, sku = "") =>
  filter.$and.every((clause) =>
    clause.$or.some((cond) => {
      const [field, rule] = Object.entries(cond)[0];
      return new RegExp(rule.$regex, rule.$options).test(field === "title" ? title : sku);
    }),
  );

test("a typed prefix matches the start of any word in the title", () => {
  const filter = buildSuggestFilter("desk");
  assert.ok(matches(filter, "HP DeskJet 2710 All-in-One Printer"));
  assert.ok(matches(filter, "Printer Desk Jet"));
  assert.ok(!matches(filter, "Adesk mount")); // middle of a word is not a match
});

test("every typed word has to match, in any order", () => {
  const filter = buildSuggestFilter("hp  print");
  assert.ok(matches(filter, "HP DeskJet Printer"));
  assert.ok(!matches(filter, "Dell Printer"));
});

test("a SKU prefix matches too", () => {
  assert.ok(matches(buildSuggestFilter("hp-83"), "Laptop", "HP-830G5"));
});

test("only active products, and special characters are taken literally", () => {
  const filter = buildSuggestFilter("c++ (x)");
  assert.equal(filter.status, "active");
  assert.ok(matches(filter, "Learn C++ (X) edition"));
  assert.equal(escapeRegex("a.b*c"), String.raw`a\.b\*c`);
  assert.doesNotThrow(() => buildSuggestFilter("[[[ \ ))"));
});

test("nothing typed means nothing to search, and the query is bounded", () => {
  assert.equal(buildSuggestFilter("   "), null);
  assert.equal(buildSuggestFilter("a b c d e f g h").$and.length, 5);
  assert.equal(productSuggestQuerySchema.safeParse({ q: "" }).success, false);
  assert.equal(productSuggestQuerySchema.safeParse({ q: "x".repeat(81) }).success, false);
  assert.equal(productSuggestQuerySchema.safeParse({ q: " desk " }).data.q, "desk");
});
