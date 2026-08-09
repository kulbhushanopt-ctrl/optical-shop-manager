import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Plus, Search, Download, Users, ChevronRight } from "lucide-react";
import { createPatient, updatePatient as apiUpdatePatient, deletePatient as apiDeletePatient } from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState, Avatar } from "../shared/ui";
import { formatDate, todayISO } from "../../lib/format";
import AddPatientModal from "./AddPatientModal";
import PatientDetailModal from "./PatientDetailModal";

export default function PatientsTab({ patients, setPatients, branchId, isOwner, shopInfo, invoices }) {
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [openPatientId, setOpenPatientId] = useState(null);
  const [error, setError] = useState("");

  const filtered = patients.filter((p) => `${p.name}${p.phone || ""}`.toLowerCase().includes(query.toLowerCase()));
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
      const p = await createPatient(branchId, data);
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

  return (
    <div>
      <SectionHeader
        title="Patients"
        subtitle={`${patients.length} on file`}
        action={
          <RoundIconBtn onClick={() => setShowAdd(true)} tone="focus">
            <Plus size={17} className="text-ink" />
          </RoundIconBtn>
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
        <div className="px-5 flex flex-col gap-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpenPatientId(p.id)}
              className="rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform bg-card border border-border"
            >
              <Avatar name={p.name} photo={p.photo} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-ink">{p.name}</p>
                <p className="text-xs truncate text-slate">
                  {p.phone || "No phone"} · {(p.prescriptions || []).length} Rx on file
                </p>
              </div>
              <ChevronRight size={16} className="text-slate" />
            </button>
          ))}
        </div>
      )}

      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onSave={addPatient} />}
      {editPatient && <AddPatientModal initial={editPatient} onClose={() => setEditPatient(null)} onSave={saveEditedPatient} />}
      {openPatient && (
        <PatientDetailModal
          patient={openPatient}
          onClose={() => setOpenPatientId(null)}
          onUpdate={updatePatientRx}
          onDelete={deletePatient}
          onEdit={() => setEditPatient(openPatient)}
          canDelete={isOwner}
          shopInfo={shopInfo}
        />
      )}
    </div>
  );
}
