import React, { useState } from "react";
import { Phone, MapPin, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Modal, Avatar } from "../shared/ui";
import { formatDate, calculateAge } from "../../lib/format";
import { uid } from "../../lib/rxConstants";
import { todayISO } from "../../lib/format";
import AddRxModal from "./AddRxModal";
import RxSlipModal from "./RxSlipModal";

export default function PatientDetailModal({ patient, onClose, onUpdate, onDelete, onEdit, canDelete, shopInfo }) {
  const [showRx, setShowRx] = useState(false);
  const [editingRx, setEditingRx] = useState(null);
  const [confirmDeleteRx, setConfirmDeleteRx] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slipRx, setSlipRx] = useState(null);

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

  const prescriptions = patient.prescriptions || [];

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
        <h4 className="font-display text-sm font-semibold text-ink">Glasses prescription</h4>
        <button onClick={() => setShowRx(true)} className="text-xs font-medium flex items-center gap-1 text-lens">
          <Plus size={13} /> Add Rx
        </button>
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
