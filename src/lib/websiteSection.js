// Where an item will appear on the Point 6 website. Mirrors the website's
// own sorting (point6-website: frontend/src/lib/catalog.js) so staff can see
// the result while adding stock.

const words = (s) => (s || "").toLowerCase().split(/[^a-z]+/);
const isSunWords = (w) => w.some((x) => ["sunglasses", "sunglass", "sun"].includes(x));

export function sectionOfLabel(label) {
  const w = words(label);
  if (w.some((x) => ["gents", "gent", "men", "mens", "male"].includes(x))) return "Men's eyewear";
  if (w.some((x) => ["ladies", "lady", "women", "womens", "female"].includes(x))) return "Women's eyewear";
  if (w.some((x) => x.startsWith("kid") || ["boys", "girls", "children"].includes(x))) return "Kids' eyewear";
  return null;
}

// Returns e.g. "Men's eyewear › Sunglasses", or null when the item would only
// appear under "All" on the website.
export function websiteSection(type, categoryLabel) {
  if (type === "contact") return "Contact lenses";
  if (type === "accessory") return "Accessories";
  if (type === "lens") return null;
  const w = words(categoryLabel);
  const sub = type === "sunglasses" || isSunWords(w) ? "Sunglasses" : "Eyeglasses";
  const section = sectionOfLabel(categoryLabel);
  if (section) return `${section} › ${sub}`;
  if (sub === "Sunglasses") return "Men's & Women's › Sunglasses (unisex)";
  return null;
}

const ORDER = ["Men's eyewear", "Women's eyewear", "Kids' eyewear"];

// Groups categories for the dropdown: Men's / Women's / Kids' / Other.
export function groupCategories(categories = []) {
  const groups = new Map(ORDER.map((g) => [g, []]));
  const other = [];
  categories.forEach((c) => {
    const g = sectionOfLabel(c.label);
    if (g) groups.get(g).push(c);
    else other.push(c);
  });
  const out = ORDER.map((g) => ({ label: g, items: groups.get(g) })).filter((g) => g.items.length);
  if (other.length) out.push({ label: "Other / unisex", items: other });
  return out;
}
