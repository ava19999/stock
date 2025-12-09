// FILE: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Mengambil URL dan Key dari file .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validasi sederhana agar kita tahu jika lupa setting di .env
if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR CRITICAL: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum di-set di file .env!");
}

// Membuat instance client Supabase yang akan dipakai di seluruh aplikasi
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');