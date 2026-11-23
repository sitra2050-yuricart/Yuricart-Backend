/**
 * Adds `productCount` (active products) to categories so the storefront can
 * hide empty ones from navigation without a request per category.
 */
function attachProductCounts(categories, counts) {
  return categories.map((category) => ({
    ...category,
    productCount: counts.get(String(category._id)) ?? 0,
  }));
}

module.exports = { attachProductCounts };
