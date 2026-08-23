import { useEffect, useRef } from "react";
import QRCode from "qrcode";

// Renders a QR code for a SKU instead of a 1D barcode. On a label this
// physically tiny, a phone camera struggles to resolve the fine bar/space
// widths a 1D barcode (Code128) needs -- blur or a slightly off distance
// makes it unreadable. QR codes are far more forgiving: their 2D finder
// patterns and built-in error correction tolerate blur, rotation, and small
// print defects that would break a 1D scan. High error correction is used
// since the printed size is so small that some smudging is likely.
export default function QrCodeSvg({ value, style }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "H" }, (err, svgString) => {
      if (cancelled || err || !ref.current) return;
      ref.current.innerHTML = svgString;
      const svg = ref.current.querySelector("svg");
      if (svg && style) Object.assign(svg.style, style);
    });
    return () => {
      cancelled = true;
    };
  }, [value, style]);

  if (!value) return null;
  return <div ref={ref} />;
}
