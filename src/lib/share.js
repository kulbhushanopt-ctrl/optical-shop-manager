import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function captureNodeCanvas(node) {
  return html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
}

export function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.95));
}

export async function canvasToPdfBlob(canvas) {
  const pdf = new jsPDF({
    orientation: canvas.height >= canvas.width ? "portrait" : "landscape",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
  return pdf.output("blob");
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function tryShareFiles(files, meta) {
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ files, ...meta });
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

// If `phone` is given, opens a chat with that contact directly instead of
// letting the user pick one. Assumes a 10-digit number without a country
// code is Indian (the app's target market) and prefixes 91; anything else
// is passed through digits-only as-is.
export function openWhatsapp(text, phone) {
  const digits = (phone || "").replace(/\D/g, "");
  const target = digits ? (digits.length === 10 ? `91${digits}` : digits) : "";
  window.open(`https://wa.me/${target}?text=${encodeURIComponent(text)}`, "_blank");
}
