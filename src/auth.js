// src/auth.js
import { supabase } from "./supabaseClient";

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// Listen for auth changes (optional)
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    cb(event, session);
  });
  return () => data.subscription.unsubscribe();
}
