import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Modal, PrimaryBtn } from "../shared/ui";
import { createInventoryItems } from "../../lib/api";
import { ITEM_TYPES } from "../../lib/rxConstants";
import { currency } from "../../lib/format";

const FIELD_ALIASES = {
  type: ["type", "item type", "category"],
  brand: ["brand", "brand name", "make"],
  model: ["model", "model name", "model number", "product"],
  sku: ["sku", "code", "color code", "item code"],
  price: ["price", "mrp", "selling price", "rate"],
  stock: ["stock", "qty", "quantity", "in stock", "count"],
  low: ["low", "low stock", "low stock at", "reorder level", "min stock"],
  hsnCode: ["hsn", "hsn code"],
};

const TEMPLATE_HEADERS = ["Type", "Brand", "Model", "SKU", "Price", "Stock", "Low Stock At", "HSN Code"];
const TEMPLATE_SAMPLE = ["Frame", "Ray-Ban", "RB2140", "FR-1001", 2000, 10, 3, "9004"];

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

function parseRows(rawRows) {
  if (!rawRows.length) return [];
  const fieldMap = buildFieldMap(Object.keys(rawRows[0]));
  return rawRows.map((row) => {
    const get = (f) => (fieldMap[f] != null ? row[fieldMap[f]] : undefined);
    const brand = String(get("brand") ?? "").trim();
    const model = String(get("model") ?? "").trim();
    const price = toNumber(get("price"));
    const stock = toNumber(get("stock"));
    const low = toNumber(get("low"));
    const item = {
      type: resolveType(get("type")),
      brand,
      model,
      sku: String(get("sku") ?? "").trim(),
      price,
      stock,
      low: low != null ? low : 3,
      hsnCode: String(get("hsnCode") ?? "").trim(),
    };
    const errors = [];
    if (!brand) errors.push("brand");
    if (!model) errors.push("model");
    if (price == null) errors.push("price");
    if (stock == null) errors.push("stock");
    return { item, valid: errors.length === 0, errors };
  });
}

export default function ImportExcelModal({ branchId, onClose, onImported }) {
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
          setRows(parseRows(rawRows));
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

  const handleImport = async () => {
    setImporting(true);
    setError("");
    try {
      const saved = await createInventoryItems(branchId, validRows.map((r) => r.item));
      onImported(saved);
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
            Upload a spreadsheet with columns like Type, Brand, Model, SKU, Price, Stock — one row per item.
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
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} disabled={parsing} />
          </label>
          {error && <p className="text-[11px] text-warn mt-2">{error}</p>}
        </>
      ) : (
        <>
          <p className="text-xs text-slate mb-1 truncate">{fileName}</p>
          <p className="text-sm font-medium text-ink mb-3">
            {validRows.length} item{validRows.length === 1 ? "" : "s"} ready to import
            {invalidCount > 0 && <span className="text-warn"> · {invalidCount} skipped</span>}
          </p>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border mb-3">
            {rows.map((r, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                {r.valid ? (
                  <CheckCircle2 size={13} className="text-lens flex-shrink-0" />
                ) : (
                  <AlertTriangle size={13} className="text-warn flex-shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate text-ink">
                  {r.item.brand || "—"} {r.item.model || ""}
                </span>
                {r.valid ? (
                  <span className="text-slate font-mono flex-shrink-0">
                    {r.item.stock} @ {currency(r.item.price)}
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
