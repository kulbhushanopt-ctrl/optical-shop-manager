import { createClient } from "@supabase/supabase-js";

// Falls back to the project's public URL and anon key when env vars aren't
// set, so the app works out of the box on any host with zero configuration.
// The anon key is meant to be public — every read/write it makes is still
// gated by the database's Row Level Security policies.
const DEFAULT_SUPABASE_URL = "https://kwxmafprurnxfiofotyf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eG1hZnBydXJueGZpb2ZvdHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTYyMjcsImV4cCI6MjEwMTY3MjIyN30.KIO9c2QqwS1HLSYjGPOIRdQPNTtbk0j4DqFbbSSPSoY";

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  !url || !anonKey
    ? "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in your hosting provider's environment variables (or copy .env.example to .env locally), then redeploy."
    : null;

export const supabase = supabaseConfigError
  ? null
  : createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
