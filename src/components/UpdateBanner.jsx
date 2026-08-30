import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { isUpdateAvailable } from "../lib/updateCheck";

const CHECK_INTERVAL_MS = 3 * 60 * 1000;

// Checks periodically, and immediately whenever the tab/app regains focus
// -- exactly the moment a stale cached copy is most likely to matter,
// since that's when someone returns to the app expecting a fix to have
// landed. Surfaces a small, dismissible banner instead of silently
// reloading, since an unannounced reload mid-task (e.g. filling in a form)
// would be its own kind of confusing.
export default function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const found = await isUpdateAvailable();
      if (!cancelled && found) setAvailable(true);
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!available || dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto max-w-sm w-full bg-ink text-white rounded-2xl shadow-2xl shadow-black/30 px-4 py-3 flex items-center gap-3">
        <p className="text-xs flex-1">A new version of the app is available.</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 text-xs font-semibold bg-focus text-ink px-3 py-1.5 rounded-full flex-shrink-0"
        >
          <RefreshCw size={12} /> Refresh
        </button>
        <button onClick={() => setDismissed(true)} className="text-white/60 text-xs flex-shrink-0" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
