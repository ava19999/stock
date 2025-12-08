// FILE: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Ambil dari Environment Variable (Aman)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Pengecekan agar tidak crash blank putih jika lupa setting
if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Harap set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env atau Vercel Settings");
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');