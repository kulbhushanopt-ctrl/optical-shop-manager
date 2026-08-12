import { useEffect, useRef } from "react";

// Makes the phone's back button/gesture close the topmost open overlay
// instead of leaving the page -- which, in an installed PWA with no
// history depth of its own, exits the app entirely and forces a full
// reopen. Each mounted overlay pushes one history entry and registers
// itself on a shared stack; a single window-level popstate listener closes
// only the most recently opened one, so stacked modals (e.g. a Rx form
// opened from inside a patient's detail view) unwind one level per back
// press instead of all closing at once.
//
// If an overlay is dismissed some other way (X button, Save, a scan
// completing, etc.) its pushed history entry is consumed via history.back()
// on unmount so a later back press doesn't just resurface it. That
// self-triggered back() fires its own popstate event a moment later --
// without pendingSelfPops to swallow it, that event would be
// indistinguishable from a real back-button press and would incorrectly
// close whatever overlay is now on top of the stack (e.g. closing a camera
// capture view mid-scan was popping the *patient form* underneath it).
const stack = [];
let listenerAttached = false;
let pendingSelfPops = 0;

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener("popstate", () => {
    if (pendingSelfPops > 0) {
      pendingSelfPops--;
      return;
    }
    const top = stack.pop();
    if (top) {
      top.closedByPop = true;
      top.onCloseRef.current();
    }
  });
}

export function useModalBackClose(onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const entryRef = useRef(null);

  useEffect(() => {
    ensureListener();
    window.history.pushState({ overlay: true }, "");
    const entry = { onCloseRef, closedByPop: false };
    entryRef.current = entry;
    stack.push(entry);

    return () => {
      const entry = entryRef.current;
      const idx = stack.indexOf(entry);
      if (idx !== -1) stack.splice(idx, 1);
      if (!entry.closedByPop) {
        pendingSelfPops++;
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
