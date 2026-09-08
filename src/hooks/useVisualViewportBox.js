import { useEffect, useState } from "react";

// iOS Safari's `position: fixed` elements are pinned to the layout
// viewport, which does NOT shrink when the on-screen keyboard opens --
// only the "visual viewport" (what's actually visible on screen) does.
// So a `fixed inset-0` modal keeps spanning the full pre-keyboard page
// height, and content bottom-aligned inside it (like a Save button) ends
// up positioned behind the keyboard instead of above it, even with
// vh-based sizing or the interactive-widget viewport meta tag (support
// for that is inconsistent across iOS versions). Tracking the real
// visual viewport directly via this API -- supported since iOS 13 -- and
// sizing/positioning the modal off it in pixels sidesteps the bug
// entirely instead of hoping the browser resizes the layout for us.
export function useVisualViewportBox() {
  const [box, setBox] = useState(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setBox({ height: vv.height, top: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return box;
}
