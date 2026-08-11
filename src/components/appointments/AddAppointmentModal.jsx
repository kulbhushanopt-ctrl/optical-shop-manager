import React, { useState } from "react";
import { Plus } from "lucide-react";
import { createPatient } from "../../lib/api";
import { Modal, Field, TextInput, VoiceInput, VoiceTextArea, Select, PrimaryBtn, SecondaryBtn } from "../shared/ui";
import { todayISO } from "../../lib/format";

export default function AddAppointmentModal({ patients, setPatients, branchId, onClose, onSave }) {
  const [patientId, setPatientId] = useState(patients[0]?.id || "");
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const patient = patients.find((p) => p.id === patientId);

  const addNewPatient = async () => {
    if (!newPatientName.trim()) return;
    try {
      const p = await createPatient(branchId, { name: newPatientName.trim(), phone: newPatientPhone.trim() });
      setPatients([p, ...patients]);
      setPatientId(p.id);
      setNewPatientOpen(false);
      setNewPatientName("");
      setNewPatientPhone("");
    } catch (e) {
      alert("Couldn't add patient — please try again.");
    }
  };

  const save = () => {
    if (!patient || !date || !time) return;
    onSave({
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone || "",
      scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
      reason: reason.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <Modal title="New appointment" onClose={onClose}>
      <Field label="Patient">
        <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {patients.length === 0 && <option value="">No patients yet</option>}
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.phone ? ` — ${p.phone}` : ""}</option>
          ))}
        </Select>
      </Field>
      {newPatientOpen ? (
        <div className="rounded-xl p-3 mb-3.5 -mt-2 bg-lensSoft border border-lens/30">
          <p className="text-xs font-semibold mb-2 text-ink">New patient</p>
          <Field label="Name"><TextInput value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="Jordan Lee" /></Field>
          <Field label="Phone"><TextInput value={newPatientPhone} onChange={(e) => setNewPatientPhone(e.target.value)} placeholder="+91 98765 43210" /></Field>
          <div className="flex gap-2">
            <SecondaryBtn full onClick={() => { setNewPatientOpen(false); setNewPatientName(""); setNewPatientPhone(""); }}>Cancel</SecondaryBtn>
            <PrimaryBtn full disabled={!newPatientName.trim()} onClick={addNewPatient}>Add patient</PrimaryBtn>
          </div>
        </div>
      ) : (
        <button onClick={() => setNewPatientOpen(true)} className="text-xs font-medium flex items-center gap-1 -mt-2 mb-3.5 text-lens">
          <Plus size={13} /> Patient not in list? Add new
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayISO()} /></Field>
        <Field label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      <Field label="Reason (optional)">
        <VoiceInput value={reason} onChange={setReason} placeholder="Eye checkup, frame fitting, follow-up…" />
      </Field>
      <Field label="Notes (optional)">
        <VoiceTextArea value={notes} onChange={setNotes} placeholder="Anything staff should know before the visit" />
      </Field>

      <PrimaryBtn full disabled={!patient || !date || !time} onClick={save}>
        Book appointment
      </PrimaryBtn>
    </Modal>
  );
}
