import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Modal, PrimaryBtn } from "../shared/ui";
import { createPatients } from "../../lib/api";

const FIELD_ALIASES = {
  name: ["name", "full name", "patient name"],
  phone: ["phone", "mobile", "contact", "phone number", "mobile number"],
  dob: ["dob", "date of birth", "birth date", "birthdate"],
  age: ["age"],
  address: ["address", "addr"],
  notes: ["notes", "note", "remarks"],
};

const TEMPLATE_HEADERS = ["Name", "Phone", "Date of Birth", "Address", "Notes"];
const TEMPLATE_SAMPLE = ["Jordan Lee", "+91 98765 43210", "1990-05-12", "House 12, MG Road, Chandigarh", "Prefers progressive lenses"];

function normalizeHeader(h) {
  return String(h ?? "").trim().toLowerCase();
}

function buildFieldMap(headers) {
  const map = {};
  headers.forEach((h) => {
    const norm = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (!map[field] && aliases.includes(norm)) map[field] = h;
    }
  });
  return map;
}

// Local getters (not toISOString) so a spreadsheet's date cell doesn't shift
// by a day when the browser's timezone is behind UTC.
function dateToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDobISO(rawDob, rawAge) {
  if (rawDob instanceof Date && !isNaN(rawDob)) return dateToISO(rawDob);
  const str = String(rawDob ?? "").trim();
  if (str) {
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    const parsed = new Date(str);
    if (!isNaN(parsed)) return dateToISO(parsed);
  }
  // No usable DOB -- fall back to an estimated Jan 1 birth year from an
  // Age column, same convention the AI intake scan uses.
  const age = Number(rawAge);
  if (Number.isFinite(age) && age > 0) return `${new Date().getFullYear() - age}-01-01`;
  return "";
}

function parseRows(rawRows) {
  if (!rawRows.length) return [];
  const fieldMap = buildFieldMap(Object.keys(rawRows[0]));
  return rawRows.map((row) => {
    const get = (f) => (fieldMap[f] != null ? row[fieldMap[f]] : undefined);
    const name = String(get("name") ?? "").trim();
    const patient = {
      name,
      phone: String(get("phone") ?? "").trim(),
      address: String(get("address") ?? "").trim(),
      notes: String(get("notes") ?? "").trim(),
      dob: toDobISO(get("dob"), get("age")),
    };
    const errors = [];
    if (!name) errors.push("name");
    return { item: patient, valid: errors.length === 0, errors };
  });
}

export default function ImportPatientsExcelModal({ branchId, onClose, onImported }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!rawRows.length) {
          setError("That file doesn't have any data rows.");
        } else {
          setRows(parseRows(rawRows));
          setFileName(file.name);
        }
      } catch (err) {
        setError("Couldn't read that file — make sure it's a valid Excel or CSV file.");
      }
      setParsing(false);
    };
    reader.onerror = () => {
      setError("Couldn't read that file — please try again.");
      setParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Patients");
    XLSX.writeFile(wb, "patients-import-template.xlsx");
  };

  const validRows = (rows || []).filter((r) => r.valid);
  const invalidCount = (rows || []).length - validRows.length;

  const handleImport = async () => {
    setImporting(true);
    setError("");
    try {
      const created = await createPatients(branchId, validRows.map((r) => r.item));
      onImported(created);
    } catch (err) {
      setError("Import failed — please try again.");
      setImporting(false);
    }
  };

  return (
    <Modal title="Import patients from Excel" onClose={onClose}>
      {!rows ? (
        <>
          <p className="text-xs text-slate mb-3">
            Upload a spreadsheet with columns like Name, Phone, Date of Birth, Address, Notes — one row per patient. Only Name is required.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="w-full py-2.5 rounded-xl border border-dashed border-border text-slate text-xs font-semibold flex items-center justify-center gap-1.5 mb-3"
          >
            <Download size={14} /> Download a template
          </button>
          <label className="w-full py-2.5 rounded-xl border border-dashed border-lens/50 bg-lensSoft text-lens text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {parsing ? "Reading file…" : "Choose Excel or CSV file"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} disabled={parsing} />
          </label>
          {error && <p className="text-[11px] text-warn mt-2">{error}</p>}
        </>
      ) : (
        <>
          <p className="text-xs text-slate mb-1 truncate">{fileName}</p>
          <p className="text-sm font-medium text-ink mb-3">
            {validRows.length} patient{validRows.length === 1 ? "" : "s"} ready to import
            {invalidCount > 0 && <span className="text-warn"> · {invalidCount} skipped</span>}
          </p>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border mb-3">
            {rows.map((r, i) => (
              <div key={i} className="px-3 py-2 flex items-center gap-2 text-xs">
                {r.valid ? (
                  <CheckCircle2 size={13} className="text-lens flex-shrink-0" />
                ) : (
                  <AlertTriangle size={13} className="text-warn flex-shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate text-ink">{r.item.name || "—"}</span>
                {r.valid ? (
                  <span className="text-slate flex-shrink-0">{r.item.phone || "no phone"}</span>
                ) : (
                  <span className="text-warn flex-shrink-0">missing {r.errors.join(", ")}</span>
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-[11px] text-warn mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRows(null)}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-slate"
            >
              Choose a different file
            </button>
            <div className="flex-1">
              <PrimaryBtn full disabled={validRows.length === 0 || importing} onClick={handleImport}>
                {importing ? "Importing…" : `Import ${validRows.length}`}
              </PrimaryBtn>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
