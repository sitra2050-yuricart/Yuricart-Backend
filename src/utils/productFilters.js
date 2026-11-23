const { parseBoolean } = require("./query");

/**
 * Stock part of the product filter. `inStock=true` keeps only products with
 * stock left; anything else (missing, false, junk) leaves the list unfiltered,
 * so the default listing still shows sold-out products.
 */
function buildStockFilter(inStock) {
  return parseBoolean(inStock) === true ? { stock: { $gt: 0 } } : {};
}

module.exports = { buildStockFilter };
