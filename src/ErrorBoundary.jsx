import React from "react";
import { AlertTriangle } from "lucide-react";
import { tryRecoverFromStaleChunk } from "./lib/staleChunkRecovery";

export default class ErrorBoundary extends React.Component {
  state = { error: null, recovering: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in app:", error, info);
    // A lazy-loaded feature (barcode scanner, etc.) failing to fetch its
    // chunk almost always means this tab/PWA had the app open from before
    // a newer version was deployed -- reload once to pick up the current
    // build instead of leaving the user stuck on a dead-end error screen.
    if (tryRecoverFromStaleChunk(error)) {
      this.setState({ recovering: true });
    }
  }

  render() {
    if (this.state.recovering) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
          <p className="text-sm text-slate">Updating the app…</p>
        </div>
      );
    }
    if (this.state.error) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 text-center">
            <div className="bg-warnSoft rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={22} className="text-warn" />
            </div>
            <h1 className="font-display text-base font-bold text-ink mb-1">Something went wrong</h1>
            <p className="text-xs text-slate mb-4">{this.state.error.message || "The app hit an unexpected error."}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold text-lens"
            >
              Reload the app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
