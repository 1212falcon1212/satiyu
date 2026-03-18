/**
 * Maps category slug → icon image path.
 * Icons are sourced from meydankamp.com (with permission).
 * Root categories use .png, subcategories use .jpg.
 */

const ROOT_CATEGORIES = new Set([
  'dagcilik-is-guvenligi',
  'kamp',
  'fener',
  'giyim',
  'dalis-malzemeleri',
  'ayakkabi',
  'durbun-teleskop',
]);

// Special case: red-dot uses .png
const PNG_OVERRIDES = new Set(['red-dot']);

/**
 * Get the icon image path for a category slug.
 * Returns the path relative to /public, or null if no icon exists.
 */
export function getCategoryIconPath(slug: string): string | null {
  if (!slug) return null;
  const ext = ROOT_CATEGORIES.has(slug) || PNG_OVERRIDES.has(slug) ? 'png' : 'jpg';
  return `/icons/categories/${slug}.${ext}`;
}
