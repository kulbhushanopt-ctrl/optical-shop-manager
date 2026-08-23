import React, { useState } from "react";
import { Printer } from "lucide-react";
import { Modal, Select } from "../shared/ui";
import { currency } from "../../lib/format";
import BarcodeSvg from "../shared/BarcodeSvg";
import { FRAME_CATEGORIES, ITEM_TYPES, itemTypeLabel, frameCategoryLabel, suggestNextSku } from "../../lib/rxConstants";

const NON_FRAME_TYPES = ITEM_TYPES.filter((t) => t.id !== "frame");

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
      className="flex items-center gap-2 px-2 overflow-hidden"
      style={{
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        breakAfter: isLast ? "auto" : "page",
        pageBreakAfter: isLast ? "auto" : "always",
      }}
    >
      <div className="flex-1 min-w-0">
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

  const [blankCategory, setBlankCategory] = useState("");
  const [blankQty, setBlankQty] = useState(10);
  const [blankPrice, setBlankPrice] = useState("");
  const [blankLabels, setBlankLabels] = useState([]);

  const generateBlankLabels = () => {
    if (!blankCategory) return;
    const qty = Math.max(1, Math.min(100, Number(blankQty) || 1));
    const skus = [];
    for (let i = 0; i < qty; i++) skus.push(suggestNextSku(blankCategory, inventory, skus));
    setBlankLabels(skus.map((sku) => ({ sku, category: blankCategory, price: blankPrice ? Number(blankPrice) : null })));
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
            Generate a batch of fresh, not-yet-used SKUs and print their labels now. Stick one on each frame, and later when
            you add it to inventory, scan the label to fill in the SKU instantly.
          </p>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <Select value={blankCategory} onChange={(e) => setBlankCategory(e.target.value)}>
                <option value="">— Category —</option>
                <optgroup label="Frame category">
                  {FRAME_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Other item type">
                  {NON_FRAME_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{itemTypeLabel(t.id)}</option>
                  ))}
                </optgroup>
              </Select>
            </div>
            <input
              type="number"
              min={1}
              max={100}
              value={blankQty}
              onChange={(e) => setBlankQty(e.target.value)}
              className="w-20 rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-lens focus:ring-2 focus:ring-lens/15"
            />
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
            disabled={!blankCategory}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-lens border border-lens disabled:opacity-50 mb-4"
          >
            Generate {blankQty || 1} label{Number(blankQty) === 1 ? "" : "s"}
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
