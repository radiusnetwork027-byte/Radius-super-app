import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://iuamirfizhgyxncanest.supabase.co";
const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1YW1pcmZpemhneXhuY2FuZXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3ODgzMjYsImV4cCI6MjEwNzM2NDMyNn0.I4l5hK-AeCOoH7DtcjCHpX9Mz9aRd0TFdIym1VHzdBE";

export const SUPABASE_URL = url;
export const OWNER_EMAILS = ["radiusnetwork027@gmail.com", "radiosnetwork027@gmail.com"];

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export function isOwnerEmail(email: string | null | undefined) {
  return OWNER_EMAILS.includes((email || "").trim().toLowerCase());
}
