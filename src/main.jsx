import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
import "./index.css";
import { reloadOnStaleChunk } from "./lib/staleChunkRecovery";

// Every deploy renames the lazy-loaded chunk files (BarcodeScanner, etc.)
// via their content hash. A tab/installed-PWA that's had the app open (or
// cached) since before a new deploy still has the OLD file names baked
// into its already-loaded JS, so the first time it tries to lazy-load one
// of those chunks (e.g. opening the barcode scanner) it 404s against the
// new deployment with "Failed to fetch dynamically imported module" --
// this reloads the page once to pick up the current deployment instead of
// leaving the user stuck on that dead-end error screen.
reloadOnStaleChunk();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <UpdateBanner />
  </React.StrictMode>
);
