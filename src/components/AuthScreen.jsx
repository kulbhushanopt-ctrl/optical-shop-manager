import React, { useState } from "react";
import { Glasses } from "lucide-react";
import { signIn, signUp } from "../lib/api";
import { Field, TextInput, PrimaryBtn } from "./shared/ui";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedUpMsg, setSignedUpMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSignedUpMsg("");
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        const result = await signUp(email.trim(), password);
        if (!result?.session) {
          setSignedUpMsg("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-focus rounded-full w-[52px] h-[52px] flex items-center justify-center mb-3">
            <Glasses size={24} className="text-ink" strokeWidth={2.4} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">Optical Shop Manager</h1>
          <p className="text-xs text-slate mt-1">{mode === "signin" ? "Sign in to your shop" : "Create your shop account"}</p>
        </div>

        <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-5">
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
              autoComplete="username"
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </Field>

          {error && <p className="text-xs text-warn mb-3">{error}</p>}
          {signedUpMsg && <p className="text-xs text-good mb-3">{signedUpMsg}</p>}

          <PrimaryBtn full type="submit" disabled={busy || !email.trim() || !password}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </PrimaryBtn>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setSignedUpMsg("");
          }}
          className="text-xs font-medium text-lens mt-4 mx-auto block"
        >
          {mode === "signin" ? "First time here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
