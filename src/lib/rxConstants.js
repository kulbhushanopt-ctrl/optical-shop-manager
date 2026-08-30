export const LENS_TYPES = ["Single Vision", "Bifocal", "Progressive"];
export const COATINGS = ["Blue Cut", "Hard Coat"];
export const LENS_INDEXES = ["1.50", "1.56", "1.59", "1.60", "1.67", "1.74"];
export const TINTS = ["Clear", "Photochromatic"];

// Contact lens material/fit category for a patient's contact lens
// prescription -- RGP = Rigid Gas Permeable, the standard clinical term.
export const CONTACT_LENS_TYPES = ["Soft", "RGP", "Scleral"];
export const CONTACT_LENS_DURATIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];

// Signed, two-decimal power string in the same format parseRxPower/parseRxAdd
// produce (e.g. "-2.00", "+0.75", "+0.00") -- keeps dropdown option values in
// sync with whatever a voice/AI-scanned power gets normalized to.
function formatPower(n) {
  return n < 0 ? n.toFixed(2) : `+${n.toFixed(2)}`;
}

function powerRangeAscending(min, max, step = 0.25) {
  const out = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(formatPower(Math.round(v * 100) / 100));
  return out;
}

// Standard 0.25 D steps for the sphere/cylinder/add power dropdowns in the
// prescription form, low to high.
export const SPHERE_POWERS = powerRangeAscending(-20, 20);
export const CYL_POWERS = powerRangeAscending(-10, 10);
export const ADD_POWERS = powerRangeAscending(0.5, 4);

function integerRange(min, max) {
  const out = [];
  for (let v = min; v <= max; v++) out.push(String(v));
  return out;
}

// Typical adult pupillary distance range (mm), low to high, for the PD
// dropdown -- 65mm is the common average, used as the centered starting
// point below.
export const PD_OPTIONS = integerRange(55, 75);

// A mobile <select>'s native picker opens scrolled to whatever option is
// currently selected. Putting the blank "not chosen yet" placeholder right
// next to a sensible middle value (0.00 for sphere/cyl, 65mm for PD)
// instead of at the very start of the list means opening an empty field
// lands the picker right in the middle -- that value in view, lower
// options one swipe up, higher ones one swipe down -- rather than at
// whichever end the list happens to start.
export function withBlankCentered(options, centerValue = formatPower(0)) {
  const idx = options.indexOf(centerValue);
  if (idx === -1) return ["", ...options];
  return [...options.slice(0, idx), "", ...options.slice(idx)];
}

// Standard Snellen visual-acuity notation, best to worst, plus the below-chart
// readings used once acuity drops too low to read letters.
export const VA_OPTIONS = ["6/4", "6/5", "6/6", "6/9", "6/12", "6/18", "6/24", "6/36", "6/60", "CF", "HM", "PL", "NPL"];

// Keeps a select's currently-stored value selectable even if it falls
// outside the standard list -- e.g. very high power, or a free-typed/
// AI-scanned value from before this dropdown existed. Rather than silently
// showing blank, the odd value is added as its own option.
export function withCurrentValue(options, value) {
  if (!value || options.includes(value)) return options;
  return [value, ...options];
}

export const ITEM_TYPES = [
  { id: "frame", label: "Frames" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "lens", label: "Lenses" },
  { id: "contact", label: "Contact Lenses" },
  { id: "accessory", label: "Accessories" },
];

export const itemTypeLabel = (id) => ITEM_TYPES.find((t) => t.id === id)?.label || id;

export const uid = () => Math.random().toString(36).slice(2, 10);

// Frame sub-categories -- gender x material x tier -- used to give frames a
// more specific SKU prefix than the broad "FR" every frame otherwise shares
// (e.g. "LM" for Ladies Metal, "GSX" for Gents Sheet Exclusive). The
// category id doubles as its SKU prefix.
export const FRAME_CATEGORIES = [
  { id: "LM", label: "Ladies Metal" },
  { id: "LMX", label: "Ladies Metal (Exclusive)" },
  { id: "LS", label: "Ladies Sheet" },
  { id: "LSX", label: "Ladies Sheet (Exclusive)" },
  { id: "LF", label: "Ladies Frameless" },
  { id: "GM", label: "Gents Metal" },
  { id: "GMX", label: "Gents Metal (Exclusive)" },
  { id: "GS", label: "Gents Sheet" },
  { id: "GSX", label: "Gents Sheet (Exclusive)" },
  { id: "GF", label: "Gents Frameless" },
  { id: "KB", label: "Kids Boys" },
  { id: "KBX", label: "Kids Boys (Exclusive)" },
  { id: "KG", label: "Kids Girls" },
  { id: "KGX", label: "Kids Girls (Exclusive)" },
  { id: "SG", label: "Sunglasses" },
  { id: "NB", label: "Non-Branded" },
];

export const frameCategoryLabel = (id) => FRAME_CATEGORIES.find((c) => c.id === id)?.label || id;

// Free-text category detection -- shared by voice/text commands and Excel
// import, since neither can rely on getting an exact category code like
// "LM" typed/spoken; both need to map loose phrasing ("gents metal",
// "ladies sheet") onto the right code.
export function normalizeSpeechForCategory(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\bgiants?\b/g, "gents")
    .replace(/\bmen'?s?\b/g, "gents")
    .replace(/\bwomen'?s?\b/g, "ladies")
    .replace(/\bladys?\b/g, "ladies");
}

export function detectCategoryFromText(text) {
  const norm = normalizeSpeechForCategory(text);
  let best = null;
  let bestWordCount = 0;
  for (const cat of FRAME_CATEGORIES) {
    const words = cat.label.toLowerCase().replace(/[()]/g, "").split(/\s+/).filter(Boolean);
    if (words.every((w) => norm.includes(w)) && words.length > bestWordCount) {
      best = cat.id;
      bestWordCount = words.length;
    }
  }
  return best;
}

// A cell/field's category text is often an exact code already ("GMX",
// any case) rather than a full phrase -- try that first, then fall back to
// the loose free-text match above.
export function resolveCategoryValue(raw) {
  const norm = String(raw ?? "").trim();
  if (!norm) return "";
  const byCode = FRAME_CATEGORIES.find((c) => c.id.toLowerCase() === norm.toLowerCase());
  if (byCode) return byCode.id;
  return detectCategoryFromText(norm) || "";
}

const SKU_PREFIXES = { frame: "FR", sunglasses: "SG", lens: "LN", contact: "CL", accessory: "AC" };

// Finds the highest existing "<prefix>-<number>" SKU for this item type (or
// frame category -- categoryOrType can be either) and suggests the next
// one, so nobody has to remember or scroll through stock to find where
// numbering left off. Keeps at least 3-digit padding (FR-001, LM-001) but
// grows naturally past 999 without truncating. `extraSkus` lets a caller
// fold in SKUs not yet saved to inventory (e.g. other rows in an unsaved
// scan batch) so suggestions within one batch don't collide with each
// other.
export function suggestNextSku(categoryOrType, inventory, extraSkus) {
  const prefix = SKU_PREFIXES[categoryOrType] || categoryOrType || "SKU";
  const pattern = new RegExp(`^${prefix}-?(\\d+)$`, "i");
  let max = 0;
  const skus = [...(inventory || []).map((item) => item.sku), ...(extraSkus || [])];
  for (const sku of skus) {
    const m = (sku || "").trim().match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  const width = Math.max(3, String(next).length);
  return `${prefix}-${String(next).padStart(width, "0")}`;
}
