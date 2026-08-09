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

export function openWhatsapp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
