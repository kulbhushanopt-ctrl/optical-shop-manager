import React, { useState } from "react";
import { Phone, MapPin, Pencil, Plus, Printer, Trash2, CalendarClock, MessageCircle, Check, X as XIcon, Droplet, Flag, Receipt } from "lucide-react";
import { Modal, Avatar, ImageLightbox, VoiceInput } from "../shared/ui";
import { formatDate, formatTime, calculateAge, appointmentStatusLabel, appointmentStatusTone } from "../../lib/format";
import { uid } from "../../lib/rxConstants";
import { todayISO } from "../../lib/format";
import { appointmentReminderMessage, followUpFlagMessage } from "../../lib/messages";
import { openWhatsapp } from "../../lib/share";
import AddRxModal from "./AddRxModal";
import AddContactRxModal from "./AddContactRxModal";
import RxSlipModal from "./RxSlipModal";
import AppointmentModal from "./AppointmentModal";

export default function PatientDetailModal({
  patient,
  onClose,
  onUpdate,
  onDelete,
  onEdit,
  canDelete,
  shopInfo,
  appointment,
  onBookAppointment,
  onRescheduleAppointment,
  onChangeAppointmentStatus,
  onSetFlag,
  onGenerateBill,
}) {
  const [showRx, setShowRx] = useState(false);
  const [editingRx, setEditingRx] = useState(null);
  const [confirmDeleteRx, setConfirmDeleteRx] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slipRx, setSlipRx] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showContactRx, setShowContactRx] = useState(false);
  const [editingContactRx, setEditingContactRx] = useState(null);
  const [confirmDeleteContactRx, setConfirmDeleteContactRx] = useState(null);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [flagDraft, setFlagDraft] = useState("");

  const sendReminder = () => {
    if (!appointment) return;
    const text = appointmentReminderMessage({
      shopName: shopInfo?.name,
      patientName: patient.name,
      dateLabel: formatDate(appointment.scheduledAt.slice(0, 10)),
      timeLabel: formatTime(appointment.scheduledAt),
      reason: appointment.reason,
    });
    openWhatsapp(text, patient.phone);
  };

  // General "message this patient" action, always available next to their
  // details -- uses the flag-reminder wording if they're currently flagged,
  // otherwise just opens a blank WhatsApp chat with them.
  const sendPatientMessage = () => {
    const text = patient.flag_note
      ? followUpFlagMessage({ shopName: shopInfo?.name, patientName: patient.name, note: patient.flag_note })
      : "";
    openWhatsapp(text, patient.phone);
  };

  const addRx = (rx) => {
    const updated = { ...patient, prescriptions: [{ id: uid(), date: todayISO(), ...rx }, ...(patient.prescriptions || [])] };
    onUpdate(updated);
    setShowRx(false);
  };

  const saveEditedRx = (rx) => {
    const updated = { ...patient, prescriptions: patient.prescriptions.map((r) => (r.id === editingRx.id ? { ...r, ...rx } : r)) };
    onUpdate(updated);
    setEditingRx(null);
  };

  const deleteRx = (rxId) => {
    const updated = { ...patient, prescriptions: patient.prescriptions.filter((r) => r.id !== rxId) };
    onUpdate(updated);
    setConfirmDeleteRx(null);
  };

  const addContactRx = (rx) => {
    const updated = { ...patient, contact_prescriptions: [{ id: uid(), date: todayISO(), ...rx }, ...(patient.contact_prescriptions || [])] };
    onUpdate(updated);
    setShowContactRx(false);
  };

  const saveEditedContactRx = (rx) => {
    const updated = {
      ...patient,
      contact_prescriptions: patient.contact_prescriptions.map((r) => (r.id === editingContactRx.id ? { ...r, ...rx } : r)),
    };
    onUpdate(updated);
    setEditingContactRx(null);
  };

  const deleteContactRx = (rxId) => {
    const updated = { ...patient, contact_prescriptions: patient.contact_prescriptions.filter((r) => r.id !== rxId) };
    onUpdate(updated);
    setConfirmDeleteContactRx(null);
  };

  const prescriptions = patient.prescriptions || [];
  const contactPrescriptions = patient.contact_prescriptions || [];

  return (
    <Modal title={patient.name} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        {patient.photo ? (
          <button type="button" onClick={() => setShowPhotoLightbox(true)} aria-label="View photo">
            <Avatar name={patient.name} size={48} photo={patient.photo} />
          </button>
        ) : (
          <Avatar name={patient.name} size={48} photo={patient.photo} />
        )}
        {showPhotoLightbox && patient.photo && (
          <ImageLightbox src={patient.photo} alt={patient.name} onClose={() => setShowPhotoLightbox(false)} />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs flex items-center gap-1 text-slate">
            <Phone size={11} /> {patient.phone || "No phone on file"}
            {calculateAge(patient.dob) != null && <span> · Age {calculateAge(patient.dob)}</span>}
          </div>
          {patient.address && (
            <div className="text-xs mt-1 flex items-start gap-1 text-slate">
              <MapPin size={11} className="mt-0.5 flex-shrink-0" /> <span className="max-w-[200px]">{patient.address}</span>
            </div>
          )}
          {patient.notes && <div className="text-xs mt-1 max-w-[220px] text-slate">{patient.notes}</div>}
        </div>
        {patient.phone && (
          <button onClick={sendPatientMessage} className="w-7 h-7 rounded-full bg-lensSoft flex items-center justify-center flex-shrink-0" aria-label="Message on WhatsApp">
            <MessageCircle size={13} className="text-lens" />
          </button>
        )}
        <button
          onClick={() => onGenerateBill(patient.id)}
          className="w-7 h-7 rounded-full bg-focusSoft flex items-center justify-center flex-shrink-0"
          aria-label="Generate bill"
        >
          <Receipt size={13} className="text-ink" />
        </button>
        <button onClick={onEdit} className="w-7 h-7 rounded-full bg-border flex items-center justify-center flex-shrink-0">
          <Pencil size={12} className="text-ink" />
        </button>
      </div>

      <div className="rounded-xl p-3 mb-4 bg-focusSoft border border-focus/30">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-display text-xs font-semibold text-ink flex items-center gap-1">
            <CalendarClock size={13} /> Appointment
          </h4>
          {appointment && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${appointmentStatusTone(appointment.status).text} ${appointmentStatusTone(appointment.status).bg}`}>
              {appointmentStatusLabel(appointment.status)}
            </span>
          )}
        </div>
        {appointment ? (
          <>
            <p className="text-sm text-ink font-mono">
              {formatDate(appointment.scheduledAt.slice(0, 10))} · {formatTime(appointment.scheduledAt)}
            </p>
            {appointment.reason && <p className="text-xs text-slate mt-1">{appointment.reason}</p>}
            {appointment.status === "scheduled" && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {patient.phone && (
                  <button onClick={sendReminder} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-lensSoft text-lens flex items-center gap-1">
                    <MessageCircle size={11} /> Remind
                  </button>
                )}
                <button onClick={() => setShowAppointmentModal(true)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-card border border-border text-ink flex items-center gap-1">
                  <Pencil size={11} /> Reschedule
                </button>
                <button onClick={() => onChangeAppointmentStatus(appointment.id, "completed")} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-goodSoft text-good flex items-center gap-1">
                  <Check size={11} /> Done
                </button>
                <button onClick={() => onChangeAppointmentStatus(appointment.id, "cancelled")} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-warnSoft text-warn flex items-center gap-1">
                  <XIcon size={11} /> Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <button onClick={() => setShowAppointmentModal(true)} className="text-xs font-medium text-lens flex items-center gap-1">
            <Plus size={13} /> Book appointment
          </button>
        )}
      </div>
      {showAppointmentModal && (
        <AppointmentModal
          patient={patient}
          initial={appointment && appointment.status === "scheduled" ? appointment : null}
          onClose={() => setShowAppointmentModal(false)}
          onSave={(data) => {
            if (appointment && appointment.status === "scheduled") {
              onRescheduleAppointment(appointment.id, data);
            } else {
              onBookAppointment(data);
            }
            setShowAppointmentModal(false);
          }}
        />
      )}

      <div className="rounded-xl p-3 mb-4 bg-warnSoft border border-warn/30">
        <h4 className="font-display text-xs font-semibold text-ink flex items-center gap-1 mb-1">
          <Flag size={13} /> Follow-up flag
        </h4>
        {patient.flag_note ? (
          <>
            <p className="text-sm text-ink">{patient.flag_note}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <button
                onClick={() => {
                  setFlagDraft(patient.flag_note);
                  setShowFlagInput(true);
                }}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-card border border-border text-ink flex items-center gap-1"
              >
                <Pencil size={11} /> Edit
              </button>
              <button
                onClick={() => onSetFlag(patient.id, null)}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-card border border-border text-warn flex items-center gap-1"
              >
                <XIcon size={11} /> Clear
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => {
              setFlagDraft("");
              setShowFlagInput(true);
            }}
            className="text-xs font-medium text-warn flex items-center gap-1"
          >
            <Plus size={13} /> Flag for follow-up
          </button>
        )}
        {showFlagInput && (
          <div className="mt-2">
            <VoiceInput value={flagDraft} onChange={setFlagDraft} placeholder="e.g. Needs contact lenses" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowFlagInput(false)} className="flex-1 text-xs font-semibold py-2 rounded-lg text-slate">
                Cancel
              </button>
              <button
                onClick={() => {
                  onSetFlag(patient.id, flagDraft.trim());
                  setShowFlagInput(false);
                }}
                disabled={!flagDraft.trim()}
                className="flex-1 text-xs font-semibold py-2 rounded-lg bg-warn text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-sm font-semibold text-ink">Glasses prescription</h4>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRx(true)} className="text-xs font-medium flex items-center gap-1 text-lens">
            <Plus size={13} /> Add Rx
          </button>
          <button onClick={() => setShowContactRx(true)} className="text-xs font-medium flex items-center gap-1 text-lens" title="Add contact lens prescription">
            <Droplet size={13} /> Contact Rx
          </button>
        </div>
      </div>

      {prescriptions.length === 0 ? (
        <p className="text-xs mb-4 text-slate">No prescriptions recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="rounded-xl p-3 bg-lensSoft border border-lens/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-xs font-semibold text-ink">{formatDate(rx.date)}</span>
                {confirmDeleteRx === rx.id ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setConfirmDeleteRx(null)} className="text-[10px] px-2 py-0.5 text-slate">Cancel</button>
                    <button onClick={() => deleteRx(rx.id)} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium bg-warn">Delete</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditingRx(rx)} className="w-6 h-6 rounded-full flex items-center justify-center bg-lensSoft">
                      <Pencil size={11} className="text-lens" />
                    </button>
                    <button onClick={() => setSlipRx(rx)} className="w-6 h-6 rounded-full flex items-center justify-center bg-lensSoft">
                      <Printer size={12} className="text-lens" />
                    </button>
                    <button onClick={() => setConfirmDeleteRx(rx.id)} className="w-6 h-6 rounded-full flex items-center justify-center bg-warnSoft">
                      <Trash2 size={11} className="text-warn" />
                    </button>
                  </div>
                )}
              </div>
              {rx.chiefComplaint && (
                <p className="text-[11px] mb-2 text-ink"><span className="font-semibold">Complaint:</span> {rx.chiefComplaint}</p>
              )}
              <div className="rounded-lg overflow-hidden border border-lens/25 mb-1">
                <table className="w-full table-fixed text-[11px] font-mono border-collapse">
                  <colgroup>
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "16.4%" }} />
                    <col style={{ width: "16.4%" }} />
                    <col style={{ width: "16.4%" }} />
                    <col style={{ width: "16.4%" }} />
                    <col style={{ width: "16.4%" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-lens/10">
                      <th className="py-1 px-1.5"></th>
                      <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">SPH</th>
                      <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">CYL</th>
                      <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">AXIS</th>
                      <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">ADD</th>
                      <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">VA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-lens/20">
                      <td className="py-1 px-1.5 font-semibold text-ink">OD</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odSphere || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odCyl || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odAxis || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odAdd || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odVA || "—"}</td>
                    </tr>
                    <tr className="border-t border-lens/20">
                      <td className="py-1 px-1.5 font-semibold text-ink">OS</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osSphere || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osCyl || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osAxis || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osAdd || "—"}</td>
                      <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osVA || "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {rx.pd && <p className="text-[11px] mt-1.5 text-slate">PD: {rx.pd}mm</p>}
              {(rx.lensType || rx.coatings?.length > 0 || rx.lensIndex || rx.tint) && (
                <p className="text-[11px] mt-1 text-slate">
                  {[rx.lensType, rx.lensIndex && `${rx.lensIndex} index`, rx.tint, rx.coatings?.length ? rx.coatings.join(" + ") : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {rx.notes && <p className="text-[11px] mt-1 text-slate">{rx.notes}</p>}
              {rx.framePhoto && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={rx.framePhoto} alt="Booked frame" className="w-10 h-10 rounded-lg object-cover border border-lens/30" />
                  <span className="text-[10px] text-slate">Booked frame</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRx && <AddRxModal onClose={() => setShowRx(false)} onSave={addRx} />}
      {editingRx && <AddRxModal initial={editingRx} onClose={() => setEditingRx(null)} onSave={saveEditedRx} />}
      {slipRx && <RxSlipModal patient={patient} rx={slipRx} shopInfo={shopInfo} onClose={() => setSlipRx(null)} />}

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-sm font-semibold text-ink flex items-center gap-1">
          <Droplet size={13} className="text-lens" /> Contact lens prescription
        </h4>
      </div>

      {contactPrescriptions.length === 0 ? (
        <p className="text-xs mb-4 text-slate">No contact lens prescriptions recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {contactPrescriptions.map((rx) => (
            <div key={rx.id} className="rounded-xl p-3 bg-lensSoft border border-lens/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs font-semibold text-ink">{formatDate(rx.date)}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase bg-lens/15 text-lens">{rx.lensType}</span>
                </div>
                {confirmDeleteContactRx === rx.id ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setConfirmDeleteContactRx(null)} className="text-[10px] px-2 py-0.5 text-slate">Cancel</button>
                    <button onClick={() => deleteContactRx(rx.id)} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium bg-warn">Delete</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditingContactRx(rx)} className="w-6 h-6 rounded-full flex items-center justify-center bg-lensSoft">
                      <Pencil size={11} className="text-lens" />
                    </button>
                    <button onClick={() => setConfirmDeleteContactRx(rx.id)} className="w-6 h-6 rounded-full flex items-center justify-center bg-warnSoft">
                      <Trash2 size={11} className="text-warn" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <p className="font-semibold text-ink mb-0.5 font-sans">OD</p>
                  <p className="text-ink">{rx.odPower || "—"}{rx.odCyl ? ` / ${rx.odCyl} x ${rx.odAxis || "—"}` : ""}</p>
                  <p className="text-slate">BC {rx.odBaseCurve || "—"} · DIA {rx.odDiameter || "—"}</p>
                  {rx.odCyl && rx.odMarking && <p className="text-slate">Mark {rx.odMarking}</p>}
                  {rx.lensType === "Scleral" && rx.odSag && <p className="text-slate">Sag {rx.odSag}µm</p>}
                  {rx.odAdd && <p className="text-slate">Add {rx.odAdd}</p>}
                </div>
                <div>
                  <p className="font-semibold text-ink mb-0.5 font-sans">OS</p>
                  <p className="text-ink">{rx.osPower || "—"}{rx.osCyl ? ` / ${rx.osCyl} x ${rx.osAxis || "—"}` : ""}</p>
                  <p className="text-slate">BC {rx.osBaseCurve || "—"} · DIA {rx.osDiameter || "—"}</p>
                  {rx.osCyl && rx.osMarking && <p className="text-slate">Mark {rx.osMarking}</p>}
                  {rx.lensType === "Scleral" && rx.osSag && <p className="text-slate">Sag {rx.osSag}µm</p>}
                  {rx.osAdd && <p className="text-slate">Add {rx.osAdd}</p>}
                </div>
              </div>
              {rx.brand && <p className="text-[11px] mt-2 text-slate"><span className="font-semibold">Brand:</span> {rx.brand}</p>}
              {rx.duration && <p className="text-[11px] mt-1 text-slate"><span className="font-semibold">Replace:</span> {rx.duration}</p>}
              {rx.notes && <p className="text-[11px] mt-1 text-slate">{rx.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showContactRx && <AddContactRxModal onClose={() => setShowContactRx(false)} onSave={addContactRx} />}
      {editingContactRx && (
        <AddContactRxModal initial={editingContactRx} onClose={() => setEditingContactRx(null)} onSave={saveEditedContactRx} />
      )}

      {canDelete &&
        (confirmDelete ? (
          <div className="rounded-xl p-3 flex items-center justify-between bg-warnSoft border border-warn/30">
            <span className="text-xs font-medium text-warn">Delete this patient permanently?</span>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 text-slate">Cancel</button>
              <button onClick={() => onDelete(patient.id)} className="text-xs px-3 py-1 rounded-lg text-white font-medium bg-warn">Delete</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs flex items-center gap-1 mt-2 text-warn">
            <Trash2 size={12} /> Remove patient
          </button>
        ))}
    </Modal>
  );
}
