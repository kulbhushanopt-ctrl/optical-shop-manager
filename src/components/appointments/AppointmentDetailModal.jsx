import React, { useState } from "react";
import { Phone, MessageCircle, Check, X as XIcon, Trash2 } from "lucide-react";
import { Modal, ConfirmModal } from "../shared/ui";
import { formatDate, formatTime, appointmentStatusLabel, appointmentStatusTone } from "../../lib/format";
import { appointmentReminderMessage } from "../../lib/messages";
import { openWhatsapp } from "../../lib/share";

export default function AppointmentDetailModal({ appointment, shopInfo, onClose, onChangeStatus, onDelete, canDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tone = appointmentStatusTone(appointment.status);

  const sendReminder = () => {
    const text = appointmentReminderMessage({
      shopName: shopInfo?.name,
      patientName: appointment.patientName,
      dateLabel: formatDate(appointment.scheduledAt.slice(0, 10)),
      timeLabel: formatTime(appointment.scheduledAt),
      reason: appointment.reason,
    });
    openWhatsapp(text, appointment.patientPhone);
  };

  return (
    <Modal title="Appointment" onClose={onClose}>
      <div className="rounded-2xl p-4 bg-card border border-border/70 shadow-sm shadow-ink/[0.03] mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display text-base font-semibold text-ink">{appointment.patientName}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${tone.text} ${tone.bg}`}>
            {appointmentStatusLabel(appointment.status)}
          </span>
        </div>
        {appointment.patientPhone && (
          <p className="text-xs text-slate flex items-center gap-1 mb-2">
            <Phone size={11} /> {appointment.patientPhone}
          </p>
        )}
        <p className="text-sm text-ink font-mono">
          {formatDate(appointment.scheduledAt.slice(0, 10))} · {formatTime(appointment.scheduledAt)}
        </p>
        {appointment.reason && <p className="text-xs text-slate mt-2"><span className="font-semibold">Reason:</span> {appointment.reason}</p>}
        {appointment.notes && <p className="text-xs text-slate mt-1"><span className="font-semibold">Notes:</span> {appointment.notes}</p>}
      </div>

      {appointment.patientPhone && (
        <button
          type="button"
          onClick={sendReminder}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-lensSoft text-lens flex items-center justify-center gap-1.5 mb-4 active:scale-[0.98] transition duration-150"
        >
          <MessageCircle size={13} /> Send WhatsApp reminder
        </button>
      )}

      {appointment.status === "scheduled" && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => onChangeStatus("completed")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-goodSoft text-good flex items-center justify-center gap-1.5 active:scale-[0.98] transition duration-150"
          >
            <Check size={13} /> Mark completed
          </button>
          <button
            type="button"
            onClick={() => onChangeStatus("cancelled")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-warnSoft text-warn flex items-center justify-center gap-1.5 active:scale-[0.98] transition duration-150"
          >
            <XIcon size={13} /> Cancel
          </button>
        </div>
      )}

      {canDelete && (
        <button onClick={() => setConfirmDelete(true)} className="text-xs flex items-center gap-1 mt-1 mx-auto text-warn">
          <Trash2 size={12} /> Delete appointment
        </button>
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete this appointment?"
          body="This removes the appointment permanently. This can't be undone."
          confirmLabel="Delete"
          onConfirm={onDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
