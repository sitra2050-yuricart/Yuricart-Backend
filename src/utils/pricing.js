/**
 * Price rules shared by order creation and product validation.
 *
 * A sale price only counts when it is a real discount: greater than 0 and lower
 * than the regular price. A sale price of 0 means "no sale" (the admin form used
 * to save 0 for an empty field), never "free".
 */

function toNumber(value) {
  if (value === undefined || value === null || value === "") return NaN;
  return Number(value);
}

function isValidSalePrice(price, salePrice) {
  const regular = toNumber(price);
  const sale = toNumber(salePrice);
  return Number.isFinite(regular) && Number.isFinite(sale) && sale > 0 && sale < regular;
}

/** The price a customer pays for one unit. Returns 0 when no usable price is set. */
function getEffectiveUnitPrice({ price, salePrice } = {}) {
  if (isValidSalePrice(price, salePrice)) return toNumber(salePrice);
  const regular = toNumber(price);
  return Number.isFinite(regular) && regular > 0 ? regular : 0;
}

/**
 * Unit price for a product, optionally refined by the selected variant.
 * Variant prices apply only when the variant defines its own price (or sale
 * price); otherwise the product's pricing is used.
 */
function getLineUnitPrice(product, variant) {
  const variantHasPrice = toNumber(variant?.price) > 0;
  const variantHasSale = toNumber(variant?.salePrice) > 0;

  if (variantHasPrice) {
    return getEffectiveUnitPrice({ price: variant.price, salePrice: variant.salePrice });
  }
  if (variantHasSale) {
    return getEffectiveUnitPrice({ price: product.price, salePrice: variant.salePrice });
  }
  return getEffectiveUnitPrice(product);
}

/**
 * Validates the price/salePrice an admin is saving. Returns an error message,
 * or null when the combination is fine. A missing sale price is fine.
 */
function validateProductPricing(price, salePrice) {
  const regular = toNumber(price);
  if (!Number.isFinite(regular) || regular <= 0) {
    return "Price must be greater than 0";
  }

  if (salePrice === undefined || salePrice === null || salePrice === "") return null;

  const sale = toNumber(salePrice);
  if (!Number.isFinite(sale) || sale <= 0) {
    return "Sale price must be greater than 0 (leave it empty for no sale)";
  }
  if (sale >= regular) {
    return "Sale price must be lower than the regular price";
  }
  return null;
}

module.exports = {
  isValidSalePrice,
  getEffectiveUnitPrice,
  getLineUnitPrice,
  validateProductPricing,
};
