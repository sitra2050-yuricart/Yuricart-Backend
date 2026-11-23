process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.JWT_SECRET = "test-secret-test-secret-123456";
process.env.CLOUDINARY_CLOUD_NAME = "x";
process.env.CLOUDINARY_API_KEY = "x";
process.env.CLOUDINARY_API_SECRET = "x";

const test = require("node:test");
const assert = require("node:assert/strict");

const { Redirect } = require("../src/models/Redirect");
const { Product } = require("../src/models/Product");
const { Category } = require("../src/models/Category");
const { resolveRedirect, createRedirect } = require("../src/services/redirectService");

// Minimal chainable stand-in for mongoose queries: .select().lean() -> value
const query = (value) => ({ select: () => ({ lean: async () => value }), lean: async () => value });

function stub({ manual = null, product = null, category = null } = {}) {
  const seen = {};
  Redirect.findOne = (q) => ((seen.redirect = q), query(manual));
  Product.findOne = (q) => ((seen.product = q), query(product));
  Category.findOne = (q) => ((seen.category = q), query(category));
  return seen;
}

test("a manual redirect wins and is matched on the normalised path", async () => {
  const seen = stub({ manual: { to: "/collections/tablets", statusCode: 301 } });
  const result = await resolveRedirect("/Collections/Modio/");
  assert.deepEqual(result, { to: "/collections/tablets", statusCode: 301 });
  assert.deepEqual(seen.redirect, { from: "/collections/modio", active: true });
  assert.equal(seen.category, undefined);
});

test("a renamed category resolves through previousSlugs", async () => {
  const seen = stub({ category: { slug: "tablets" } });
  const result = await resolveRedirect("/collections/modio");
  assert.deepEqual(result, { to: "/collections/tablets", statusCode: 301 });
  assert.equal(seen.category.previousSlugs, "modio");
  assert.equal(seen.category.status, "active");
});

test("a renamed product resolves through previousSlugs", async () => {
  stub({ product: { slug: "new-name" } });
  assert.deepEqual(await resolveRedirect("/products/old-name"), {
    to: "/products/new-name",
    statusCode: 301,
  });
});

test("unknown or off-site paths resolve to nothing", async () => {
  stub();
  assert.equal(await resolveRedirect("/products/nope"), null);
  assert.equal(await resolveRedirect("/shop"), null);
  assert.equal(await resolveRedirect("https://evil.com/x"), null);
});

test("creating a redirect rejects off-site targets, loops and duplicates", async () => {
  Redirect.findOne = () => query(null);
  Redirect.create = async (doc) => doc;

  await assert.rejects(() => createRedirect({ from: "/a", to: "https://evil.com" }), /path on this site/);
  await assert.rejects(() => createRedirect({ from: "/a", to: "//evil.com" }), /path on this site/);
  await assert.rejects(() => createRedirect({ from: "/a", to: "/a/" }), /itself/);
  await assert.rejects(() => createRedirect({ from: "nope", to: "/b" }), /start with/);

  const created = await createRedirect({ from: "/Old/", to: "/new" });
  assert.deepEqual(created, { from: "/old", to: "/new", statusCode: 301 });

  Redirect.findOne = () => query({ from: "/old" });
  await assert.rejects(() => createRedirect({ from: "/old", to: "/new" }), /already exists/);
});
