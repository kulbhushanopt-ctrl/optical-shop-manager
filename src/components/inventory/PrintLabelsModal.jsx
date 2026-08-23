import React, { useState } from "react";
import { Printer } from "lucide-react";
import { Modal, Select } from "../shared/ui";
import { currency } from "../../lib/format";
import BarcodeSvg from "../shared/BarcodeSvg";
import { FRAME_CATEGORIES, ITEM_TYPES, itemTypeLabel, suggestNextSku } from "../../lib/rxConstants";

const NON_FRAME_TYPES = ITEM_TYPES.filter((t) => t.id !== "frame");

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
    setBlankLabels(skus.map((sku) => ({ sku, price: blankPrice ? Number(blankPrice) : null })));
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
          onClick={() => window.print()}
          className="no-print w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 mb-1 bg-lens"
        >
          <Printer size={15} /> Print {printCount} label{printCount === 1 ? "" : "s"}
        </button>
      )}

      {mode === "inventory" && selectedItems.length > 0 && (
        <div id="print-area" className="grid grid-cols-2 gap-2 mt-4">
          {selectedItems.map((item) => (
            <div key={item.id} className="border border-border rounded-lg p-2 flex flex-col items-center text-center">
              {shopName && <p className="text-[8px] font-semibold text-slate truncate w-full">{shopName}</p>}
              <p className="text-[10px] font-semibold text-ink truncate w-full">
                {item.brand} {item.model}
              </p>
              <BarcodeSvg value={item.sku} height={32} width={1.3} fontSize={9} />
              <p className="text-[10px] font-semibold text-ink">{currency(item.price)}</p>
            </div>
          ))}
        </div>
      )}

      {mode === "blank" && blankLabels.length > 0 && (
        <div id="print-area" className="grid grid-cols-2 gap-2 mt-4">
          {blankLabels.map((label) => (
            <div key={label.sku} className="border border-border rounded-lg p-2 flex flex-col items-center text-center">
              {shopName && <p className="text-[8px] font-semibold text-slate truncate w-full">{shopName}</p>}
              <BarcodeSvg value={label.sku} height={32} width={1.3} fontSize={9} />
              {label.price != null && <p className="text-[10px] font-semibold text-ink">{currency(label.price)}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
