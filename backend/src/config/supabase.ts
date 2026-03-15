// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { config } from './index';

// Service role client — full access, used only in backend
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Anon client — for auth operations
export const supabaseAnon = createClient(
  config.supabase.url,
  config.supabase.anonKey
);
