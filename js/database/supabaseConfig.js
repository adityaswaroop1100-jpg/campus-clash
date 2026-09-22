/**
 * Campus Clash 2D — Supabase Configuration
 * Stores project URL and anon public key.
 * Can be populated directly here or configured via the in-game UI settings.
 * @module database/supabaseConfig
 */

// Default configuration (can be updated with your Supabase credentials)
export const DEFAULT_SUPABASE_CONFIG = {
  // Supabase Project URL for Campus Clash
  url: 'https://baiuvgmuwocvhhzmqyuf.supabase.co',
  // Replace with your public anon key
  anonKey: ''
};

const STORAGE_KEY_URL = 'campus_clash_supabase_url';
const STORAGE_KEY_KEY = 'campus_clash_supabase_key';

export function getSupabaseCredentials() {
  const hasStorage = typeof localStorage !== 'undefined';
  const storedUrl = hasStorage ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const storedKey = hasStorage ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  return {
    url: storedUrl || DEFAULT_SUPABASE_CONFIG.url,
    anonKey: storedKey || DEFAULT_SUPABASE_CONFIG.anonKey
  };
}

export function saveSupabaseCredentials(url, anonKey) {
  if (typeof localStorage === 'undefined') return;
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  if (anonKey) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
}

export function clearSupabaseCredentials() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
}
