import React, { useState } from "react";
import { Phone, MapPin, Pencil, Plus, Trash2, ScanEye, CalendarClock } from "lucide-react";
import { Modal, Avatar, ImageLightbox, StatusPill } from "../shared/ui";
import { formatDate, calculateAge } from "../../lib/format";
import { uid, fittingStatusLabel, FITTING_STATUSES } from "../../lib/constants";
import AddFittingModal from "../fittings/AddFittingModal";

const statusTone = (id) => FITTING_STATUSES.find((s) => s.id === id)?.tone || "default";

export default function PatientDetailModal({ patient, onClose, onUpdate, onDelete, onEdit }) {
  const [showFitting, setShowFitting] = useState(false);
  const [editingFitting, setEditingFitting] = useState(null);
  const [confirmDeleteFitting, setConfirmDeleteFitting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  const fittings = patient.fittings || [];

  const addFitting = (fitting) => {
    const updated = { ...patient, fittings: [{ id: uid(), ...fitting }, ...fittings] };
    onUpdate(updated);
    setShowFitting(false);
  };

  const saveEditedFitting = (fitting) => {
    const updated = { ...patient, fittings: fittings.map((f) => (f.id === editingFitting.id ? { ...f, ...fitting } : f)) };
    onUpdate(updated);
    setEditingFitting(null);
  };

  const deleteFitting = (fittingId) => {
    const updated = { ...patient, fittings: fittings.filter((f) => f.id !== fittingId) };
    onUpdate(updated);
    setConfirmDeleteFitting(null);
  };

  return (
    <Modal title={patient.name} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={patient.name} size={48} photo={patient.photo} />
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
        <button onClick={onEdit} className="w-7 h-7 rounded-full bg-border flex items-center justify-center flex-shrink-0">
          <Pencil size={12} className="text-ink" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-sm font-semibold text-ink flex items-center gap-1">
          <ScanEye size={13} className="text-focus" /> Fitting history
        </h4>
        <button onClick={() => setShowFitting(true)} className="text-xs font-medium flex items-center gap-1 text-focus">
          <Plus size={13} /> Add fitting
        </button>
      </div>

      {fittings.length === 0 ? (
        <p className="text-xs mb-4 text-slate">No fittings recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {fittings.map((rx) => (
            <div key={rx.id} className="rounded-xl p-3 bg-focusSoft/40 border border-focus/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs font-semibold text-ink">{formatDate(rx.date)}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase bg-ink/10 text-ink">{rx.lensType}</span>
                  <StatusPill label={fittingStatusLabel(rx.status)} tone={statusTone(rx.status)} />
                </div>
                {confirmDeleteFitting === rx.id ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setConfirmDeleteFitting(null)} className="text-[10px] px-2 py-0.5 text-slate">Cancel</button>
                    <button onClick={() => deleteFitting(rx.id)} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium bg-warn">Delete</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditingFitting(rx)} className="w-6 h-6 rounded-full flex items-center justify-center bg-focusSoft">
                      <Pencil size={11} className="text-focus" />
                    </button>
                    <button onClick={() => setConfirmDeleteFitting(rx.id)} className="w-6 h-6 rounded-full flex items-center justify-center bg-warnSoft">
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
              {rx.lensType === "Scleral" && (rx.odTopography || rx.osTopography) && (
                <div className="mt-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate mb-1 flex items-center gap-1">
                    <ScanEye size={11} /> Corneal topography
                  </p>
                  <div className="flex gap-2">
                    {rx.odTopography && (
                      <button type="button" onClick={() => setViewingImage(rx.odTopography)} className="flex flex-col items-center gap-0.5">
                        <img src={rx.odTopography} alt="OD topography" className="w-14 h-14 rounded-lg object-cover border border-focus/30" />
                        <span className="text-[9px] text-slate">OD</span>
                      </button>
                    )}
                    {rx.osTopography && (
                      <button type="button" onClick={() => setViewingImage(rx.osTopography)} className="flex flex-col items-center gap-0.5">
                        <img src={rx.osTopography} alt="OS topography" className="w-14 h-14 rounded-lg object-cover border border-focus/30" />
                        <span className="text-[9px] text-slate">OS</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              {rx.brand && <p className="text-[11px] mt-2 text-slate"><span className="font-semibold">Brand:</span> {rx.brand}</p>}
              {rx.nextFollowUp && (
                <p className="text-[11px] mt-1 text-slate flex items-center gap-1">
                  <CalendarClock size={11} /> Next follow-up: {formatDate(rx.nextFollowUp)}
                </p>
              )}
              {rx.notes && <p className="text-[11px] mt-1 text-slate">{rx.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showFitting && <AddFittingModal onClose={() => setShowFitting(false)} onSave={addFitting} />}
      {editingFitting && <AddFittingModal initial={editingFitting} onClose={() => setEditingFitting(null)} onSave={saveEditedFitting} />}
      {viewingImage && <ImageLightbox src={viewingImage} alt="Corneal topography" onClose={() => setViewingImage(null)} />}

      {confirmDelete ? (
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
      )}
    </Modal>
  );
}
