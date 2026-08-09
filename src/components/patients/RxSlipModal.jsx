import React, { useRef } from "react";
import { Glasses, Check } from "lucide-react";
import { Modal } from "../shared/ui";
import ShareBar from "../shared/ShareBar";
import { formatDate, calculateAge } from "../../lib/format";

const pad = (s, n) => String(s ?? "—").padEnd(n, " ");

export default function RxSlipModal({ patient, rx, shopInfo, onClose }) {
  const slipRef = useRef(null);
  const age = calculateAge(patient.dob);

  const slipText =
    `${shopInfo?.name || "Optical Shop"} — Prescription\n` +
    (shopInfo?.address ? `${shopInfo.address}\n` : "") +
    (shopInfo?.phone ? `Ph: ${shopInfo.phone}\n` : "") +
    `\nPatient: ${patient.name}${age != null ? ` (Age ${age})` : ""}\n` +
    `Date: ${formatDate(rx.date)}\n` +
    (rx.chiefComplaint ? `Chief complaint: ${rx.chiefComplaint}\n` : "") +
    `\n${pad("", 15)}${pad("SPH", 9)}${pad("CYL", 9)}${pad("AXIS", 7)}${pad("ADD", 8)}VA\n` +
    `${pad("Right Eye (OD)", 15)}${pad(rx.odSphere, 9)}${pad(rx.odCyl, 9)}${pad(rx.odAxis, 7)}${pad(rx.odAdd, 8)}${rx.odVA || "—"}\n` +
    `${pad("Left Eye (OS)", 15)}${pad(rx.osSphere, 9)}${pad(rx.osCyl, 9)}${pad(rx.osAxis, 7)}${pad(rx.osAdd, 8)}${rx.osVA || "—"}\n` +
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
            <p className="font-display text-sm font-semibold text-ink">
              {patient.name}
              {age != null && <span className="font-normal text-slate"> · Age {age}</span>}
            </p>
            {patient?.phone && <p className="text-[11px] mt-0.5 text-slate">Ph: {patient.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate">Date</p>
            <p className="text-sm font-semibold text-ink font-mono">{formatDate(rx.date)}</p>
          </div>
        </div>

        {rx.chiefComplaint && (
          <p className="text-[11px] mb-3 text-ink"><span className="font-semibold">Chief complaint:</span> {rx.chiefComplaint}</p>
        )}

        <div className="rounded-lg overflow-hidden border border-lens/30 mb-3">
          <table className="w-full table-fixed text-xs font-mono border-collapse">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "15.6%" }} />
              <col style={{ width: "15.6%" }} />
              <col style={{ width: "15.6%" }} />
              <col style={{ width: "15.6%" }} />
              <col style={{ width: "15.6%" }} />
            </colgroup>
            <thead>
              <tr className="bg-lensSoft">
                <th className="py-1.5 px-1 text-left text-[9px] text-slate font-medium"></th>
                <th className="py-1.5 px-1 text-[9px] text-slate font-medium border-l border-lens/20">SPH</th>
                <th className="py-1.5 px-1 text-[9px] text-slate font-medium border-l border-lens/20">CYL</th>
                <th className="py-1.5 px-1 text-[9px] text-slate font-medium border-l border-lens/20">AXIS</th>
                <th className="py-1.5 px-1 text-[9px] text-slate font-medium border-l border-lens/20">ADD</th>
                <th className="py-1.5 px-1 text-[9px] text-slate font-medium border-l border-lens/20">VA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-lensSoft/50 border-t border-lens/20">
                <td className="py-1.5 px-1 font-semibold text-ink leading-tight">OD</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.odSphere || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.odCyl || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.odAxis || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.odAdd || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.odVA || "—"}</td>
              </tr>
              <tr className="bg-lensSoft/50 border-t border-lens/20">
                <td className="py-1.5 px-1 font-semibold text-ink leading-tight">OS</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.osSphere || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.osCyl || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.osAxis || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.osAdd || "—"}</td>
                <td className="py-1.5 px-1 text-center text-ink border-l border-lens/20">{rx.osVA || "—"}</td>
              </tr>
            </tbody>
          </table>
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
