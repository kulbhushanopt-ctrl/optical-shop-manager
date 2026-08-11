import { createClient } from "@supabase/supabase-js";

// This app is intentionally independent of any other project's Supabase
// backend -- there is no baked-in fallback URL/key here, so it only ever
// talks to whichever project you point it at via these env vars.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
