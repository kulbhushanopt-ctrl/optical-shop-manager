import React, { useState } from "react";
import { Camera, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Modal, TextInput, Select, PrimaryBtn } from "../shared/ui";
import CameraCapture from "../shared/CameraCapture";
import { scanStockList, createInventoryItems } from "../../lib/api";
import { ITEM_TYPES, uid } from "../../lib/rxConstants";

// A scanned row's model/code doubles as both `model` and `sku` -- this
// shop's handwritten lists don't distinguish the two, the code is what
// both display and barcode lookup use.
function rowFromScan(r) {
  return {
    localId: uid(),
    brand: r.brand || "",
    model: r.model || "",
    type: "frame",
    quantity: r.quantity != null ? String(r.quantity) : "1",
    price: r.price != null ? String(r.price) : "",
  };
}

export default function ScanStockListModal({ branchId, onClose, onImported }) {
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleScanPhoto = async (photo) => {
    setShowCamera(false);
    setScanning(true);
    setScanNotice("");
    try {
      const result = await scanStockList(photo);
      if (result?.error === "not_configured") {
        setScanNotice(result.message || "AI stock-list scanning isn't set up yet.");
      } else if (result?.error) {
        setScanNotice("Couldn't read that photo — please try a clearer shot.");
      } else {
        const scanned = (result?.rows || []).map(rowFromScan);
        if (scanned.length === 0) {
          setScanNotice("Couldn't make out any rows in that photo — please try a clearer shot.");
        } else {
          setRows(scanned);
        }
      }
    } catch (err) {
      setScanNotice("Couldn't read that photo — please try a clearer shot.");
    }
    setScanning(false);
  };

  const updateRow = (localId, patch) => {
    setRows(rows.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  };
  const removeRow = (localId) => setRows(rows.filter((r) => r.localId !== localId));

  const validRows = (rows || []).filter((r) => r.brand.trim() && r.model.trim());

  const saveAll = async () => {
    setSaving(true);
    setError("");
    try {
      const items = validRows.map((r) => ({
        type: r.type,
        brand: r.brand.trim(),
        model: r.model.trim(),
        sku: r.model.trim(),
        price: Number(r.price) || 0,
        stock: Math.max(1, Number(r.quantity) || 1),
        low: 3,
      }));
      const created = await createInventoryItems(branchId, items);
      onImported(created);
    } catch (err) {
      setError("Couldn't save these items — please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Scan stock list" onClose={onClose} wide>
      {!rows ? (
        <>
          <p className="text-xs text-slate mb-3">
            Photograph a handwritten or printed stock list — brand, model/code, quantity, and price — and AI will read
            out every row for you to review before adding.
          </p>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={scanning}
            className="w-full py-2.5 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {scanning ? "Reading list…" : "Scan a stock list"}
            {!scanning && <Sparkles size={12} />}
          </button>
          {scanNotice && <p className="text-[11px] text-slate mt-2">{scanNotice}</p>}
          {showCamera && <CameraCapture onCapture={handleScanPhoto} onClose={() => setShowCamera(false)} />}
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-ink mb-3">
            {rows.length} row{rows.length === 1 ? "" : "s"} found — review before adding
          </p>
          <div className="flex flex-col gap-2 mb-4 max-h-[50vh] overflow-y-auto">
            {rows.map((r) => (
              <div key={r.localId} className="rounded-xl p-3 bg-card border border-border">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <TextInput value={r.brand} onChange={(e) => updateRow(r.localId, { brand: e.target.value })} placeholder="Brand" />
                  <TextInput value={r.model} onChange={(e) => updateRow(r.localId, { model: e.target.value })} placeholder="Model / code" />
                </div>
                <div className="grid grid-cols-4 gap-2 items-center">
                  <div className="col-span-2">
                    <Select value={r.type} onChange={(e) => updateRow(r.localId, { type: e.target.value })}>
                      {ITEM_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </Select>
                  </div>
                  <TextInput type="number" value={r.quantity} onChange={(e) => updateRow(r.localId, { quantity: e.target.value })} placeholder="Qty" />
                  <TextInput type="number" value={r.price} onChange={(e) => updateRow(r.localId, { price: e.target.value })} placeholder="Price" />
                </div>
                {!r.brand.trim() || !r.model.trim() ? (
                  <p className="text-[10px] text-warn mt-1.5">Brand and model are required to add this row.</p>
                ) : !r.price.trim() ? (
                  <p className="text-[10px] text-slate mt-1.5">No price read — will be added at ₹0, edit later.</p>
                ) : null}
                <button onClick={() => removeRow(r.localId)} className="text-[11px] font-medium text-warn flex items-center gap-1 mt-2">
                  <Trash2 size={11} /> Remove row
                </button>
              </div>
            ))}
          </div>
          {error && <p className="text-[11px] text-warn mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRows(null);
                setScanNotice("");
              }}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-slate"
            >
              Scan again
            </button>
            <div className="flex-1">
              <PrimaryBtn full disabled={validRows.length === 0 || saving} onClick={saveAll}>
                {saving ? "Adding…" : `Add ${validRows.length} item${validRows.length === 1 ? "" : "s"}`}
              </PrimaryBtn>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
