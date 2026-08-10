import React, { Suspense, lazy, useState } from "react";
import { Eye, Droplet, Trash2, Barcode } from "lucide-react";
import { Modal, Field, VoiceInput, VoiceRxInput, TextInput, Select, PrimaryBtn } from "../shared/ui";
import { ITEM_TYPES, LENS_INDEXES, COATINGS, suggestNextSku } from "../../lib/rxConstants";
import { parseRxPower, parseRxAdd } from "../../lib/rxParse";

// The barcode decoder library is large and only needed once someone
// actually opens the scanner, so it's split into its own chunk instead of
// bloating every page load.
const BarcodeScanner = lazy(() => import("../shared/BarcodeScanner"));

const CONTACT_DURATIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];
const CONTACT_TYPES = ["Spherical", "Toric", "Multifocal"];

const ITEM_PLACEHOLDERS = {
  frame: { brand: "Ray-Ban", model: "RB2140", sku: "FR-1001" },
  sunglasses: { brand: "Oakley", model: "Holbrook", sku: "SG-1001" },
  lens: { brand: "Essilor", model: "Varilux Progressive", sku: "LN-1001" },
  contact: { brand: "Acuvue", model: "Oasys", sku: "CL-1001" },
  accessory: { brand: "Optical Care", model: "Lens Cleaning Spray", sku: "AC-1001" },
};

const BLANK_ITEM = {
  type: "frame", brand: "", model: "", sku: "", price: "", stock: "", low: 3,
  power: "", addPower: "", lensIndex: "", coatings: [],
  baseCurve: "", diameter: "", duration: "", contactType: "", hsnCode: "",
};

export default function ItemFormModal({ title, initial, inventory, onClose, onSave, onDelete }) {
  // `initial` may be a full existing item (editing) or a partial AI-parsed
  // prefill (voice add) -- merge over blank defaults either way so missing
  // fields (e.g. `low`, `coatings`) don't end up undefined.
  const [f, setF] = useState({ ...BLANK_ITEM, ...(initial || {}) });
  const [showScanner, setShowScanner] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const toggleCoating = (c) => {
    const coatings = f.coatings || [];
    setF({ ...f, coatings: coatings.includes(c) ? coatings.filter((x) => x !== c) : [...coatings, c] });
  };
  const valid = f.brand.trim() && f.price !== "" && f.stock !== "";

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-[11px] text-slate -mt-1 mb-3">Only Brand, Price, and Stock are required — everything else is optional and can be filled in later.</p>
      <Field label="Type">
        <Select value={f.type} onChange={(e) => set("type")(e.target.value)}>
          {ITEM_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </Select>
      </Field>

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
            <button type="button" onClick={() => set("sku")(suggestNextSku(f.type, inventory))} className="text-[10px] text-lens mt-1">
              Use next: {suggestNextSku(f.type, inventory)}
            </button>
          )}
        </Field>
        <Field label="HSN code"><VoiceInput value={f.hsnCode || ""} onChange={set("hsnCode")} placeholder="9004" /></Field>
      </div>
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onDetect={(code) => {
              setF((prev) => ({ ...prev, sku: code }));
              setShowScanner(false);
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

      <div className="grid grid-cols-3 gap-2">
        <Field label="Price"><TextInput type="number" value={f.price} onChange={(e) => set("price")(e.target.value)} placeholder="189" /></Field>
        <Field label="Stock"><TextInput type="number" value={f.stock} onChange={(e) => set("stock")(e.target.value)} placeholder="6" /></Field>
        <Field label="Low at"><TextInput type="number" value={f.low} onChange={(e) => set("low")(e.target.value)} placeholder="3" /></Field>
      </div>
      <PrimaryBtn
        full
        disabled={!valid}
        onClick={() => onSave({ ...f, price: Number(f.price), stock: Number(f.stock), low: Number(f.low) || 3 })}
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
