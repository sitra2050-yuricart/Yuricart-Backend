/** Escapes text so it can be used literally inside a regular expression. */
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_WORDS = 5;

/**
 * Mongo filter for search-as-you-type: every typed word must start a word in the
 * title (or start the SKU), so "desk" finds "HP DeskJet". Returns null when there is
 * nothing to search for.
 */
function buildSuggestFilter(q) {
  const words = String(q || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_WORDS)
    .map(escapeRegex);

  if (!words.length) return null;

  return {
    status: "active",
    $and: words.map((word) => ({
      $or: [
        { title: { $regex: `(^|[^a-z0-9])${word}`, $options: "i" } },
        { sku: { $regex: `^${word}`, $options: "i" } },
      ],
    })),
  };
}

module.exports = { escapeRegex, buildSuggestFilter };
