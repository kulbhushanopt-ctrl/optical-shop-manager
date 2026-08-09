export const LENS_TYPES = ["Single Vision", "Bifocal", "Progressive"];
export const COATINGS = ["Blue Cut", "Hard Coat"];
export const LENS_INDEXES = ["1.50", "1.56", "1.60", "1.67", "1.74"];
export const TINTS = ["Clear", "Photochromatic"];

export const ITEM_TYPES = [
  { id: "frame", label: "Frames" },
  { id: "sunglasses", label: "Sunglasses" },
  { id: "lens", label: "Lenses" },
  { id: "contact", label: "Contact Lenses" },
  { id: "accessory", label: "Accessories" },
];

export const itemTypeLabel = (id) => ITEM_TYPES.find((t) => t.id === id)?.label || id;

export const uid = () => Math.random().toString(36).slice(2, 10);
