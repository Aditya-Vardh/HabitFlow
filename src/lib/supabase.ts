import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn instead of throwing so the app can render in dev without config set.
  // Runtime attempts to use Supabase will still fail with clear errors.
  // Developers should set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in their .env
  // or the project will operate in a degraded state.
  // eslint-disable-next-line no-console
  console.warn('Warning: Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Auth and DB features will not work.');
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '');
