import React, { useRef, useState } from "react";
import { Camera, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { scanPrescription } from "../../lib/api";
import { LENS_TYPES, COATINGS, LENS_INDEXES, TINTS, SPHERE_POWERS, CYL_POWERS, ADD_POWERS, VA_OPTIONS, PD_OPTIONS, withCurrentValue, withBlankCentered } from "../../lib/rxConstants";
import { parseRxPower, parseRxAxis, parseRxAdd, parseRxPlainNumber, RX_SCAN_FIELDS, normalizeRxValue } from "../../lib/rxParse";
import { compressImage } from "../../lib/image";
import { Modal, Field, VoiceInput, VoiceRxInput, VoiceSelect, VoiceTextArea, Select, PrimaryBtn } from "../shared/ui";
import CameraCapture from "../shared/CameraCapture";

export default function AddRxModal({ onClose, onSave, initial }) {
  const [f, setF] = useState(() => {
    const base = {
      chiefComplaint: "",
      odSphere: "", odCyl: "", odAxis: "", odAdd: "", odVA: "",
      osSphere: "", osCyl: "", osAxis: "", osAdd: "", osVA: "",
      pd: "", notes: "",
      lensType: "", coatings: [], lensIndex: "", tint: "",
      framePhoto: null,
      ...(initial || {}),
    };
    RX_SCAN_FIELDS.forEach((k) => {
      base[k] = normalizeRxValue(k, base[k]);
    });
    return base;
  });
  const [showFrameCamera, setShowFrameCamera] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  // A prescription photo received over WhatsApp already sits in the phone's
  // gallery/WhatsApp media folder -- this input jumps straight to that
  // picker instead of opening the live camera first.
  const whatsappInputRef = useRef(null);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  // Options with the blank placeholder positioned right next to a sensible
  // middle value instead of at the top, so opening an empty field centers
  // the native picker there -- see withBlankCentered.
  const centeredOptions = (list, value, center) =>
    withBlankCentered(withCurrentValue(list, value), center).map((p) =>
      p === "" ? (
        <option key="blank" value="">— Select —</option>
      ) : (
        <option key={p} value={p}>{p}</option>
      )
    );
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
            if (!next[k] && result?.[k]) next[k] = normalizeRxValue(k, result[k]);
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
    <Modal title={initial ? "Edit glasses prescription" : "Add glasses prescription"} onClose={onClose}>
      <Field label="Chief complaint">
        <VoiceInput value={f.chiefComplaint} onChange={set("chiefComplaint")} placeholder="Blurry distance vision, headaches, routine checkup…" />
      </Field>

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

      <div className="grid grid-cols-3 gap-2">
        <Field label="OD Sphere">
          <VoiceSelect value={f.odSphere} onChange={set("odSphere")} parse={parseRxPower}>
            {centeredOptions(SPHERE_POWERS, f.odSphere)}
          </VoiceSelect>
        </Field>
        <Field label="OD Cyl">
          <VoiceSelect value={f.odCyl} onChange={set("odCyl")} parse={parseRxPower}>
            {centeredOptions(CYL_POWERS, f.odCyl)}
          </VoiceSelect>
        </Field>
        <Field label="OD Axis"><VoiceRxInput value={f.odAxis} onChange={set("odAxis")} placeholder="180" parse={parseRxAxis} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="OS Sphere">
          <VoiceSelect value={f.osSphere} onChange={set("osSphere")} parse={parseRxPower}>
            {centeredOptions(SPHERE_POWERS, f.osSphere)}
          </VoiceSelect>
        </Field>
        <Field label="OS Cyl">
          <VoiceSelect value={f.osCyl} onChange={set("osCyl")} parse={parseRxPower}>
            {centeredOptions(CYL_POWERS, f.osCyl)}
          </VoiceSelect>
        </Field>
        <Field label="OS Axis"><VoiceRxInput value={f.osAxis} onChange={set("osAxis")} placeholder="175" parse={parseRxAxis} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Vision (after correction)">
          <VoiceSelect value={f.odVA} onChange={set("odVA")}>
            <option value="">— Select —</option>
            {withCurrentValue(VA_OPTIONS, f.odVA).map((v) => <option key={v} value={v}>{v}</option>)}
          </VoiceSelect>
        </Field>
        <Field label="OS Vision (after correction)">
          <VoiceSelect value={f.osVA} onChange={set("osVA")}>
            <option value="">— Select —</option>
            {withCurrentValue(VA_OPTIONS, f.osVA).map((v) => <option key={v} value={v}>{v}</option>)}
          </VoiceSelect>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="OD Add">
          <VoiceSelect value={f.odAdd} onChange={set("odAdd")} parse={parseRxAdd}>
            <option value="">— Select —</option>
            {withCurrentValue(ADD_POWERS, f.odAdd).map((p) => <option key={p} value={p}>{p}</option>)}
          </VoiceSelect>
        </Field>
        <Field label="OS Add">
          <VoiceSelect value={f.osAdd} onChange={set("osAdd")} parse={parseRxAdd}>
            <option value="">— Select —</option>
            {withCurrentValue(ADD_POWERS, f.osAdd).map((p) => <option key={p} value={p}>{p}</option>)}
          </VoiceSelect>
        </Field>
      </div>
      <Field label="Pupillary distance (mm)">
        <VoiceSelect value={f.pd} onChange={set("pd")} parse={parseRxPlainNumber}>
          {centeredOptions(PD_OPTIONS, f.pd, "65")}
        </VoiceSelect>
      </Field>

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
        {f.framePhoto ? (
          <div className="flex items-center gap-3">
            <img src={f.framePhoto} alt="Booked frame" className="w-16 h-16 rounded-xl object-cover border-[1.5px] border-border" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowFrameCamera(true)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-lensSoft text-lens">
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
            onClick={() => setShowFrameCamera(true)}
            className="w-full py-4 rounded-xl border-[1.5px] border-dashed border-border flex flex-col items-center justify-center gap-1.5"
          >
            <Camera size={18} className="text-slate" />
            <span className="text-xs text-slate">Click a photo of the frame booked</span>
          </button>
        )}
        {showFrameCamera && (
          <CameraCapture
            onCapture={(dataUrl) => {
              setF((prev) => ({ ...prev, framePhoto: dataUrl }));
              setShowFrameCamera(false);
            }}
            onClose={() => setShowFrameCamera(false)}
          />
        )}
      </div>

      <Field label="Notes"><VoiceTextArea value={f.notes} onChange={set("notes")} placeholder="Progressive lenses recommended…" /></Field>
      <PrimaryBtn full onClick={() => onSave(f)}>{initial ? "Save changes" : "Save prescription"}</PrimaryBtn>
    </Modal>
  );
}
