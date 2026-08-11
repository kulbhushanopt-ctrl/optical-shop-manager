import React, { useState } from "react";
import { Modal, Field, TextInput, VoiceInput, VoiceTextArea, PrimaryBtn } from "../shared/ui";
import { todayISO } from "../../lib/format";

// Booking/rescheduling for a single, already-known patient -- no
// patient-picker needed since it's always opened from that patient's own
// detail view.
export default function AppointmentModal({ patient, initial, onClose, onSave }) {
  const [date, setDate] = useState(initial ? initial.scheduledAt.slice(0, 10) : todayISO());
  const [time, setTime] = useState(initial ? new Date(initial.scheduledAt).toTimeString().slice(0, 5) : "10:00");
  const [reason, setReason] = useState(initial?.reason || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const save = () => {
    if (!date || !time) return;
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
    <Modal title={initial ? "Reschedule appointment" : "Book appointment"} onClose={onClose}>
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
      <PrimaryBtn full disabled={!date || !time} onClick={save}>
        {initial ? "Save changes" : "Book appointment"}
      </PrimaryBtn>
    </Modal>
  );
}
