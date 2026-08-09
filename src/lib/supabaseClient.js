import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Missing env vars are a deploy-config problem, not a code crash — surfacing
// them as a message (see ConfigError screen in App.jsx) beats a blank page
// with nothing but a console error to go on.
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
