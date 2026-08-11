import React, { useState } from "react";
import { Camera } from "lucide-react";
import { Modal, Field, TextInput, TextArea, PrimaryBtn } from "../shared/ui";
import CameraCapture from "../shared/CameraCapture";

const BLANK = { name: "", phone: "", dob: "", address: "", notes: "", photo: null };

export default function AddPatientModal({ onClose, onSave, initial }) {
  const [f, setF] = useState({ ...BLANK, ...(initial || {}) });
  const [showCamera, setShowCamera] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  return (
    <Modal title={initial ? "Edit patient" : "Add patient"} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        {f.photo ? (
          <img src={f.photo} alt="Patient" className="w-14 h-14 rounded-full object-cover border border-border" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-paper border border-dashed border-border flex items-center justify-center">
            <Camera size={16} className="text-slate" />
          </div>
        )}
        <button type="button" onClick={() => setShowCamera(true)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-focusSoft text-focus">
          {f.photo ? "Retake photo" : "Add photo"}
        </button>
        {f.photo && (
          <button type="button" onClick={() => set("photo")(null)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-warnSoft text-warn">
            Remove
          </button>
        )}
        {showCamera && (
          <CameraCapture
            onCapture={(dataUrl) => {
              set("photo")(dataUrl);
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
          />
        )}
      </div>

      <Field label="Name">
        <TextInput value={f.name} onChange={(e) => set("name")(e.target.value)} placeholder="Patient name" />
      </Field>
      <Field label="Phone">
        <TextInput value={f.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="9876543210" />
      </Field>
      <Field label="Date of birth">
        <TextInput type="date" value={f.dob || ""} onChange={(e) => set("dob")(e.target.value)} />
      </Field>
      <Field label="Address (optional)">
        <TextInput value={f.address} onChange={(e) => set("address")(e.target.value)} placeholder="Address" />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={3} value={f.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Corneal condition, keratoconus stage, prior lens history…" />
      </Field>

      <PrimaryBtn full onClick={() => onSave(f)} disabled={!f.name.trim()}>
        {initial ? "Save changes" : "Save patient"}
      </PrimaryBtn>
    </Modal>
  );
}
