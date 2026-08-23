import React, { useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "../shared/ui";
import { currency } from "../../lib/format";
import BarcodeSvg from "../shared/BarcodeSvg";
import { FRAME_CATEGORIES, ITEM_TYPES, itemTypeLabel, frameCategoryLabel, suggestNextSku } from "../../lib/rxConstants";

const NON_FRAME_TYPES = ITEM_TYPES.filter((t) => t.id !== "frame");
const ALL_CATEGORIES = [
  ...FRAME_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  ...NON_FRAME_TYPES.map((t) => ({ id: t.id, label: itemTypeLabel(t.id) })),
];

// Matches a standard thermal label-printer roll (e.g. the small flag-style
// jewelry/price tags shops already use) instead of a regular sheet of
// paper -- each label becomes its own printed "page" at this exact size.
const LABEL_WIDTH = "4in";
const LABEL_HEIGHT = "0.5in";

function printLabelPage() {
  const style = document.createElement("style");
  style.textContent = `@page { size: ${LABEL_WIDTH} ${LABEL_HEIGHT}; margin: 0; }`;
  document.head.appendChild(style);
  const cleanup = () => {
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

function LabelStrip({ shopName, primary, sku, price, isLast }) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-3 overflow-hidden"
      style={{
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        breakAfter: isLast ? "auto" : "page",
        pageBreakAfter: isLast ? "auto" : "always",
      }}
    >
      <div className="text-left max-w-[1.6in]">
        {shopName && <p className="text-[7px] leading-tight text-ink truncate">{shopName}</p>}
        <p className="text-[9px] leading-tight font-semibold text-ink truncate">{primary}</p>
        {price != null && <p className="text-[9px] leading-tight font-semibold text-ink">{currency(price)}</p>}
      </div>
      <BarcodeSvg value={sku} height={24} width={1} fontSize={7} />
    </div>
  );
}

export default function PrintLabelsModal({ inventory, shopName, onClose }) {
  const [mode, setMode] = useState("inventory");

  const eligible = inventory.filter((i) => i.sku && i.sku.trim());
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => (prev.size === eligible.length ? new Set() : new Set(eligible.map((i) => i.id))));
  };

  const selectedItems = eligible.filter((i) => selected.has(i.id));

  const [categoryQtys, setCategoryQtys] = useState({});
  const [blankPrice, setBlankPrice] = useState("");
  const [blankLabels, setBlankLabels] = useState([]);

  const setCategoryQty = (id, qty) => setCategoryQtys((prev) => ({ ...prev, [id]: qty }));

  const totalRequestedQty = Object.values(categoryQtys).reduce((sum, q) => sum + (Math.max(0, Number(q) || 0)), 0);

  // Each category has its own SKU prefix (LM, LS, GM, ...), so generating a
  // batch across several categories at once still gives every category its
  // own independent, continuing number sequence -- LM and LS never share a
  // counter just because they were generated together.
  const generateBlankLabels = () => {
    const price = blankPrice ? Number(blankPrice) : null;
    const labels = [];
    const skusSoFar = [];
    for (const cat of ALL_CATEGORIES) {
      const qty = Math.max(0, Math.min(100, Number(categoryQtys[cat.id]) || 0));
      for (let i = 0; i < qty; i++) {
        const sku = suggestNextSku(cat.id, inventory, skusSoFar);
        skusSoFar.push(sku);
        labels.push({ sku, category: cat.id, price });
      }
    }
    setBlankLabels(labels);
  };

  const printCount = mode === "inventory" ? selectedItems.length : blankLabels.length;

  return (
    <Modal title="Print barcode labels" onClose={onClose} wide>
      <div className="no-print flex gap-2 mb-4 rounded-xl bg-cream p-1">
        <button
          type="button"
          onClick={() => setMode("inventory")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === "inventory" ? "bg-paper text-ink shadow-sm" : "text-slate"}`}
        >
          From inventory
        </button>
        <button
          type="button"
          onClick={() => setMode("blank")}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${mode === "blank" ? "bg-paper text-ink shadow-sm" : "text-slate"}`}
        >
          Blank labels (before stock arrives)
        </button>
      </div>

      {mode === "inventory" ? (
        eligible.length === 0 ? (
          <p className="text-xs text-slate">No items with a SKU yet — add a SKU to an item first so it has something to encode.</p>
        ) : (
          <div className="no-print">
            <button type="button" onClick={toggleAll} className="text-xs font-medium text-lens mb-2">
              {selected.size === eligible.length ? "Deselect all" : "Select all"}
            </button>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border mb-4">
              {eligible.map((item) => (
                <label key={item.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                  <span className="flex-1 min-w-0 truncate text-ink">
                    {item.brand} {item.model}
                  </span>
                  <span className="text-slate font-mono flex-shrink-0">{item.sku}</span>
                </label>
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="no-print">
          <p className="text-xs text-slate mb-3">
            Enter how many labels you need per category. Each category keeps its own SKU numbering (LM, LS, GM...), so they
            never overlap. Print now, stick one on each frame, and later when you add it to inventory, scan the label to fill
            in the SKU instantly.
          </p>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border mb-3">
            {ALL_CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <span className="flex-1 min-w-0 truncate text-ink">{cat.label}</span>
                <span className="text-slate font-mono flex-shrink-0">{cat.id}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0"
                  value={categoryQtys[cat.id] || ""}
                  onChange={(e) => setCategoryQty(cat.id, e.target.value)}
                  className="w-14 rounded-lg border border-border bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-lens focus:ring-2 focus:ring-lens/15"
                />
              </div>
            ))}
          </div>
          <input
            type="number"
            min={0}
            value={blankPrice}
            onChange={(e) => setBlankPrice(e.target.value)}
            placeholder="Price to print on label (optional)"
            className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-lens focus:ring-2 focus:ring-lens/15 mb-3"
          />
          <button
            type="button"
            onClick={generateBlankLabels}
            disabled={totalRequestedQty === 0}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-lens border border-lens disabled:opacity-50 mb-4"
          >
            Generate {totalRequestedQty || ""} label{totalRequestedQty === 1 ? "" : "s"}
          </button>
        </div>
      )}

      {(mode === "inventory" ? selectedItems.length > 0 : blankLabels.length > 0) && (
        <button
          type="button"
          onClick={printLabelPage}
          className="no-print w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 mb-1 bg-lens"
        >
          <Printer size={15} /> Print {printCount} label{printCount === 1 ? "" : "s"}
        </button>
      )}

      {mode === "inventory" && selectedItems.length > 0 && (
        <div id="print-area" className="flex flex-col gap-1 mt-4 overflow-x-auto">
          {selectedItems.map((item, i) => (
            <div key={item.id} className="border border-border rounded">
              <LabelStrip
                shopName={shopName}
                primary={`${item.brand} ${item.model}`}
                sku={item.sku}
                price={item.price}
                isLast={i === selectedItems.length - 1}
              />
            </div>
          ))}
        </div>
      )}

      {mode === "blank" && blankLabels.length > 0 && (
        <div id="print-area" className="flex flex-col gap-1 mt-4 overflow-x-auto">
          {blankLabels.map((label, i) => (
            <div key={label.sku} className="border border-border rounded">
              <LabelStrip
                shopName={shopName}
                primary={frameCategoryLabel(label.category) !== label.category ? frameCategoryLabel(label.category) : itemTypeLabel(label.category)}
                sku={label.sku}
                price={label.price}
                isLast={i === blankLabels.length - 1}
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
