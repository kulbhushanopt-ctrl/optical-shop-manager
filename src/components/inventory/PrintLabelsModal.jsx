import React, { useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "../shared/ui";
import { currency } from "../../lib/format";
import BarcodeSvg from "../shared/BarcodeSvg";

export default function PrintLabelsModal({ inventory, onClose }) {
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

  return (
    <Modal title="Print barcode labels" onClose={onClose} wide>
      {eligible.length === 0 ? (
        <p className="text-xs text-slate">No items with a SKU yet — add a SKU to an item first so it has something to encode.</p>
      ) : (
        <>
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

            <button
              type="button"
              onClick={() => window.print()}
              disabled={selectedItems.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 mb-1 bg-lens"
            >
              <Printer size={15} /> Print {selectedItems.length} label{selectedItems.length === 1 ? "" : "s"}
            </button>
          </div>

          {selectedItems.length > 0 && (
            <div id="print-area" className="grid grid-cols-2 gap-2 mt-4">
              {selectedItems.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-2 flex flex-col items-center text-center">
                  <p className="text-[10px] font-semibold text-ink truncate w-full">
                    {item.brand} {item.model}
                  </p>
                  <BarcodeSvg value={item.sku} height={32} width={1.3} fontSize={9} />
                  <p className="text-[10px] text-slate">{currency(item.price)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
