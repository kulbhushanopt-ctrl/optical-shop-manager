import React from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error in app:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 text-center">
            <div className="bg-warnSoft rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={22} className="text-warn" />
            </div>
            <h1 className="font-display text-base font-bold text-ink mb-1">Something went wrong</h1>
            <p className="text-xs text-slate">{this.state.error.message || "The app hit an unexpected error."}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
