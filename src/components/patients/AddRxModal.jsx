import React, { useRef, useState } from "react";
import { Camera, Loader2, Sparkles } from "lucide-react";
import { compressImage } from "../../lib/image";
import { scanPrescription } from "../../lib/api";
import { LENS_TYPES, COATINGS, LENS_INDEXES, TINTS } from "../../lib/rxConstants";
import { parseRxPower, parseRxAxis, parseRxAdd, parseRxPlainNumber } from "../../lib/rxParse";
import { Modal, Field, VoiceInput, VoiceRxInput, VoiceTextArea, Select, PrimaryBtn } from "../shared/ui";
import CameraCapture from "../shared/CameraCapture";

const RX_SCAN_FIELDS = ["odSphere", "odCyl", "odAxis", "odAdd", "osSphere", "osCyl", "osAxis", "osAdd", "pd"];

export default function AddRxModal({ onClose, onSave, initial }) {
  const [f, setF] = useState({
    chiefComplaint: "",
    odSphere: "", odCyl: "", odAxis: "", odAdd: "",
    osSphere: "", osCyl: "", osAxis: "", osAdd: "",
    pd: "", notes: "",
    lensType: "", coatings: [], lensIndex: "", tint: "",
    framePhoto: null,
    ...(initial || {}),
  });
  const [framePhotoLoading, setFramePhotoLoading] = useState(false);
  const frameFileInputRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const toggleCoating = (c) => {
    setF({ ...f, coatings: f.coatings.includes(c) ? f.coatings.filter((x) => x !== c) : [...f.coatings, c] });
  };

  const handleScanPhoto = async (photo) => {
    setShowCamera(false);
    setScanning(true);
    setScanNotice("");
    try {
      const result = await scanPrescription(photo);
      if (result?.error === "not_configured") {
        setScanNotice(result.message || "AI prescription scanning isn't set up yet.");
      } else if (result?.error) {
        setScanNotice("Couldn't read that photo — please enter the values manually.");
      } else {
        const anyFound = RX_SCAN_FIELDS.some((k) => result?.[k]);
        setF((prev) => {
          const next = { ...prev };
          RX_SCAN_FIELDS.forEach((k) => {
            if (!next[k] && result?.[k]) next[k] = result[k];
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

  const handleFramePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFramePhotoLoading(true);
    try {
      const compressed = await compressImage(file, 640, 0.75);
      setF((prev) => ({ ...prev, framePhoto: compressed }));
    } catch (err) {
      alert("Couldn't process that photo — please try another.");
    }
    setFramePhotoLoading(false);
    e.target.value = "";
  };

  return (
    <Modal title={initial ? "Edit glasses prescription" : "Add glasses prescription"} onClose={onClose}>
      <Field label="Chief complaint">
        <VoiceInput value={f.chiefComplaint} onChange={set("chiefComplaint")} placeholder="Blurry distance vision, headaches, routine checkup…" />
      </Field>

      <div className="mb-3.5">
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          disabled={scanning}
          className="w-full py-2.5 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {scanning ? "Reading photo…" : "Scan prescription (AI)"}
          {!scanning && <Sparkles size={12} />}
        </button>
        {scanNotice && <p className="text-[11px] text-slate mt-1.5">{scanNotice}</p>}
        {showCamera && <CameraCapture onCapture={handleScanPhoto} onClose={() => setShowCamera(false)} />}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="OD Sphere"><VoiceRxInput value={f.odSphere} onChange={set("odSphere")} placeholder="-2.00" parse={parseRxPower} /></Field>
        <Field label="OD Cyl"><VoiceRxInput value={f.odCyl} onChange={set("odCyl")} placeholder="-0.50" parse={parseRxPower} /></Field>
        <Field label="OD Axis"><VoiceRxInput value={f.odAxis} onChange={set("odAxis")} placeholder="180" parse={parseRxAxis} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="OS Sphere"><VoiceRxInput value={f.osSphere} onChange={set("osSphere")} placeholder="-1.75" parse={parseRxPower} /></Field>
        <Field label="OS Cyl"><VoiceRxInput value={f.osCyl} onChange={set("osCyl")} placeholder="-0.25" parse={parseRxPower} /></Field>
        <Field label="OS Axis"><VoiceRxInput value={f.osAxis} onChange={set("osAxis")} placeholder="175" parse={parseRxAxis} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Add"><VoiceRxInput value={f.odAdd} onChange={set("odAdd")} placeholder="+2.00" parse={parseRxAdd} /></Field>
        <Field label="OS Add"><VoiceRxInput value={f.osAdd} onChange={set("osAdd")} placeholder="+2.00" parse={parseRxAdd} /></Field>
      </div>
      <Field label="Pupillary distance (mm)"><VoiceRxInput value={f.pd} onChange={set("pd")} placeholder="62" parse={parseRxPlainNumber} /></Field>

      <div className="border-t border-dashed border-border pt-3.5 mt-1 mb-3.5">
        <h4 className="font-display text-sm font-semibold text-ink mb-3">Lens preferences</h4>

        <Field label="Lens type">
          <div className="flex gap-2 flex-wrap">
            {LENS_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setF({ ...f, lensType: f.lensType === t ? "" : t })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  f.lensType === t ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Coating">
          <div className="flex gap-2 flex-wrap">
            {COATINGS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCoating(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  f.coatings.includes(c) ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Index">
            <Select value={f.lensIndex} onChange={(e) => set("lensIndex")(e.target.value)}>
              <option value="">— Select —</option>
              {LENS_INDEXES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tint">
            <Select value={f.tint} onChange={(e) => set("tint")(e.target.value)}>
              <option value="">— Select —</option>
              {TINTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div className="border-t border-dashed border-border pt-3.5 mt-1 mb-3.5">
        <h4 className="font-display text-sm font-semibold text-ink mb-3">Booked frame</h4>
        <input ref={frameFileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFramePhotoPick} />
        {f.framePhoto ? (
          <div className="flex items-center gap-3">
            <img src={f.framePhoto} alt="Booked frame" className="w-16 h-16 rounded-xl object-cover border-[1.5px] border-border" />
            <div className="flex gap-2">
              <button type="button" onClick={() => frameFileInputRef.current?.click()} className="text-xs font-medium px-3 py-1.5 rounded-full bg-lensSoft text-lens">
                Retake
              </button>
              <button type="button" onClick={() => setF({ ...f, framePhoto: null })} className="text-xs font-medium px-3 py-1.5 rounded-full bg-warnSoft text-warn">
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => frameFileInputRef.current?.click()}
            disabled={framePhotoLoading}
            className="w-full py-4 rounded-xl border-[1.5px] border-dashed border-border flex flex-col items-center justify-center gap-1.5"
          >
            {framePhotoLoading ? (
              <Loader2 size={18} className="text-slate animate-spin" />
            ) : (
              <>
                <Camera size={18} className="text-slate" />
                <span className="text-xs text-slate">Click a photo of the frame booked</span>
              </>
            )}
          </button>
        )}
      </div>

      <Field label="Notes"><VoiceTextArea value={f.notes} onChange={set("notes")} placeholder="Progressive lenses recommended…" /></Field>
      <PrimaryBtn full onClick={() => onSave(f)}>{initial ? "Save changes" : "Save prescription"}</PrimaryBtn>
    </Modal>
  );
}
