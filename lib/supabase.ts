// FILE: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://doyyghsijggiibkcktuq.supabase.co';
// NOTE: This ANON_KEY is provided by the user. The JWT payload appears to be missing the role value,
// which may cause authentication issues. If problems occur, regenerate the key in Supabase dashboard.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveXlnaHNpamdnaWlia2NrdHVxIiwicm9sZSIsImlhdCI6MTc2NTI1OTc1NiwiZXhwIjoyMDgwODM1NzU2fQ.HMq3LhppPRiHenYYZPtOMIX9BKkyqQUqCoCdAjIN3bo';

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized successfully with URL:', SUPABASE_URL);
