import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Stamps a unique build id into index.html on every build so the running
// app can tell whether a freshly-fetched copy of index.html belongs to a
// newer deploy than the one it booted from -- see src/lib/updateCheck.js.
// A stale cached copy of the app (common on an installed Android PWA,
// which doesn't always re-check for updates on its own) was the root
// cause of several confusing "I fixed that, why is it still broken"
// reports, since the device was quietly still running old code.
function buildIdPlugin() {
  const buildId = String(Date.now());
  return {
    name: "build-id",
    transformIndexHtml(html) {
      return html.replace("<head>", `<head>\n    <script>window.__BUILD_ID__ = "${buildId}";</script>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), buildIdPlugin()],
});
