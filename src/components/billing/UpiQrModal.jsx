import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Share2, Download } from "lucide-react";
import { canvasToBlob, downloadBlob, tryShareFiles } from "../../lib/share";
import { buildUpiLink } from "../../lib/upi";
import { currency } from "../../lib/format";

export default function UpiQrModal({ upiId, payeeName, amount, note, onClose }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const link = buildUpiLink({ upiId, payeeName, amount, note });

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, link, { margin: 1, width: 240 }, (err) => {
      if (err) setError("Couldn't generate the QR code.");
    });
  }, [link]);

  const withBlob = async (fn) => {
    setBusy(true);
    setError("");
    try {
      const blob = await canvasToBlob(canvasRef.current, "image/png");
      await fn(blob);
    } catch (e) {
      setError("Something went wrong — please try again.");
    }
    setBusy(false);
  };

  const share = () =>
    withBlob(async (blob) => {
      const file = new File([blob], "pay-qr.png", { type: "image/png" });
      const text = `Pay ${currency(amount)} to ${payeeName || "us"} via UPI — scan the attached QR, or pay directly to ${upiId}.`;
      const shared = await tryShareFiles([file], { title: "Payment QR", text });
      if (!shared) downloadBlob(blob, "pay-qr.png");
    });

  const download = () => withBlob((blob) => downloadBlob(blob, "pay-qr.png"));

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl p-5 w-full max-w-xs text-center">
        <div className="flex justify-end -mt-1 -mr-1">
          <button onClick={onClose} className="text-slate p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm font-semibold text-ink">Scan to pay {currency(amount)}</p>
        <p className="text-xs text-slate mb-3 font-mono">{upiId}</p>
        {error ? (
          <p className="text-xs text-warn py-10">{error}</p>
        ) : (
          <canvas ref={canvasRef} className="mx-auto rounded-xl" />
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={share}
            disabled={busy || !!error}
            className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold bg-ink text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Share2 size={14} /> Share
          </button>
          <button
            onClick={download}
            disabled={busy || !!error}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold bg-paper text-ink border border-border disabled:opacity-50"
            aria-label="Download QR"
          >
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
