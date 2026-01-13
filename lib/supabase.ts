// FILE: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://doyyghsijggiibkcktuq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveXlnaHNpamdnaWlia2NrdHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3MTE2MzcsImV4cCI6MjAyNTI4NzYzN30.sb_publishable_d0LbRl9l1zDIpMD5wbEu1g_Hkgw1Aab';

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized successfully');
