import React, { useState } from "react";
import { Camera } from "lucide-react";
import { Modal, Field, VoiceInput, VoiceTextArea, TextInput, PrimaryBtn } from "../shared/ui";
import { calculateAge } from "../../lib/format";
import CameraCapture from "../shared/CameraCapture";

export default function AddPatientModal({ onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [dob, setDob] = useState(initial?.dob || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [showCamera, setShowCamera] = useState(false);

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
      <Field label="Full name">
        <VoiceInput value={name} onChange={setName} placeholder="Jordan Lee" />
      </Field>
      <Field label="Phone">
        <VoiceInput value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
      </Field>
      <Field label={`Date of birth${dob ? ` (age ${calculateAge(dob)})` : ""}`}>
        <TextInput type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label="Address">
        <VoiceTextArea value={address} onChange={setAddress} placeholder="House no., street, city, state, PIN code" rows={2} />
      </Field>
      <Field label="Notes">
        <VoiceTextArea value={notes} onChange={setNotes} placeholder="Allergies, preferences, etc." />
      </Field>
      <PrimaryBtn
        full
        disabled={!name.trim()}
        onClick={() => onSave({ name: name.trim(), phone: phone.trim(), dob: dob || null, address: address.trim(), notes: notes.trim(), photo })}
      >
        Save patient
      </PrimaryBtn>
    </Modal>
  );
}
