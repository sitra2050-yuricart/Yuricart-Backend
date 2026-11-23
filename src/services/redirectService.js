const { Category } = require("../models/Category");
const { Product } = require("../models/Product");
const { Redirect } = require("../models/Redirect");
const { BadRequestError, NotFoundError } = require("../utils/ApiError");
const { normalizePath, parseCatalogPath } = require("../utils/redirectPath");

/**
 * Where should an old path go? Checks manual redirects first, then renamed
 * product and category slugs. Returns { to, statusCode } or null.
 */
async function resolveRedirect(rawPath) {
  const path = normalizePath(rawPath);
  if (!path) return null;

  const manual = await Redirect.findOne({ from: path, active: true }).lean();
  if (manual) return { to: manual.to, statusCode: manual.statusCode };

  const parsed = parseCatalogPath(path);
  if (!parsed) return null;

  if (parsed.type === "product") {
    const product = await Product.findOne({
      previousSlugs: parsed.slug,
      status: "active",
    })
      .select("slug")
      .lean();
    if (product) return { to: `/products/${product.slug}`, statusCode: 301 };
  } else {
    const category = await Category.findOne({
      previousSlugs: parsed.slug,
      status: "active",
    })
      .select("slug")
      .lean();
    if (category) return { to: `/collections/${category.slug}`, statusCode: 301 };
  }

  return null;
}

function validateTarget(to) {
  if (typeof to !== "string" || !to.startsWith("/") || to.startsWith("//")) {
    throw new BadRequestError("Redirect target must be a path on this site, like /collections/tablets");
  }
}

async function listRedirects() {
  return Redirect.find().sort({ createdAt: -1 }).lean();
}

async function createRedirect({ from, to, statusCode }) {
  const path = normalizePath(from);
  if (!path) throw new BadRequestError("The old path must start with /");
  validateTarget(to);
  if (path === normalizePath(to)) {
    throw new BadRequestError("A redirect cannot point to itself");
  }

  const existing = await Redirect.findOne({ from: path }).lean();
  if (existing) throw new BadRequestError("A redirect for that path already exists");

  return Redirect.create({ from: path, to, statusCode: statusCode || 301 });
}

async function updateRedirect(id, input) {
  const redirect = await Redirect.findById(id);
  if (!redirect) throw new NotFoundError("Redirect not found");

  if (input.to !== undefined) {
    validateTarget(input.to);
    redirect.to = input.to;
  }
  if (input.statusCode !== undefined) redirect.statusCode = input.statusCode;
  if (input.active !== undefined) redirect.active = input.active;

  await redirect.save();
  return redirect.toObject();
}

async function deleteRedirect(id) {
  const redirect = await Redirect.findByIdAndDelete(id);
  if (!redirect) throw new NotFoundError("Redirect not found");
}

module.exports = {
  resolveRedirect,
  listRedirects,
  createRedirect,
  updateRedirect,
  deleteRedirect,
};
