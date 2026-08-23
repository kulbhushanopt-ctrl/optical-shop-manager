import React, { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Image as ImageIcon } from "lucide-react";
import { compressImage } from "../../lib/image";
import { useModalBackClose, notifyFilePickerOpening } from "../../hooks/useModalBackClose";

// Full-screen in-page camera using getUserMedia, instead of handing off to
// the device's native camera app. Launching a native app from a file input
// (capture="environment") backgrounds the browser tab, and some mobile
// browsers/webviews reclaim that memory and reload the page on return --
// silently wiping whatever modal/form state was open. Staying inside the
// page for the whole capture avoids that entirely.
export default function CameraCapture({ onCapture, onClose, maxDim = 900, quality = 0.8 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(null);
  useModalBackClose(onClose);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser doesn't support in-page camera access.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError("Couldn't access the camera — check this site's camera permission, or pick a photo from your gallery instead.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    let { videoWidth: width, videoHeight: height } = video;
    if (width > height && width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else if (height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);
    setPhoto(canvas.toDataURL("image/jpeg", quality));
  };

  const handleGalleryPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, maxDim, quality);
      onCapture(dataUrl);
    } catch (err) {
      setError("Couldn't read that photo — please try another.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="text-white p-1" aria-label="Close">
          <X size={22} />
        </button>
        <span className="text-white text-sm font-medium">Scan</span>
        <div className="w-6" />
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white text-sm text-center px-8">{error}</p>
        ) : photo ? (
          <img src={photo} alt="Captured" className="max-h-full max-w-full object-contain" />
        ) : (
          <video ref={videoRef} playsInline muted className="max-h-full max-w-full object-contain" />
        )}
      </div>

      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryPick} />

      <div className="p-5 flex items-center justify-center gap-4 flex-shrink-0">
        {error ? (
          <button
            onClick={() => {
              notifyFilePickerOpening();
              galleryInputRef.current?.click();
            }}
            className="px-5 py-3 rounded-full bg-white/10 text-white text-sm font-semibold flex items-center gap-1.5"
          >
            <ImageIcon size={15} /> Choose from gallery
          </button>
        ) : photo ? (
          <>
            <button onClick={() => setPhoto(null)} className="px-5 py-3 rounded-full bg-white/10 text-white text-sm font-semibold flex items-center gap-1.5">
              <RotateCcw size={15} /> Retake
            </button>
            <button onClick={() => onCapture(photo)} className="px-6 py-3 rounded-full bg-focus text-ink text-sm font-semibold">
              Use photo
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                notifyFilePickerOpening();
                galleryInputRef.current?.click();
              }}
              className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center flex-shrink-0"
              aria-label="Choose from gallery"
            >
              <ImageIcon size={18} />
            </button>
            <button onClick={capture} className="w-16 h-16 rounded-full bg-white flex items-center justify-center" aria-label="Capture photo">
              <div className="w-14 h-14 rounded-full border-2 border-ink" />
            </button>
            <div className="w-11 h-11 flex-shrink-0" />
          </>
        )}
      </div>
    </div>
  );
}
