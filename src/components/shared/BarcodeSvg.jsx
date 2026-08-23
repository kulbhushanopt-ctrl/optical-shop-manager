import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

// Renders a Code128 barcode for a SKU. Code128 handles any ASCII text, so
// it works with whatever SKU format a shop already uses (no fixed digit
// count required, unlike EAN/UPC).
export default function BarcodeSvg({ value, height = 36, width = 1.4, fontSize = 10, fontOptions = "", style }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, { format: "CODE128", height, width, fontSize, fontOptions, margin: 4, displayValue: true });
    } catch (e) {
      /* characters the encoder can't handle -- leave the label blank rather than crash */
    }
  }, [value, height, width, fontSize, fontOptions]);

  if (!value) return null;
  // JsBarcode sets a viewBox matching its own width/height, so overriding
  // the rendered size via `style` scales the whole barcode (bars included)
  // to fit whatever space is available instead of clipping or overflowing.
  return <svg ref={ref} style={style} />;
}
