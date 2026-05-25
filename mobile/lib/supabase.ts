import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Logged to adb logcat in production; visible in Metro in dev.
  console.error(
    '[YachtOps] Supabase credentials missing from environment.\n' +
    '  EXPO_PUBLIC_SUPABASE_URL: ' + (supabaseUrl ? 'ok' : 'MISSING') + '\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY: ' + (supabaseAnonKey ? 'ok' : 'MISSING') + '\n' +
    '  In EAS: run  eas secret:create  for both variables then rebuild.'
  );
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Use placeholder strings so createClient never throws at module load time.
// Auth calls will return network errors (shown in UI) rather than crashing.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
