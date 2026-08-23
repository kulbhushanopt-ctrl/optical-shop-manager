const RELOAD_GUARD_KEY = "optishop_stale_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 15000;

function isStaleChunkError(message) {
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    message || ""
  );
}

// Only reload once per cooldown window -- if the app is still stuck on a
// stale/missing chunk right after a reload, the deployment itself is
// broken and reloading again forever would just loop instead of surfacing
// the real error.
function reloadOnce() {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0;
  } catch {
    /* sessionStorage unavailable -- fall through and reload anyway */
  }
  if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

// Vite's own recommended hook for exactly this failure mode: fires on the
// window whenever a dynamically-imported (lazy) or modulepreloaded chunk
// fails to load.
export function reloadOnStaleChunk() {
  window.addEventListener("vite:preloadError", () => {
    reloadOnce();
  });
}

// Backstop for when the failure surfaces as a thrown error caught by
// React's error boundary instead of (or in addition to) the vite event --
// returns true if it recognized and handled (reloaded for) this error, so
// the caller can skip rendering its normal fallback UI.
export function tryRecoverFromStaleChunk(error) {
  if (!isStaleChunkError(error?.message)) return false;
  return reloadOnce();
}
