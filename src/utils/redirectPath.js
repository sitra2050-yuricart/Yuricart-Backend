/** Normalises a request path for redirect lookups: lowercase, no query, no trailing slash. */
function normalizePath(input) {
  if (typeof input !== "string") return null;
  let path = input.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  path = path.split("?")[0].split("#")[0].toLowerCase();
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

/** Pulls the slug out of /products/:slug or /collections/:slug paths. */
function parseCatalogPath(path) {
  const match = /^\/(products|collections)\/([^/]+)$/.exec(path || "");
  if (!match) return null;
  return { type: match[1] === "products" ? "product" : "category", slug: match[2] };
}

module.exports = { normalizePath, parseCatalogPath };
