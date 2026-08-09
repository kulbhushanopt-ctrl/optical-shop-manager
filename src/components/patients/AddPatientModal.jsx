import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { compressImage } from "../../lib/image";
import { Modal, Field, VoiceInput, VoiceTextArea, PrimaryBtn } from "../shared/ui";

export default function AddPatientModal({ onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [photo, setPhoto] = useState(initial?.photo || null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const compressed = await compressImage(file, 640, 0.75);
      setPhoto(compressed);
    } catch (err) {
      alert("Couldn't process that photo — please try another.");
    }
    setPhotoLoading(false);
    e.target.value = "";
  };

  return (
    <Modal title={initial ? "Edit patient" : "New patient"} onClose={onClose}>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoPick} />
      <div className="flex justify-center mb-4">
        <button onClick={() => fileInputRef.current?.click()} className="relative" disabled={photoLoading} type="button">
          {photoLoading ? (
            <div className="w-[72px] h-[72px] rounded-full border-[1.5px] border-dashed border-border flex items-center justify-center">
              <Loader2 size={20} className="text-slate animate-spin" />
            </div>
          ) : photo ? (
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
      </div>
      <Field label="Full name">
        <VoiceInput value={name} onChange={setName} placeholder="Jordan Lee" />
      </Field>
      <Field label="Phone">
        <VoiceInput value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
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
        onClick={() => onSave({ name: name.trim(), phone: phone.trim(), address: address.trim(), notes: notes.trim(), photo })}
      >
        Save patient
      </PrimaryBtn>
    </Modal>
  );
}
