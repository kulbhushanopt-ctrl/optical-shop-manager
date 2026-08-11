import React, { useRef, useState } from "react";
import { Camera, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Modal, Field, VoiceInput, VoiceRxInput, VoiceTextArea, TextInput, Select, PrimaryBtn } from "../shared/ui";
import CameraCapture from "../shared/CameraCapture";
import { CONTACT_LENS_TYPES, CONTACT_LENS_DURATIONS } from "../../lib/rxConstants";
import { scanContactPrescription } from "../../lib/api";
import { compressImage } from "../../lib/image";
import { parseRxPower, parseRxAxis, parseRxAdd, CONTACT_RX_SCAN_FIELDS, normalizeContactRxValue } from "../../lib/rxParse";

const BLANK = {
  lensType: "Soft",
  odPower: "", odCyl: "", odAxis: "", odMarking: "", odBaseCurve: "", odDiameter: "", odSag: "", odAdd: "",
  osPower: "", osCyl: "", osAxis: "", osMarking: "", osBaseCurve: "", osDiameter: "", osSag: "", osAdd: "",
  brand: "", duration: "", notes: "",
};

export default function AddContactRxModal({ onClose, onSave, initial }) {
  const [f, setF] = useState({ ...BLANK, ...(initial || {}) });
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  // A prescription photo received over WhatsApp already sits in the phone's
  // gallery/WhatsApp media folder -- this input jumps straight to that
  // picker instead of opening the live camera first.
  const whatsappInputRef = useRef(null);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const handleScanPhoto = async (photo) => {
    setShowCamera(false);
    setScanning(true);
    setScanNotice("");
    try {
      const result = await scanContactPrescription(photo);
      if (result?.error === "not_configured") {
        setScanNotice(result.message || "AI prescription scanning isn't set up yet.");
      } else if (result?.error) {
        setScanNotice("Couldn't read that photo — please enter the values manually.");
      } else {
        const anyFound = CONTACT_RX_SCAN_FIELDS.some((k) => result?.[k]);
        setF((prev) => {
          const next = { ...prev };
          CONTACT_RX_SCAN_FIELDS.forEach((k) => {
            if (!next[k] && result?.[k]) next[k] = normalizeContactRxValue(k, result[k]);
          });
          return next;
        });
        setScanNotice(
          anyFound ? "Scanned — please review the values below before saving." : "Couldn't make out the values in that photo — please enter them manually."
        );
      }
    } catch (err) {
      setScanNotice("Couldn't read that photo — please enter the values manually.");
    }
    setScanning(false);
  };

  const handleWhatsappPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 900, 0.8);
      handleScanPhoto(dataUrl);
    } catch (err) {
      setScanNotice("Couldn't read that photo — please try another.");
    }
  };

  return (
    <Modal title={initial ? "Edit contact lens prescription" : "Add contact lens prescription"} onClose={onClose}>
      <div className="mb-3.5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={scanning}
            className="flex-1 py-2.5 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {scanning ? "Reading photo…" : "Scan prescription (AI)"}
            {!scanning && <Sparkles size={12} />}
          </button>
          <button
            type="button"
            onClick={() => whatsappInputRef.current?.click()}
            disabled={scanning}
            className="w-11 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens flex items-center justify-center flex-shrink-0 disabled:opacity-60"
            title="Import a prescription photo from WhatsApp"
            aria-label="Import from WhatsApp"
          >
            <MessageCircle size={16} />
          </button>
        </div>
        <input ref={whatsappInputRef} type="file" accept="image/*" className="hidden" onChange={handleWhatsappPick} />
        {scanNotice && <p className="text-[11px] text-slate mt-1.5">{scanNotice}</p>}
        {showCamera && <CameraCapture onCapture={handleScanPhoto} onClose={() => setShowCamera(false)} />}
      </div>

      <Field label="Lens type">
        <div className="flex gap-2">
          {CONTACT_LENS_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("lensType")(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition duration-150 ${
                f.lensType === t ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Power"><VoiceRxInput value={f.odPower} onChange={set("odPower")} placeholder="-2.00" parse={parseRxPower} /></Field>
        <Field label="OS Power"><VoiceRxInput value={f.osPower} onChange={set("osPower")} placeholder="-2.00" parse={parseRxPower} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Cyl (toric)"><VoiceRxInput value={f.odCyl} onChange={set("odCyl")} placeholder="-0.75" parse={parseRxPower} /></Field>
        <Field label="OS Cyl (toric)"><VoiceRxInput value={f.osCyl} onChange={set("osCyl")} placeholder="-0.75" parse={parseRxPower} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Axis"><VoiceRxInput value={f.odAxis} onChange={set("odAxis")} placeholder="180" parse={parseRxAxis} /></Field>
        <Field label="OS Axis"><VoiceRxInput value={f.osAxis} onChange={set("osAxis")} placeholder="175" parse={parseRxAxis} /></Field>
      </div>
      {(f.odCyl || f.osCyl) && (
        <div className="border-t border-dashed border-border pt-3 mt-1 mb-1">
          <p className="text-[11px] font-medium uppercase tracking-wide mb-2 text-slate">Toric marking / stabilization</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="OD Marking position">
              <TextInput value={f.odMarking} onChange={(e) => set("odMarking")(e.target.value)} placeholder="6 o'clock, no rotation" />
            </Field>
            <Field label="OS Marking position">
              <TextInput value={f.osMarking} onChange={(e) => set("osMarking")(e.target.value)} placeholder="6 o'clock, no rotation" />
            </Field>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Base curve (mm)"><TextInput value={f.odBaseCurve} onChange={(e) => set("odBaseCurve")(e.target.value)} placeholder="8.6" /></Field>
        <Field label="OS Base curve (mm)"><TextInput value={f.osBaseCurve} onChange={(e) => set("osBaseCurve")(e.target.value)} placeholder="8.6" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Diameter (mm)"><TextInput value={f.odDiameter} onChange={(e) => set("odDiameter")(e.target.value)} placeholder="14.2" /></Field>
        <Field label="OS Diameter (mm)"><TextInput value={f.osDiameter} onChange={(e) => set("osDiameter")(e.target.value)} placeholder="14.2" /></Field>
      </div>

      {f.lensType === "Scleral" && (
        <div className="border-t border-dashed border-border pt-3 mt-1 mb-1">
          <p className="text-[11px] font-medium uppercase tracking-wide mb-2 text-slate">Scleral fitting</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="OD Sag depth (µm)"><TextInput value={f.odSag} onChange={(e) => set("odSag")(e.target.value)} placeholder="4200" /></Field>
            <Field label="OS Sag depth (µm)"><TextInput value={f.osSag} onChange={(e) => set("osSag")(e.target.value)} placeholder="4200" /></Field>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Add (multifocal)"><VoiceRxInput value={f.odAdd} onChange={set("odAdd")} placeholder="+2.00" parse={parseRxAdd} /></Field>
        <Field label="OS Add (multifocal)"><VoiceRxInput value={f.osAdd} onChange={set("osAdd")} placeholder="+2.00" parse={parseRxAdd} /></Field>
      </div>

      <Field label="Brand / material (optional)">
        <VoiceInput value={f.brand} onChange={set("brand")} placeholder="Biofinity, Boston XO…" />
      </Field>
      <Field label="Replacement schedule (optional)">
        <Select value={f.duration} onChange={(e) => set("duration")(e.target.value)}>
          <option value="">— Select —</option>
          {CONTACT_LENS_DURATIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
      </Field>
      <Field label="Notes (optional)">
        <VoiceTextArea value={f.notes} onChange={set("notes")} placeholder="Wearing time, fitting notes…" />
      </Field>

      <PrimaryBtn full onClick={() => onSave(f)}>{initial ? "Save changes" : "Save prescription"}</PrimaryBtn>
    </Modal>
  );
}
