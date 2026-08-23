import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Plus, Search, Download, Upload, Users, ChevronRight, CalendarClock, Flag } from "lucide-react";
import {
  createPatient,
  updatePatient as apiUpdatePatient,
  deletePatient as apiDeletePatient,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
} from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState, Avatar } from "../shared/ui";
import { formatDate, todayISO, formatTime, appointmentDayLabel } from "../../lib/format";
import { uid } from "../../lib/rxConstants";
import AddPatientModal from "./AddPatientModal";
import PatientDetailModal from "./PatientDetailModal";
import ImportPatientsExcelModal from "./ImportPatientsExcelModal";

export default function PatientsTab({ patients, setPatients, branchId, isOwner, shopInfo, invoices, appointments, setAppointments, onGenerateBill }) {
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [openPatientId, setOpenPatientId] = useState(null);
  const [error, setError] = useState("");

  const upcomingFor = (patientId) => appointments.find((a) => a.patientId === patientId && a.status === "scheduled");

  const filtered = patients
    .filter((p) => `${p.name}${p.phone || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      // Patients with an upcoming appointment float to the top, soonest
      // first, so staff sees who needs calling/attention right away.
      // Flagged patients (e.g. "needs contact lenses") come next, ahead of
      // everyone else, as a lighter-weight reminder that doesn't need a
      // scheduled appointment.
      const apA = upcomingFor(a.id);
      const apB = upcomingFor(b.id);
      if (apA && apB) return apA.scheduledAt < apB.scheduledAt ? -1 : 1;
      if (apA) return -1;
      if (apB) return 1;
      if (a.flag_note && b.flag_note) return 0;
      if (a.flag_note) return -1;
      if (b.flag_note) return 1;
      return 0;
    });
  const openPatient = patients.find((p) => p.id === openPatientId) || null;

  const exportPatientsExcel = () => {
    const rows = patients.map((p) => {
      const patientInvoices = (invoices || []).filter((i) => i.patientId === p.id);
      const rxDates = (p.prescriptions || []).map((r) => r.date).filter(Boolean);
      const invoiceDates = patientInvoices.map((i) => i.date).filter(Boolean);
      const allDates = [...rxDates, ...invoiceDates].sort();
      const lastVisit = allDates.length ? allDates[allDates.length - 1] : "";
      const totalSpent = patientInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (Number(i.total) || 0), 0);

      return {
        Name: p.name || "",
        Phone: p.phone || "",
        Address: p.address || "",
        Notes: p.notes || "",
        "Prescriptions on file": (p.prescriptions || []).length,
        Invoices: patientInvoices.length,
        "Total spent (₹)": totalSpent,
        "Last visit": lastVisit ? formatDate(lastVisit) : "—",
        "Registered on": p.created_at ? formatDate(p.created_at.slice(0, 10)) : "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 15 }, { wch: 28 }, { wch: 24 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    const branchLabel = (shopInfo?.name || "shop").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    XLSX.writeFile(wb, `${branchLabel}-patients-${todayISO()}.xlsx`);
  };

  const addPatient = async (data) => {
    try {
      // An intake-form AI scan may have carried both patient fields and a
      // first prescription (scannedRx) -- fold it into the new patient's
      // prescriptions array here, same shape AddRxModal's addRx builds.
      const { scannedRx, ...patientFields } = data;
      const prescriptions = scannedRx ? [{ id: uid(), date: todayISO(), ...scannedRx }] : [];
      const p = await createPatient(branchId, { ...patientFields, prescriptions });
      setPatients([p, ...patients]);
      setShowAdd(false);
    } catch (e) {
      setError("Couldn't save patient — please try again.");
    }
  };

  const saveEditedPatient = async (data) => {
    try {
      const updated = await apiUpdatePatient(editPatient.id, data);
      setPatients(patients.map((p) => (p.id === updated.id ? updated : p)));
      setEditPatient(null);
    } catch (e) {
      setError("Couldn't save changes — please try again.");
    }
  };

  const updatePatientRx = async (updated) => {
    try {
      const saved = await apiUpdatePatient(updated.id, {
        name: updated.name,
        phone: updated.phone,
        address: updated.address,
        notes: updated.notes,
        prescriptions: updated.prescriptions,
        contact_prescriptions: updated.contact_prescriptions,
      });
      setPatients(patients.map((p) => (p.id === saved.id ? saved : p)));
    } catch (e) {
      setError("Couldn't save changes — please try again.");
    }
  };

  const deletePatient = async (id) => {
    try {
      await apiDeletePatient(id);
      setPatients(patients.filter((p) => p.id !== id));
      setOpenPatientId(null);
    } catch (e) {
      setError("Only the shop owner can delete patients.");
    }
  };

  const bookAppointment = async (data) => {
    try {
      const saved = await createAppointment(branchId, data);
      setAppointments([...appointments, saved]);
    } catch (e) {
      setError("Couldn't book appointment — please try again.");
    }
  };

  const rescheduleAppointment = async (id, data) => {
    try {
      const updated = await updateAppointment(id, data);
      setAppointments(appointments.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError("Couldn't update appointment — please try again.");
    }
  };

  const changeAppointmentStatus = async (id, status) => {
    try {
      const updated = await updateAppointmentStatus(id, status);
      setAppointments(appointments.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError("Couldn't update appointment — please try again.");
    }
  };

  const setPatientFlag = async (id, note) => {
    try {
      const saved = await apiUpdatePatient(id, { flag_note: note || null });
      setPatients(patients.map((p) => (p.id === saved.id ? saved : p)));
    } catch (e) {
      setError("Couldn't update flag — please try again.");
    }
  };

  return (
    <div>
      <SectionHeader
        title="Patients"
        subtitle={`${patients.length} on file`}
        action={
          <div className="flex gap-2">
            <RoundIconBtn onClick={() => setShowImport(true)}>
              <Upload size={15} />
            </RoundIconBtn>
            <RoundIconBtn onClick={() => setShowAdd(true)} tone="focus">
              <Plus size={17} className="text-ink" />
            </RoundIconBtn>
          </div>
        }
      />
      {error && (
        <div className="px-5 mb-3">
          <p className="text-xs rounded-lg px-3 py-2 text-warn bg-warnSoft">{error}</p>
        </div>
      )}
      <div className="px-5 mb-3 flex gap-2">
        <div className="rounded-xl px-3 py-2 flex items-center gap-2 flex-1 bg-card border border-border">
          <Search size={15} className="text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients…"
            className="flex-1 outline-none text-sm bg-transparent text-ink"
          />
        </div>
        <button
          onClick={exportPatientsExcel}
          disabled={patients.length === 0}
          className="rounded-xl px-3 flex items-center justify-center flex-shrink-0 disabled:opacity-40 bg-card border border-border text-lens"
          title="Export patients to Excel"
        >
          <Download size={16} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No patients yet" subtitle="Add your first patient to start tracking prescriptions and visits." />
      ) : (
        <div className="px-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const appt = upcomingFor(p.id);
            const flagged = !!p.flag_note;
            return (
              <button
                key={p.id}
                onClick={() => setOpenPatientId(p.id)}
                className={`rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition duration-150 shadow-sm shadow-ink/[0.03] ${
                  appt ? "bg-focusSoft border border-focus/40" : flagged ? "bg-warnSoft border border-warn/40" : "bg-card border border-border/70"
                }`}
              >
                <Avatar name={p.name} photo={p.photo} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-ink">{p.name}</p>
                  <p className="text-xs truncate text-slate">
                    {p.phone || "No phone"} · {(p.prescriptions || []).length} Rx on file
                  </p>
                  {!appt && flagged && (
                    <p className="text-[11px] truncate text-warn font-medium mt-0.5 flex items-center gap-1">
                      <Flag size={11} className="flex-shrink-0" /> {p.flag_note}
                    </p>
                  )}
                </div>
                {appt ? (
                  <div className="flex items-center gap-1 flex-shrink-0 text-focus" title="Has an upcoming appointment">
                    <CalendarClock size={13} />
                    <span className="text-[10px] font-semibold whitespace-nowrap">{appointmentDayLabel(appt.scheduledAt)} {formatTime(appt.scheduledAt)}</span>
                  </div>
                ) : flagged ? (
                  <Flag size={16} className="text-warn flex-shrink-0" title="Flagged for follow-up" />
                ) : (
                  <ChevronRight size={16} className="text-slate flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {showAdd && <AddPatientModal branchId={branchId} onClose={() => setShowAdd(false)} onSave={addPatient} />}
      {editPatient && <AddPatientModal branchId={branchId} initial={editPatient} onClose={() => setEditPatient(null)} onSave={saveEditedPatient} />}
      {showImport && (
        <ImportPatientsExcelModal
          branchId={branchId}
          onClose={() => setShowImport(false)}
          onImported={(created) => {
            setPatients([...created, ...patients]);
            setShowImport(false);
          }}
        />
      )}
      {openPatient && (
        <PatientDetailModal
          patient={openPatient}
          branchId={branchId}
          onClose={() => setOpenPatientId(null)}
          onUpdate={updatePatientRx}
          onDelete={deletePatient}
          onEdit={() => setEditPatient(openPatient)}
          canDelete={isOwner}
          shopInfo={shopInfo}
          appointment={upcomingFor(openPatient.id)}
          onBookAppointment={bookAppointment}
          onRescheduleAppointment={rescheduleAppointment}
          onChangeAppointmentStatus={changeAppointmentStatus}
          onGenerateBill={(patientId) => {
            setOpenPatientId(null);
            onGenerateBill(patientId);
          }}
          onSetFlag={setPatientFlag}
        />
      )}
    </div>
  );
}
