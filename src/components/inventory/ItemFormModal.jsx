import React, { Suspense, lazy, useRef, useState } from "react";
import { Eye, Droplet, Trash2, Barcode, Camera, ImagePlus, Loader2, X, Globe } from "lucide-react";
import { Modal, Field, VoiceInput, VoiceRxInput, TextInput, Select, PrimaryBtn } from "../shared/ui";
import { ITEM_TYPES, LENS_INDEXES, COATINGS, suggestNextSku } from "../../lib/rxConstants";
import { parseRxPower, parseRxAdd } from "../../lib/rxParse";
import { fetchLabelReservation, uploadProductPhoto } from "../../lib/api";
import { compressImageToBlob } from "../../lib/image";
import { websiteSection, groupCategories } from "../../lib/websiteSection";

// The barcode decoder library is large and only needed once someone
// actually opens the scanner, so it's split into its own chunk instead of
// bloating every page load.
const BarcodeScanner = lazy(() => import("../shared/BarcodeScanner"));

const CONTACT_DURATIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];
const CONTACT_TYPES = ["Spherical", "Toric", "Multifocal"];

// Pre-fills HSN code by item type so it doesn't have to be typed by hand
// every time -- only for the two codes this shop has actually been using
// consistently (9004, for both eyeglass frames and sunglasses); lens,
// contact, and accessory are left blank rather than guessing a tax code
// without confirmation. Never overwrites a value that's already there.
const HSN_DEFAULTS = { frame: "9004", sunglasses: "9004" };

const ITEM_PLACEHOLDERS = {
  frame: { brand: "Ray-Ban", model: "RB2140", sku: "FR-1001" },
  sunglasses: { brand: "Oakley", model: "Holbrook", sku: "SG-1001" },
  lens: { brand: "Essilor", model: "Varilux Progressive", sku: "LN-1001" },
  contact: { brand: "Acuvue", model: "Oasys", sku: "CL-1001" },
  accessory: { brand: "Optical Care", model: "Lens Cleaning Spray", sku: "AC-1001" },
};

const BLANK_ITEM = {
  type: "frame", category: "", brand: "", model: "", sku: "", price: "", purchasePrice: "", stock: "", low: 3,
  power: "", addPower: "", lensIndex: "", coatings: [],
  baseCurve: "", diameter: "", duration: "", contactType: "", hsnCode: "",
  photoUrl: "", showOnline: true, wholesalePrice: "", showWholesale: false,
};

