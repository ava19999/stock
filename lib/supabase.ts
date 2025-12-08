import { createClient } from '@supabase/supabase-js';

// Pastikan Anda sudah membuat file .env di root project dan mengisi variabel ini
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);