import React, { useRef } from "react";
import { Glasses, Check } from "lucide-react";
import { Modal } from "../shared/ui";
import ShareBar from "../shared/ShareBar";
import { formatDate } from "../../lib/format";

export default function RxSlipModal({ patient, rx, shopInfo, onClose }) {
  const slipRef = useRef(null);

  const slipText =
    `${shopInfo?.name || "Optical Shop"} — Prescription\n` +
    (shopInfo?.address ? `${shopInfo.address}\n` : "") +
    (shopInfo?.phone ? `Ph: ${shopInfo.phone}\n` : "") +
    `\nPatient: ${patient.name}\n` +
    `Date: ${formatDate(rx.date)}\n\n` +
    `                 SPH      CYL      AXIS/ADD\n` +
    `Right Eye (OD)   ${rx.odSphere || "—"}      ${rx.odCyl || "—"}      ${rx.odAxis || "—"}${rx.odAdd ? ` / ${rx.odAdd}` : ""}\n` +
    `Left Eye (OS)    ${rx.osSphere || "—"}      ${rx.osCyl || "—"}      ${rx.osAxis || "—"}${rx.osAdd ? ` / ${rx.osAdd}` : ""}\n` +
    (rx.pd ? `PD: ${rx.pd}mm\n` : "") +
    ((rx.lensType || rx.coatings?.length || rx.lensIndex || rx.tint)
      ? `Lens: ${[rx.lensType, rx.lensIndex && `${rx.lensIndex} index`, rx.tint, rx.coatings?.join(" + ")].filter(Boolean).join(", ")}\n`
      : "") +
    (rx.notes ? `Notes: ${rx.notes}\n` : "");

  return (
    <Modal title="Prescription slip" onClose={onClose}>
      <ShareBar
        targetRef={slipRef}
        filenameBase={`prescription-${patient.name.replace(/\s+/g, "-").toLowerCase()}-${rx.date}`}
        shareTitle={`Prescription — ${patient.name}`}
        shareText={slipText}
      />

      <div id="print-area" ref={slipRef} className="bg-card border-[1.5px] border-border rounded-2xl p-5">
        <div className="border-b-2 border-ink pb-3 mb-3.5 flex items-center gap-3">
          <div className="bg-focus rounded-full w-[34px] h-[34px] flex items-center justify-center flex-shrink-0">
            <Glasses size={16} className="text-ink" strokeWidth={2.4} />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-ink leading-tight">{shopInfo?.name || "Optical Shop"}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate">Optical Prescription</p>
            {shopInfo?.address && <p className="text-[10px] mt-0.5 max-w-[200px] text-slate">{shopInfo.address}</p>}
            {shopInfo?.phone && <p className="text-[10px] text-slate">Ph: {shopInfo.phone}</p>}
            {shopInfo?.gstin && <p className="text-[10px] text-slate">GSTIN: {shopInfo.gstin}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate">Patient</p>
            <p className="font-display text-sm font-semibold text-ink">{patient.name}</p>
            {patient?.phone && <p className="text-[11px] mt-0.5 text-slate">Ph: {patient.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate">Date</p>
            <p className="text-sm font-semibold text-ink font-mono">{formatDate(rx.date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 text-[10px] mb-1.5 font-mono">
          <span></span>
          <span className="text-slate">SPH</span>
          <span className="text-slate">CYL</span>
          <span className="text-slate">AXIS / ADD</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-sm p-2 rounded-lg mb-1 bg-lensSoft text-ink font-mono">
          <span className="font-semibold">Right Eye (OD)</span>
          <span>{rx.odSphere || "—"}</span>
          <span>{rx.odCyl || "—"}</span>
          <span>{rx.odAxis || "—"}{rx.odAdd ? ` / ${rx.odAdd}` : ""}</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-sm p-2 rounded-lg mb-3 bg-lensSoft text-ink font-mono">
          <span className="font-semibold">Left Eye (OS)</span>
          <span>{rx.osSphere || "—"}</span>
          <span>{rx.osCyl || "—"}</span>
          <span>{rx.osAxis || "—"}{rx.osAdd ? ` / ${rx.osAdd}` : ""}</span>
        </div>

        {rx.pd && <p className="text-xs mb-1 text-slate"><span className="font-semibold">PD:</span> {rx.pd}mm</p>}
        {rx.lensType && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-3 h-3 border-[1.5px] border-ink rounded-[3px] flex items-center justify-center flex-shrink-0">
              <Check size={9} className="text-ink" strokeWidth={3} />
            </div>
            <span className="text-xs font-medium text-slate">{rx.lensType}</span>
          </div>
        )}
        {(rx.coatings?.length > 0 || rx.lensIndex || rx.tint) && (
          <p className="text-xs mb-1 text-slate">
            <span className="font-semibold">Lens:</span>{" "}
            {[rx.lensIndex && `${rx.lensIndex} index`, rx.tint, rx.coatings?.length ? rx.coatings.join(" + ") : null].filter(Boolean).join(", ")}
          </p>
        )}
        {rx.notes && <p className="text-xs mb-3 text-slate"><span className="font-semibold">Notes:</span> {rx.notes}</p>}
        {rx.framePhoto && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wide mb-1 text-slate">Booked frame</p>
            <img src={rx.framePhoto} alt="Booked frame" className="w-[90px] h-[90px] rounded-[10px] object-cover border border-border" />
          </div>
        )}
        <div className="border-t border-dashed border-border pt-3.5 mt-2.5 flex items-end justify-between">
          <div>
            <div className="border-b border-slate w-[140px] h-6" />
            <p className="text-[10px] mt-1 text-slate">Optometrist signature</p>
          </div>
          <p className="text-[10px] text-right max-w-[120px] text-slate">Valid for 2 years from issue date unless noted otherwise.</p>
        </div>
      </div>
    </Modal>
  );
}
