import React, { useEffect, useRef, useState } from "react";
import { X, Keyboard } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useModalBackClose } from "../../hooks/useModalBackClose";

// Full-screen in-page live barcode scanner. Reads continuously from the
// camera and calls onDetect(text) the moment a barcode is found -- no
// shutter press needed, unlike CameraCapture's photo flow. Falls back to a
// manual text entry if the camera can't be used (permission denied,
// damaged/unreadable barcode, no camera).
export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");
  useModalBackClose(onClose);

  useEffect(() => {
    let cancelled = false;
    let detected = false;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser doesn't support in-page camera access.");
        return;
      }
      try {
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              // A sharper feed lets the reader pick out thin bars from a
              // comfortable distance instead of forcing the phone closer
              // than its camera can actually focus -- the default stream
              // is low-res enough that tiny labels need an uncomfortably
              // (and often unfocusable) close-up shot to decode at all.
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current,
          (result, _err, ctrl) => {
            if (result && !detected) {
              detected = true;
              ctrl.stop();
              onDetect(result.getText());
            }
          }
        );
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      } catch (e) {
        if (!cancelled) setError("Couldn't access the camera — check this site's camera permission, or enter the code manually.");
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetect]);

  const enterManual = () => {
    controlsRef.current?.stop();
    setManualMode(true);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="text-white p-1" aria-label="Close">
          <X size={22} />
        </button>
        <span className="text-white text-sm font-medium">Scan barcode</span>
        <div className="w-6" />
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {manualMode ? (
          <div className="w-full px-8">
            <input
              autoFocus
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Enter code"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </div>
        ) : error ? (
          <p className="text-white text-sm text-center px-8">{error}</p>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="max-h-full max-w-full object-contain" />
            <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-20 border-2 border-focus rounded-lg pointer-events-none" />
          </>
        )}
      </div>

      <div className="p-5 flex items-center justify-center gap-3 flex-shrink-0">
        {manualMode ? (
          <button
            onClick={() => manualValue.trim() && onDetect(manualValue.trim())}
            disabled={!manualValue.trim()}
            className="px-6 py-3 rounded-full bg-focus text-ink text-sm font-semibold disabled:opacity-50"
          >
            Use code
          </button>
        ) : (
          <button onClick={enterManual} className="px-5 py-3 rounded-full bg-white/10 text-white text-sm font-semibold flex items-center gap-1.5">
            <Keyboard size={15} /> Enter code manually
          </button>
        )}
      </div>
    </div>
  );
}
