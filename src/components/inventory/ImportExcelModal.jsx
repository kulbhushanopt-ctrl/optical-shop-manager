import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Modal, PrimaryBtn } from "../shared/ui";
import { notifyFilePickerOpening } from "../../hooks/useModalBackClose";
import { createInventoryItems, updateInventoryItem } from "../../lib/api";
import { ITEM_TYPES, resolveCategoryValue } from "../../lib/rxConstants";
import { currency } from "../../lib/format";

const FIELD_ALIASES = {
  type: ["type", "item type"],
  category: ["category", "frame category"],
  brand: ["brand", "brand name", "make"],
  model: ["model", "model name", "model number", "product"],
  sku: ["sku", "code", "color code", "item code"],
  price: ["price", "mrp", "selling price", "rate"],
  purchasePrice: ["purchase price", "purchase cost", "cost price", "cost"],
  stock: ["stock", "qty", "quantity", "in stock", "count"],
  low: ["low", "low stock", "low stock at", "reorder level", "min stock"],
  hsnCode: ["hsn", "hsn code"],
};

const TEMPLATE_HEADERS = ["Type", "Category", "Brand", "Model", "SKU", "Purchase Price", "Price", "Stock", "Low Stock At", "HSN Code"];
const TEMPLATE_SAMPLE = ["Frame", "Gents Metal", "Ray-Ban", "RB2140", "FR-1001", 1200, 2000, 10, 3, "9004"];

function normalizeHeader(h) {
  return String(h ?? "").trim().toLowerCase();
}

function resolveType(raw) {
  const norm = normalizeHeader(raw);
  if (!norm) return "frame";
  const byId = ITEM_TYPES.find((t) => t.id === norm);
  if (byId) return byId.id;
  const byLabel = ITEM_TYPES.find((t) => t.label.toLowerCase().replace(/s$/, "") === norm.replace(/s$/, ""));
  if (byLabel) return byLabel.id;
  if (norm.includes("sun")) return "sunglasses";
  if (norm.includes("contact")) return "contact";
  if (norm.includes("lens")) return "lens";
  if (norm.includes("access")) return "accessory";
  return "frame";
}

function toNumber(raw) {
  if (raw === "" || raw == null) return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function buildFieldMap(headers) {
  const map = {};
  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (!map[field] && aliases.includes(norm)) map[field] = h;
    }
  });
  return map;
}

function findMatch(item, existingInventory) {
  if (!item.sku) return null;
  const sku = item.sku.trim().toLowerCase();
  return existingInventory.find((inv) => inv.type === item.type && (inv.sku || "").trim().toLowerCase() === sku) || null;
}

function parseRows(rawRows, existingInventory, categories) {
  if (!rawRows.length) return [];
  const fieldMap = buildFieldMap(Object.keys(rawRows[0]));
  return rawRows.map((row) => {
    const get = (f) => (fieldMap[f] != null ? row[fieldMap[f]] : undefined);
    const type = resolveType(get("type"));
    const category = type === "frame" || type === "sunglasses" ? resolveCategoryValue(get("category"), categories) : "";
    const price = toNumber(get("price"));
    const purchasePrice = toNumber(get("purchasePrice"));
    const stock = toNumber(get("stock"));
    const low = toNumber(get("low"));
    const item = {
      type,
      category: category || null,
      brand: String(get("brand") ?? "").trim(),
      model: String(get("model") ?? "").trim(),
      sku: String(get("sku") ?? "").trim(),
      price,
      purchasePrice,
      stock: stock != null ? stock : 1,
      low: low != null ? low : 3,
      hsnCode: String(get("hsnCode") ?? "").trim(),
    };
    // Matches the same required-field rule as the manual Add Item form --
    // brand/model/stock are all optional there (stock defaults to 1), and
    // category is only required for frames.
    const errors = [];
    if (type === "frame" && !category) errors.push("category");
    if (price == null) errors.push("price");
    if (!item.sku) errors.push("sku");
    const match = errors.length === 0 ? findMatch(item, existingInventory) : null;
    return { item, valid: errors.length === 0, errors, match };
  });
}

