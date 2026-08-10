import React, { useState } from "react";
import { Printer, FileText, Share2, Loader2, MessageCircle } from "lucide-react";
import { captureNodeCanvas, canvasToBlob, canvasToPdfBlob, downloadBlob, tryShareFiles, openWhatsapp } from "../../lib/share";

// `shareText` is the short caption sent alongside the image/PDF (the image
// already shows the full detail, so a long caption just duplicates it in
// the chat). `fullText` is the detailed version used only by "Share as
// text", which has no image to carry that detail -- defaults to
// `shareText` if not given.
export default function ShareBar({ targetRef, filenameBase, shareTitle, shareText, fullText }) {
  const textForTextOnly = fullText ?? shareText;
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getCanvas = async () => (targetRef.current ? captureNodeCanvas(targetRef.current) : null);

  const withBusy = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      /* export/share is best-effort */
    }
    setBusy(false);
  };

  const handleDownloadPdf = () =>
    withBusy(async () => {
      const canvas = await getCanvas();
      if (!canvas) return;
      const blob = await canvasToPdfBlob(canvas);
      downloadBlob(blob, `${filenameBase}.pdf`);
    });

  const handleShareImage = () =>
    withBusy(async () => {
      setMenuOpen(false);
      const canvas = await getCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas, "image/png");
      const file = new File([blob], `${filenameBase}.png`, { type: "image/png" });
      const shared = await tryShareFiles([file], { title: shareTitle, text: shareText });
      if (!shared) {
        downloadBlob(blob, `${filenameBase}.png`);
        openWhatsapp(shareText);
      }
    });

  const handleSharePdf = () =>
    withBusy(async () => {
      setMenuOpen(false);
      const canvas = await getCanvas();
      if (!canvas) return;
      const blob = await canvasToPdfBlob(canvas);
      const file = new File([blob], `${filenameBase}.pdf`, { type: "application/pdf" });
      const shared = await tryShareFiles([file], { title: shareTitle, text: shareText });
      if (!shared) {
        downloadBlob(blob, `${filenameBase}.pdf`);
        openWhatsapp(shareText);
      }
    });

  const handleShareTextOnly = async () => {
    setMenuOpen(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: textForTextOnly });
        return;
      } catch (e) {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(textForTextOnly);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="no-print mb-4 relative">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-ink text-ink flex items-center justify-center gap-1"
        >
          <Printer size={13} /> Print
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-ink text-ink flex items-center justify-center gap-1 disabled:opacity-60"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-lens text-white flex items-center justify-center gap-1 disabled:opacity-70"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} {copied ? "Copied!" : "Share"}
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-56 rounded-xl overflow-hidden z-10 bg-card border border-border shadow-lg">
          <button type="button" onClick={handleShareImage} className="w-full text-left px-4 py-3 text-xs font-medium flex items-center gap-2 text-ink">
            <MessageCircle size={14} className="text-lens" /> Share as image (WhatsApp)
          </button>
          <button type="button" onClick={handleSharePdf} className="w-full text-left px-4 py-3 text-xs font-medium flex items-center gap-2 text-ink border-t border-border">
            <MessageCircle size={14} className="text-lens" /> Share as PDF (WhatsApp)
          </button>
          <button type="button" onClick={handleShareTextOnly} className="w-full text-left px-4 py-3 text-xs font-medium flex items-center gap-2 text-ink border-t border-border">
            <Share2 size={14} className="text-slate" /> Share as text
          </button>
        </div>
      )}
    </div>
  );
}
