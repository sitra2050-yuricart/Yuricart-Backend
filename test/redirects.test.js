const test = require("node:test");
const assert = require("node:assert/strict");

const { planSlugChange } = require("../src/utils/slugHistory");
const { normalizePath, parseCatalogPath } = require("../src/utils/redirectPath");
const { cleanProductTitle } = require("../src/utils/titleCleaner");

test("editing a title alone never changes the slug", () => {
  const plan = planSlugChange({ currentSlug: "lenovo-t480s", nextSlug: undefined, previousSlugs: [] });
  assert.equal(plan.slug, undefined);
  assert.deepEqual(plan.previousSlugs, []);
});

test("a deliberate slug change remembers the old slug once", () => {
  const first = planSlugChange({ currentSlug: "modio", nextSlug: "tablets", previousSlugs: [] });
  assert.equal(first.slug, "tablets");
  assert.deepEqual(first.previousSlugs, ["modio"]);

  const second = planSlugChange({ currentSlug: "tablets", nextSlug: "android-tablets", previousSlugs: first.previousSlugs });
  assert.deepEqual(second.previousSlugs, ["modio", "tablets"]);
});

test("the current slug is never in its own history (rename back)", () => {
  const plan = planSlugChange({ currentSlug: "tablets", nextSlug: "modio", previousSlugs: ["modio"] });
  assert.equal(plan.slug, "modio");
  assert.deepEqual(plan.previousSlugs, ["tablets"]);
});

test("asking for the same slug is not a change", () => {
  const plan = planSlugChange({ currentSlug: "a", nextSlug: "a", previousSlugs: ["old"] });
  assert.equal(plan.slug, undefined);
  assert.deepEqual(plan.previousSlugs, ["old"]);
});

test("normalizePath lowercases, drops query and trailing slash, and rejects off-site values", () => {
  assert.equal(normalizePath("/Collections/Modio/?x=1"), "/collections/modio");
  assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath("https://evil.com"), null);
  assert.equal(normalizePath("//evil.com"), null);
  assert.equal(normalizePath(undefined), null);
});

test("parseCatalogPath finds product and collection slugs only", () => {
  assert.deepEqual(parseCatalogPath("/products/abc"), { type: "product", slug: "abc" });
  assert.deepEqual(parseCatalogPath("/collections/modio"), { type: "category", slug: "modio" });
  assert.equal(parseCatalogPath("/products/abc/extra"), null);
  assert.equal(parseCatalogPath("/shop"), null);
});

test("title cleaner strips emoji and unifies separators without rewording", () => {
  assert.equal(
    cleanProductTitle("\u{1F5A8}️ HP LaserJet 3303sdw Color Multifunction Printer"),
    "HP LaserJet 3303sdw Color Multifunction Printer",
  );
  assert.equal(
    cleanProductTitle("MODIO M730 Tablet – 6GB RAM | 256GB Storage | 7-Inch Display"),
    "MODIO M730 Tablet - 6GB RAM - 256GB Storage - 7-Inch Display",
  );
  assert.equal(cleanProductTitle("  Lenovo  ThinkPad   T480s  "), "Lenovo ThinkPad T480s");
  assert.equal(cleanProductTitle("HP EliteBook 840 G5"), "HP EliteBook 840 G5");
  // a title that is only decoration is kept rather than emptied
  assert.equal(cleanProductTitle("\u{1F5A8}️"), "\u{1F5A8}️");
});
