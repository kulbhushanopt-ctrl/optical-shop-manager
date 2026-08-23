import React, { useState } from "react";
import { Camera, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Modal, TextInput, Select, PrimaryBtn } from "../shared/ui";
import CameraCapture from "../shared/CameraCapture";
import { scanStockList, createInventoryItems } from "../../lib/api";
import { ITEM_TYPES, FRAME_CATEGORIES, uid, suggestNextSku } from "../../lib/rxConstants";

// The AI's model-number reading turned out unreliable enough (easy to
// misread off a tiny engraving) that it's better left blank than wrong --
// only brand is trusted from the scan; model stays empty for the shopkeeper
// to type in by hand if/when they want it. When a batch category/price was
// set up front, they're applied here so every row arrives ready to save.
function rowFromScan(r, batchCategory, batchPrice) {
  return {
    localId: uid(),
    brand: r.brand || "",
    model: "",
    sku: "",
    category: batchCategory || "",
    type: "frame",
    quantity: r.quantity != null ? String(r.quantity) : "1",
    price: r.price != null ? String(r.price) : batchPrice || "",
  };
}

export default function ScanStockListModal({ branchId, inventory, onClose, onImported }) {
  const [showCamera, setShowCamera] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [batchCategory, setBatchCategory] = useState("");
  const [batchPrice, setBatchPrice] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Photo taken -- but instead of scanning right away, ask once for the
  // category and price that apply to this whole batch, so there's no
  // ambiguity later about which category each row belongs to and no need
  // to set price on every row individually.
  const handlePhotoTaken = (photo) => {
    setShowCamera(false);
    setPendingPhoto(photo);
  };

  const handleScanPhoto = async () => {
    const photo = pendingPhoto;
    setPendingPhoto(null);
    setScanning(true);
    setScanNotice("");
    try {
      const result = await scanStockList(photo, branchId);
      if (result?.error === "not_configured") {
        setScanNotice(result.message || "AI stock-list scanning isn't set up yet.");
      } else if (result?.error) {
        // The free Gemini tier caps requests per day -- this shows up
        // identically across every AI feature, so it's worth a distinct,
        // actionable message instead of a generic "try a clearer shot"
        // that would just send someone down the wrong troubleshooting path.
        const quotaHit = /quota|resource_exhausted|429/i.test(result.message || "");
        setScanNotice(
          quotaHit
            ? "AI usage limit reached for today — please try again later, or add these items manually for now."
            : "Couldn't read that photo — please try a clearer shot."
        );
      } else {
        // Each row gets its own SKU under the shared category so a batch of
        // ten frames doesn't all land on the same "LM-001" number.
        const skusSoFar = [];
        const scanned = (result?.rows || []).map((r) => {
          const row = rowFromScan(r, batchCategory, batchPrice);
          if (batchCategory) {
            row.sku = suggestNextSku(batchCategory, inventory, skusSoFar);
            skusSoFar.push(row.sku);
          }
          return row;
        });
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

  // Generates the next SKU for this row's category, avoiding collisions
  // with both existing inventory and any other row in this same batch that
  // already has a SKU under that prefix (so scanning ten "Ladies Metal"
  // frames in one photo gets LM-001, LM-002, ... instead of all landing on
  // LM-001).
  const generateSku = (row) => {
    if (!row.category) return;
    const siblingSkus = rows.filter((r) => r.localId !== row.localId).map((r) => r.sku);
    updateRow(row.localId, { sku: suggestNextSku(row.category, inventory, siblingSkus) });
  };

  const validRows = (rows || []).filter((r) => r.brand.trim());

  const saveAll = async () => {
    setSaving(true);
    setError("");
    try {
      const items = validRows.map((r) => ({
        type: r.type,
        category: r.category || null,
        brand: r.brand.trim(),
        model: r.model.trim(),
        sku: (r.sku || r.model).trim(),
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
        pendingPhoto ? (
          <>
            <p className="text-xs text-slate mb-3">
              Photo captured. Pick the category and price for this whole batch — every frame the scan finds will use
              these, so there's no per-row guesswork. You can still fix an individual row afterward if one's different.
            </p>
            <div className="mb-3">
              <Select value={batchCategory} onChange={(e) => setBatchCategory(e.target.value)}>
                <option value="">— No category —</option>
                {FRAME_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </div>
            <div className="mb-4">
              <TextInput
                type="number"
                value={batchPrice}
                onChange={(e) => setBatchPrice(e.target.value)}
                placeholder="Price per frame"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingPhoto(null);
                  setShowCamera(true);
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-slate"
              >
                Retake photo
              </button>
              <div className="flex-1">
                <PrimaryBtn full onClick={handleScanPhoto}>Scan now</PrimaryBtn>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate mb-3">
              Photograph a handwritten or printed stock list, or just the physical frames themselves laid out on a tray —
              AI reads the brand/model off either one (from the temple engraving on real frames) for you to review before
              adding.
            </p>
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={scanning}
              className="w-full py-2.5 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {scanning ? "Reading photo…" : "Scan list or frames"}
              {!scanning && <Sparkles size={12} />}
            </button>
            {scanNotice && <p className="text-[11px] text-slate mt-2">{scanNotice}</p>}
            {showCamera && <CameraCapture onCapture={handlePhotoTaken} onClose={() => setShowCamera(false)} />}
          </>
        )
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
                <div className="grid grid-cols-4 gap-2 items-center mb-2">
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
                {r.type === "frame" && (
                  <div className="grid grid-cols-4 gap-2 items-center mb-2">
                    <div className="col-span-2">
                      <Select value={r.category} onChange={(e) => updateRow(r.localId, { category: e.target.value })}>
                        <option value="">— No category —</option>
                        {FRAME_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <TextInput value={r.sku} onChange={(e) => updateRow(r.localId, { sku: e.target.value })} placeholder="SKU" />
                    </div>
                  </div>
                )}
                {r.type === "frame" && r.category && (
                  <button onClick={() => generateSku(r)} className="text-[11px] font-medium text-lens flex items-center gap-1 mb-2">
                    <Wand2 size={11} /> Generate SKU from category
                  </button>
                )}
                {!r.brand.trim() ? (
                  <p className="text-[10px] text-warn mt-1.5">Brand is required to add this row.</p>
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