export default function ImportExcelModal({ branchId, inventory, categories, onClose, onImported }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!rawRows.length) {
          setError("That file doesn't have any data rows.");
        } else {
          setRows(parseRows(rawRows, inventory, categories));
          setFileName(file.name);
        }
      } catch (err) {
        setError("Couldn't read that file — make sure it's a valid Excel or CSV file.");
      }
      setParsing(false);
    };
    reader.onerror = () => {
      setError("Couldn't read that file — please try again.");
      setParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, "inventory-import-template.xlsx");
  };

  const validRows = (rows || []).filter((r) => r.valid);
  const invalidCount = (rows || []).length - validRows.length;
  const toCreate = validRows.filter((r) => !r.match);
  const toUpdate = validRows.filter((r) => r.match);

  const handleImport = async () => {
    setImporting(true);
    setError("");
    try {
      const created = toCreate.length ? await createInventoryItems(branchId, toCreate.map((r) => r.item)) : [];

      // Matched rows restock an existing item (by SKU + type) instead of
      // creating a duplicate — adds to its current stock and refreshes the
      // price, leaving brand/model/SKU/HSN/low-stock threshold untouched.
      const updated = [];
      for (const r of toUpdate) {
        try {
          const saved = await updateInventoryItem(r.match.id, {
            ...r.match,
            stock: r.match.stock + r.item.stock,
            price: r.item.price,
          });
          updated.push(saved);
        } catch (e) {
          /* one row failing shouldn't block the rest of the import */
        }
      }

      onImported({ created, updated });
    } catch (err) {
      setError("Import failed — please try again.");
      setImporting(false);
    }
  };

  return (
    <Modal title="Import from Excel" onClose={onClose}>
      {!rows ? (
        <>
          <p className="text-xs text-slate mb-3">
            Upload a spreadsheet with columns like Type, Category, Brand, Model, SKU, Price, Stock — one row per item.
            Only Price and SKU are required (plus Category for frames); Stock defaults to 1 if left blank.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="w-full py-2.5 rounded-xl border border-dashed border-border text-slate text-xs font-semibold flex items-center justify-center gap-1.5 mb-3"
          >
            <Download size={14} /> Download a template
          </button>
          <label className="w-full py-2.5 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {parsing ? "Reading file…" : "Choose Excel or CSV file"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onClick={notifyFilePickerOpening}
              onChange={handleFile}
              disabled={parsing}
            />
          </label>
          {error && <p className="text-[11px] text-warn mt-2">{error}</p>}
        </>
      ) : (
        <>
          <p className="text-xs text-slate mb-1 truncate">{fileName}</p>
          <p className="text-sm font-medium text-ink mb-3">
            {toCreate.length} new · {toUpdate.length} restock{toUpdate.length === 1 ? "" : "s"}
            {invalidCount > 0 && <span className="text-warn"> · {invalidCount} skipped</span>}
          </p>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border mb-3">
            {rows.map((r, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                {r.valid ? (
                  r.match ? (
                    <RefreshCw size={13} className="text-focus flex-shrink-0" />
                  ) : (
                    <CheckCircle2 size={13} className="text-lens flex-shrink-0" />
                  )
                ) : (
                  <AlertTriangle size={13} className="text-warn flex-shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate text-ink">
                  {r.item.brand || "—"} {r.item.model || ""}
                </span>
                {r.valid ? (
                  <span className="text-slate font-mono flex-shrink-0">
                    {r.match ? `${r.match.stock} + ${r.item.stock} = ${r.match.stock + r.item.stock}` : r.item.stock} @ {currency(r.item.price)}
                  </span>
                ) : (
                  <span className="text-warn flex-shrink-0">missing {r.errors.join(", ")}</span>
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-[11px] text-warn mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRows(null)}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-slate"
            >
              Choose a different file
            </button>
            <div className="flex-1">
              <PrimaryBtn full disabled={validRows.length === 0 || importing} onClick={handleImport}>
                {importing ? "Importing…" : `Import ${validRows.length}`}
              </PrimaryBtn>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
