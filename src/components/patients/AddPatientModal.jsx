import React, { useRef, useState } from "react";
import { Camera, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Modal, Field, VoiceInput, VoiceTextArea, TextInput, PrimaryBtn } from "../shared/ui";
import { calculateAge } from "../../lib/format";
import { scanPatientIntake } from "../../lib/api";
import { RX_SCAN_FIELDS, normalizeRxValue } from "../../lib/rxParse";
import { compressImage } from "../../lib/image";
import CameraCapture from "../shared/CameraCapture";

export default function AddPatientModal({ onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [dob, setDob] = useState(initial?.dob || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [showCamera, setShowCamera] = useState(false);

  // Only offered when adding a brand-new patient -- one photo of an intake
  // form fills the fields below AND the first prescription in one pass,
  // instead of requiring a second AI scan later inside "Add Rx".
  const [showScan, setShowScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState("");
  const [dobEstimated, setDobEstimated] = useState(false);
  const [scannedRx, setScannedRx] = useState(null);
  // A prescription photo received over WhatsApp already sits in the phone's
  // gallery/WhatsApp media folder -- this input jumps straight to that
  // picker instead of opening the live camera first, since the file dialog
  // itself offers WhatsApp/Photos/Files as sources on mobile.
  const whatsappInputRef = useRef(null);

  const handleWhatsappPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 900, 0.8);
      handleScanForm(dataUrl);
    } catch (err) {
      setScanNotice("Couldn't read that photo — please try another.");
    }
  };

  const handleScanForm = async (photo) => {
    setShowScan(false);
    setScanning(true);
    setScanNotice("");
    try {
      const result = await scanPatientIntake(photo);
      if (result?.error === "not_configured") {
        setScanNotice(result.message || "AI form scanning isn't set up yet.");
      } else if (result?.error) {
        setScanNotice("Couldn't read that photo — please enter the details manually.");
      } else {
        let filledSomething = false;
        if (!name.trim() && result.name) {
          setName(result.name);
          filledSomething = true;
        }
        if (!phone.trim() && result.phone) {
          setPhone(result.phone);
          filledSomething = true;
        }
        if (!address.trim() && result.address) {
          setAddress(result.address);
          filledSomething = true;
        }
        if (!dob && result.age != null && !Number.isNaN(Number(result.age))) {
          const estimatedYear = new Date().getFullYear() - Number(result.age);
          setDob(`${estimatedYear}-01-01`);
          setDobEstimated(true);
          filledSomething = true;
        }

        const rx = {};
        RX_SCAN_FIELDS.forEach((k) => {
          if (result[k]) rx[k] = normalizeRxValue(k, result[k]);
        });
        const hasRx = Object.keys(rx).length > 0;
        if (hasRx) {
          setScannedRx(rx);
          filledSomething = true;
        }

        setScanNotice(
          filledSomething
            ? `Scanned — please review the details below${hasRx ? " (a prescription will be saved too)" : ""} before saving.`
            : "Couldn't make out the details in that photo — please enter them manually."
        );
      }
    } catch (err) {
      setScanNotice("Couldn't read that photo — please enter the details manually.");
    }
    setScanning(false);
  };

  const save = () => {
    const payload = { name: name.trim(), phone: phone.trim(), dob: dob || null, address: address.trim(), notes: notes.trim(), photo };
    if (!initial && scannedRx) payload.scannedRx = scannedRx;
    onSave(payload);
  };

  return (
    <Modal title={initial ? "Edit patient" : "New patient"} onClose={onClose}>
      <div className="flex justify-center mb-4">
        <button onClick={() => setShowCamera(true)} className="relative" type="button">
          {photo ? (
            <img src={photo} alt="Patient" className="w-[72px] h-[72px] rounded-full object-cover border-2 border-focus" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-[1.5px] border-dashed border-border flex items-center justify-center">
              <Camera size={22} className="text-slate" />
            </div>
          )}
          <div className="absolute bottom-0 right-0 bg-focus w-6 h-6 rounded-full flex items-center justify-center">
            <Camera size={12} className="text-ink" />
          </div>
        </button>
        {showCamera && (
          <CameraCapture
            onCapture={(dataUrl) => {
              setPhoto(dataUrl);
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
          />
        )}
      </div>

      {!initial && (
        <div className="mb-3.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowScan(true)}
              disabled={scanning}
              className="flex-1 py-2.5 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              {scanning ? "Reading photo…" : "Scan intake form (AI)"}
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
          {showScan && <CameraCapture onCapture={handleScanForm} onClose={() => setShowScan(false)} />}
        </div>
      )}

      <Field label="Full name">
        <VoiceInput value={name} onChange={setName} placeholder="Jordan Lee" />
      </Field>
      <Field label="Phone">
        <VoiceInput value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
      </Field>
      <Field label={`Date of birth${dob ? ` (age ${calculateAge(dob)})` : ""}`}>
        <TextInput
          type="date"
          value={dob}
          onChange={(e) => {
            setDob(e.target.value);
            setDobEstimated(false);
          }}
          max={new Date().toISOString().slice(0, 10)}
        />
        {dobEstimated && <p className="text-[10px] text-slate mt-1">Estimated from age on the form — adjust if you know the exact date.</p>}
      </Field>
      <Field label="Address">
        <VoiceTextArea value={address} onChange={setAddress} placeholder="House no., street, city, state, PIN code" rows={2} />
      </Field>
      <Field label="Notes">
        <VoiceTextArea value={notes} onChange={setNotes} placeholder="Allergies, preferences, etc." />
      </Field>
      <PrimaryBtn full disabled={!name.trim()} onClick={save}>
        Save patient
      </PrimaryBtn>
    </Modal>
  );
}