// Product photo shown on the shop website. Uploads straight away on pick
// (so a slow upload doesn't hold up "Save"), and the URL is stored with the
// item when it's saved.
function PhotoPicker({ branchId, sku, value, onChange, onBusy }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !branchId) return;
    setErr("");
    setBusy(true);
    onBusy?.(true);
    try {
      const blob = await compressImageToBlob(file);
      const url = await uploadProductPhoto(branchId, blob, sku);
      onChange(url);
    } catch (x) {
      setErr("Couldn't upload that photo — please try again.");
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };

  return (
    <div className="mb-3">
      <p className="text-[11px] font-medium uppercase tracking-wide mb-1.5 text-slate">Photo (for website)</p>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-xl border border-border bg-paper flex items-center justify-center overflow-hidden flex-shrink-0 relative">
          {busy ? (
            <Loader2 size={18} className="animate-spin text-slate" />
          ) : value ? (
            <>
              <img src={value} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Remove photo"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <ImagePlus size={20} className="text-slate" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-ink text-white flex items-center gap-1.5 disabled:opacity-50">
            <Camera size={13} /> Take photo
          </button>
          <button type="button" disabled={busy} onClick={() => galleryRef.current?.click()} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-ink flex items-center gap-1.5 disabled:opacity-50">
            <ImagePlus size={13} /> From gallery
          </button>
        </div>
      </div>
      {err && <p className="text-[11px] text-warn mt-1">{err}</p>}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

export default function ItemFormModal({ title, initial, inventory, categories, branchId, onClose, onSave, onDelete, onFoundExisting }) {
  // `initial` may be a full existing item (editing) or a partial AI-parsed
  // prefill (voice add) -- merge over blank defaults either way so missing
  // fields (e.g. `low`, `coatings`) don't end up undefined.
  const [f, setF] = useState({ ...BLANK_ITEM, ...(initial || {}) });
  const [showScanner, setShowScanner] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const toggleCoating = (c) => {
    const coatings = f.coatings || [];
    setF({ ...f, coatings: coatings.includes(c) ? coatings.filter((x) => x !== c) : [...coatings, c] });
  };
  // Brand/model are often unknown yet when an item is created up front (a
  // bulk voice-add, or a scanned blank label) -- SKU and price are what
  // actually make a row usable, and category is what makes a frame's SKU
  // meaningful, so those are the only things required.
  const valid = (f.type !== "frame" || (f.category || "").trim()) && f.price !== "" && (f.sku || "").trim() && !photoBusy;

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-[11px] text-slate -mt-1 mb-3">
        Only {f.type === "frame" ? "Category, Price, and SKU are" : "Price and SKU are"} required — everything else is
        optional and can be filled in later.
      </p>
      <PhotoPicker branchId={branchId} sku={f.sku} value={f.photoUrl} onChange={(url) => setF((prev) => ({ ...prev, photoUrl: url }))} onBusy={setPhotoBusy} />
      <Field label="Type">
        <Select
          value={f.type}
          onChange={(e) => {
            const type = e.target.value;
            setF((prev) => ({ ...prev, type, hsnCode: prev.hsnCode || HSN_DEFAULTS[type] || prev.hsnCode }));
          }}
        >
          {ITEM_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </Select>
      </Field>

      {(f.type === "frame" || f.type === "sunglasses") && (
        <Field label={f.type === "frame" ? "Category" : "Category (choose Gents / Ladies / Kids Sunglasses)"}>
          <Select value={f.category || ""} onChange={(e) => set("category")(e.target.value)}>
            <option value="">— Choose category —</option>
            {groupCategories(categories || []).map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
      )}
      {(() => {
        const label = (categories || []).find((c) => c.id === f.category)?.label || "";
        const where = websiteSection(f.type, label);
        if (f.type === "lens") return null;
        return (
          <p
            className={`text-[11px] -mt-1 mb-3 px-3 py-2 rounded-lg ${where ? "bg-focusSoft text-ink" : "bg-warnSoft text-warn"}`}
            data-testid="website-section-hint"
          >
            {where ? (
              <>On the website: <b>{where}</b></>
            ) : (
              <>Choose a category so this shows under Men's, Women's or Kids' on the website.</>
            )}
          </p>
        );
      })()}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Brand"><VoiceInput value={f.brand} onChange={set("brand")} placeholder={ITEM_PLACEHOLDERS[f.type]?.brand || "Brand"} /></Field>
        <Field label="Model"><VoiceInput value={f.model} onChange={set("model")} placeholder={ITEM_PLACEHOLDERS[f.type]?.model || "Model"} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="SKU">
          <div className="flex gap-1.5">
            <div className="flex-1"><VoiceInput value={f.sku} onChange={set("sku")} placeholder={ITEM_PLACEHOLDERS[f.type]?.sku || "SKU-1001"} /></div>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-lensSoft text-lens"
              aria-label="Scan barcode"
            >
              <Barcode size={15} />
            </button>
          </div>
          {!initial?.id && !f.sku && inventory && (
            <button type="button" onClick={() => set("sku")(suggestNextSku(f.category || f.type, inventory))} className="text-[10px] text-lens mt-1">
              Use next: {suggestNextSku(f.category || f.type, inventory)}
            </button>
          )}
        </Field>
        <Field label="HSN code"><VoiceInput value={f.hsnCode || ""} onChange={set("hsnCode")} placeholder="9004" /></Field>
      </div>
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onDetect={async (code) => {
              setShowScanner(false);
              // Scanning a code that already belongs to an existing item
              // (e.g. one created by a previous scan-and-fill-in-later, or
              // a bulk voice-add) should open THAT item instead of
              // prepping a brand-new one with a duplicate SKU.
              if (!initial?.id && onFoundExisting) {
                const existing = (inventory || []).find((i) => i.sku === code);
                if (existing) {
                  onFoundExisting(existing);
                  return;
                }
              }
              setF((prev) => ({ ...prev, sku: code }));
              // If this code matches a printed "blank label" batch, recover
              // the category/price that were reserved for it too, instead
              // of only filling the SKU.
              if (!branchId) return;
              try {
                const reservation = await fetchLabelReservation(branchId, code);
                if (!reservation) return;
                setF((prev) => ({
                  ...prev,
                  category: prev.category || reservation.category || prev.category,
                  price: prev.price !== "" ? prev.price : reservation.price != null ? String(reservation.price) : prev.price,
                }));
              } catch (e) {
                /* no reservation, or fetch failed -- SKU is already filled, nothing else to do */
              }
            }}
            onClose={() => setShowScanner(false)}
          />
        </Suspense>
      )}

      {f.type === "lens" && (
        <div className="border-t border-dashed border-border pt-3 mt-1 mb-1">
          <p className="text-[11px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1 text-slate"><Eye size={12} /> Lens details</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Power"><VoiceRxInput value={f.power} onChange={set("power")} placeholder="-2.00" parse={parseRxPower} /></Field>
            <Field label="Add power"><VoiceRxInput value={f.addPower} onChange={set("addPower")} placeholder="+2.00" parse={parseRxAdd} /></Field>
          </div>
          <Field label="Index">
            <Select value={f.lensIndex} onChange={(e) => set("lensIndex")(e.target.value)}>
              <option value="">— Select —</option>
              {LENS_INDEXES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </Select>
          </Field>
          <Field label="Coating">
            <div className="flex gap-2 flex-wrap">
              {COATINGS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCoating(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    (f.coatings || []).includes(c) ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {f.type === "contact" && (
        <div className="border-t border-dashed border-border pt-3 mt-1 mb-1">
          <p className="text-[11px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1 text-slate"><Droplet size={12} /> Contact lens details</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Power"><VoiceRxInput value={f.power} onChange={set("power")} placeholder="-2.00" parse={parseRxPower} /></Field>
            <Field label="BC (mm)"><TextInput value={f.baseCurve} onChange={(e) => set("baseCurve")(e.target.value)} placeholder="8.6" /></Field>
            <Field label="DIA (mm)"><TextInput value={f.diameter} onChange={(e) => set("diameter")(e.target.value)} placeholder="14.2" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Duration">
              <Select value={f.duration} onChange={(e) => set("duration")(e.target.value)}>
                <option value="">— Select —</option>
                {CONTACT_DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={f.contactType} onChange={(e) => set("contactType")(e.target.value)}>
                <option value="">— Select —</option>
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Purchase price (optional)">
          <TextInput type="number" value={f.purchasePrice ?? ""} onChange={(e) => set("purchasePrice")(e.target.value)} placeholder="120" />
        </Field>
        <Field label="Price"><TextInput type="number" value={f.price} onChange={(e) => set("price")(e.target.value)} placeholder="189" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Stock"><TextInput type="number" value={f.stock} onChange={(e) => set("stock")(e.target.value)} placeholder="6" /></Field>
        <Field label="Low at"><TextInput type="number" value={f.low} onChange={(e) => set("low")(e.target.value)} placeholder="3" /></Field>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 mb-3 cursor-pointer">
        <span className="text-sm text-ink flex items-center gap-2"><Globe size={14} className="text-slate" /> Show on website</span>
        <input
          type="checkbox"
          checked={f.showOnline !== false}
          onChange={(e) => set("showOnline")(e.target.checked)}
          className="w-4 h-4 accent-ink"
        />
      </label>
      {["frame", "sunglasses", "contact", "accessory"].includes(f.type) && (
        <div className="rounded-xl border border-border px-3 py-2.5 mb-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-ink">Show in wholesale (B2B)</span>
            <input
              type="checkbox"
              checked={f.showWholesale === true}
              onChange={(e) => set("showWholesale")(e.target.checked)}
              className="w-4 h-4 accent-ink"
            />
          </label>
          {f.showWholesale === true && (
            <div className="mt-2">
              <Field label="Wholesale price (per piece)">
                <TextInput type="number" value={f.wholesalePrice ?? ""} onChange={(e) => set("wholesalePrice")(e.target.value)} placeholder="Trade price" />
              </Field>
              {(f.wholesalePrice === "" || f.wholesalePrice == null) && (
                <p className="text-xs text-slate -mt-1">Add a wholesale price so approved retailers can order this item.</p>
              )}
            </div>
          )}
        </div>
      )}
      <PrimaryBtn
        full
        disabled={!valid}
        onClick={() =>
          onSave({
            ...f,
            price: Number(f.price),
            purchasePrice: f.purchasePrice !== "" ? Number(f.purchasePrice) : null,
            stock: Number(f.stock) || 1,
            low: Number(f.low) || 3,
            photoUrl: f.photoUrl || "",
            showOnline: f.showOnline !== false,
            wholesalePrice: f.wholesalePrice !== "" && f.wholesalePrice != null ? Number(f.wholesalePrice) : "",
            showWholesale: f.showWholesale === true,
          })
        }
      >
        {initial?.id ? "Save changes" : "Add item"}
      </PrimaryBtn>
      {onDelete && (
        <button onClick={onDelete} className="text-xs flex items-center gap-1 mt-3 mx-auto text-warn">
          <Trash2 size={12} /> Remove item
        </button>
      )}
    </Modal>
  );
}
