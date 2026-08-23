import React, { useState, useRef } from "react";
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

// This is a fold-in-half tag: the full printed strip is 6cm long, but the
// shop physically folds it at the 3cm center mark so it ends up as a 3cm
// tag with the barcode on one face and the shop/item details on the other.
// Content must stay inside its own 3cm half and never straddle the center
// -- anything crossing that line gets torn right through the fold crease.
const LABEL_WIDTH = "6cm";
const LABEL_HEIGHT = "1.2cm";
const HALF_WIDTH = "3cm";

// The barcode is rendered internally at a fixed module width, then scaled
// via CSS to exactly fill whatever room its half has -- since a 3cm column
// is extremely tight, this uses every available bit of width instead of a
// guessed fixed size that could either overflow a long SKU or waste space
// on a short one.
const BARCODE_STYLE = { width: "100%", height: "auto", display: "block" };

function LabelStrip({ shopName, primary, sku, price }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden" style={{ width: LABEL_WIDTH, height: LABEL_HEIGHT }}>
      <div className="flex flex-col items-center justify-center text-center px-1 overflow-hidden" style={{ width: HALF_WIDTH }}>
        {shopName && <p className="text-[7px] leading-tight text-ink truncate w-full">{shopName}</p>}
        <p className="text-[9px] leading-tight font-semibold text-ink truncate w-full">{primary}</p>
        {price != null && <p className="text-[9px] leading-tight font-semibold text-ink">{currency(price)}</p>}
      </div>
      <div className="flex items-center justify-center overflow-hidden px-1" style={{ width: HALF_WIDTH }}>
        <BarcodeSvg value={sku} height={30} width={2} fontSize={8} style={BARCODE_STYLE} />
      </div>
    </div>
  );
}

// Printing straight from the on-page DOM (via window.print() + a visibility
// hack) turned out to be fragile at this label's real size: the modal
// wrapping the preview adds its own margin/border/positioning context, and
// with a page only 0.5in tall even a few stray pixels of that leaking in is
// enough to push content past the page boundary and confuse the browser's
// pagination -- which is what caused the same label to print over and over
// instead of advancing to the next one. Printing in a completely separate,
// bare window sidesteps all of that: nothing exists in that document except
// the labels themselves, so there's no ambient CSS left to interfere.
function printLabelsInNewWindow(labels, svgEls) {
  const printWindow = window.open("", "_blank", "width=420,height=200");
  if (!printWindow) {
    alert("Please allow pop-ups for this site to print labels.");
    return;
  }
  const doc = printWindow.document;
  doc.open();
  doc.write("<!DOCTYPE html><html><head><title>Print labels</title></head><body></body></html>");
  doc.close();

  const style = doc.createElement("style");
  style.textContent = `
    @page { size: ${LABEL_WIDTH} ${LABEL_HEIGHT}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .label {
      width: ${LABEL_WIDTH};
      height: ${LABEL_HEIGHT};
      display: grid;
      grid-template-columns: ${HALF_WIDTH} ${HALF_WIDTH};
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .label:last-child { page-break-after: auto; break-after: auto; }
    .text {
      width: ${HALF_WIDTH};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 4px;
      overflow: hidden;
    }
    .text p { margin: 0; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .shop { font-size: 7px; }
    .primary { font-size: 9px; font-weight: 600; }
    .price { font-size: 9px; font-weight: 600; }
    .barcode-cell {
      width: ${HALF_WIDTH};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 0 4px;
    }
  `;
  doc.head.appendChild(style);

  labels.forEach((label, i) => {
    const div = doc.createElement("div");
    div.className = "label";

    const textDiv = doc.createElement("div");
    textDiv.className = "text";
    if (label.shopName) {
      const p = doc.createElement("p");
      p.className = "shop";
      p.textContent = label.shopName;
      textDiv.appendChild(p);
    }
    const primaryP = doc.createElement("p");
    primaryP.className = "primary";
    primaryP.textContent = label.primary;
    textDiv.appendChild(primaryP);
    if (label.priceText) {
      const priceP = doc.createElement("p");
      priceP.className = "price";
      priceP.textContent = label.priceText;
      textDiv.appendChild(priceP);
    }
    div.appendChild(textDiv);

    const barcodeCell = doc.createElement("div");
    barcodeCell.className = "barcode-cell";
    if (svgEls[i]) barcodeCell.appendChild(svgEls[i].cloneNode(true));
    div.appendChild(barcodeCell);

    doc.body.appendChild(div);
  });

  printWindow.focus();
  // The popup needs a tick to finish laying out the freshly-inserted DOM
  // before print() captures it, otherwise some browsers print a blank page.
  setTimeout(() => printWindow.print(), 150);
}

export default function PrintLabelsModal({ inventory, shopName, onClose }) {
  const [mode, setMode] = useState("inventory");
  const previewRef = useRef(null);

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

  const handlePrint = () => {
    const svgEls = previewRef.current ? Array.from(previewRef.current.querySelectorAll("svg")) : [];
    const labels =
      mode === "inventory"
        ? selectedItems.map((item) => ({
            shopName,
            primary: `${item.brand} ${item.model}`,
            priceText: item.price != null ? currency(item.price) : "",
          }))
        : blankLabels.map((label) => ({
            shopName,
            primary:
              frameCategoryLabel(label.category) !== label.category
                ? frameCategoryLabel(label.category)
                : itemTypeLabel(label.category),
            priceText: label.price != null ? currency(label.price) : "",
          }));
    printLabelsInNewWindow(labels, svgEls);
  };

  return (
    <Modal title="Print barcode labels" onClose={onClose} wide>
      <div className="flex gap-2 mb-4 rounded-xl bg-cream p-1">
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
          <div>
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
        <div>
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
          onClick={handlePrint}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 mb-1 bg-lens"
        >
          <Printer size={15} /> Print {printCount} label{printCount === 1 ? "" : "s"}
        </button>
      )}

      {mode === "inventory" && selectedItems.length > 0 && (
        <div ref={previewRef} className="flex flex-col gap-1 mt-4 overflow-x-auto">
          {selectedItems.map((item) => (
            <div key={item.id} className="border border-border rounded">
              <LabelStrip shopName={shopName} primary={`${item.brand} ${item.model}`} sku={item.sku} price={item.price} />
            </div>
          ))}
        </div>
      )}

      {mode === "blank" && blankLabels.length > 0 && (
        <div ref={previewRef} className="flex flex-col gap-1 mt-4 overflow-x-auto">
          {blankLabels.map((label) => (
            <div key={label.sku} className="border border-border rounded">
              <LabelStrip
                shopName={shopName}
                primary={frameCategoryLabel(label.category) !== label.category ? frameCategoryLabel(label.category) : itemTypeLabel(label.category)}
                sku={label.sku}
                price={label.price}
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
