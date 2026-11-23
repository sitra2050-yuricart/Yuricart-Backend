/** Trimmed, non-empty area names without case-insensitive duplicates. */
function cleanRegions(regions) {
  const seen = new Set();
  const out = [];
  for (const raw of regions || []) {
    const name = String(raw).trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Splits a delivery rule body into what to set and what to remove.
 * `freeAbove: null` means "no free-delivery threshold": the field is removed.
 * (Setting it to 0 would mean delivery is always free.)
 */
function splitShippingInput(input) {
  const set = { ...input };
  const unset = {};

  if ("freeAbove" in set && set.freeAbove === null) {
    delete set.freeAbove;
    unset.freeAbove = "";
  }
  if (Array.isArray(set.regions)) set.regions = cleanRegions(set.regions);
  if (typeof set.name === "string") set.name = set.name.trim();

  return { set, unset };
}

module.exports = { cleanRegions, splitShippingInput };
