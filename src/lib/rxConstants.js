export const LENS_TYPES = ["Single Vision", "Bifocal", "Progressive"];
export const COATINGS = ["Blue Cut", "Hard Coat"];
export const LENS_INDEXES = ["1.50", "1.56", "1.60", "1.67", "1.74"];
export const TINTS = ["Clear", "Photochromatic"];

// Signed, two-decimal power string in the same format parseRxPower/parseRxAdd
// produce (e.g. "-2.00", "+0.75", "+0.00") -- keeps dropdown option values in
// sync with whatever a voice/AI-scanned power gets normalized to.
function powerRange(min, max, step = 0.25) {
  const out = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    const n = Math.round(v * 100) / 100;
    out.push(n < 0 ? n.toFixed(2) : `+${n.toFixed(2)}`);
  }
  return out;
}

// Standard 0.25 D steps for the sphere/cylinder/add power dropdowns in the
// prescription form.
export const SPHERE_POWERS = powerRange(-20, 20);
export const CYL_POWERS = powerRange(-10, 10);
export const ADD_POWERS = powerRange(0.75, 4);

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

const SKU_PREFIXES = { frame: "FR", sunglasses: "SG", lens: "LN", contact: "CL", accessory: "AC" };

// Finds the highest existing "<prefix>-<number>" SKU for this item type and
// suggests the next one, so nobody has to remember or scroll through stock
// to find where numbering left off. Keeps at least 3-digit padding (FR-001)
// but grows naturally past 999 without truncating.
export function suggestNextSku(type, inventory) {
  const prefix = SKU_PREFIXES[type] || "SKU";
  const pattern = new RegExp(`^${prefix}-?(\\d+)$`, "i");
  let max = 0;
  for (const item of inventory || []) {
    const m = (item.sku || "").trim().match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  const width = Math.max(3, String(next).length);
  return `${prefix}-${String(next).padStart(width, "0")}`;
}
