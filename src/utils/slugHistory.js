/**
 * Slug history so renamed products and categories keep working for old links
 * and search engines.
 *
 * Rules:
 *  - A slug only changes when an explicit new slug is requested. Editing a title
 *    never rewrites the URL.
 *  - When the slug does change, the old one is remembered in previousSlugs.
 *  - The current slug is never listed in previousSlugs.
 */
function planSlugChange({ currentSlug, nextSlug, previousSlugs = [] }) {
  const history = previousSlugs.filter((s) => s && s !== nextSlug);

  if (!nextSlug || nextSlug === currentSlug) {
    return { slug: undefined, previousSlugs: history };
  }

  const withOld =
    currentSlug && !history.includes(currentSlug) ? [...history, currentSlug] : history;

  return { slug: nextSlug, previousSlugs: withOld };
}

module.exports = { planSlugChange };
