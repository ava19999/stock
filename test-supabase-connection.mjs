import { createClient } from '@supabase/supabase-js';

// Test both keys
const SUPABASE_URL = 'https://doyyghsijggiibkcktuq.supabase.co';

// Current key in the codebase
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveXlnaHNpamdnaWlia2NrdHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3MTE2MzcsImV4cCI6MjAyNTI4NzYzN30.sb_publishable_d0LbRl9l1zDIpMD5wbEu1g_Hkgw1Aab';

// Try to connect with the current key
console.log('Testing connection with current key...');
const supabase = createClient(SUPABASE_URL, OLD_KEY);

async function testConnection() {
  console.log('\n--- Testing base_mjm table ---');
  try {
    const { data: mjmData, error: mjmError } = await supabase
      .from('base_mjm')
      .select('*')
      .limit(3);
    
    if (mjmError) {
      console.error('Error accessing base_mjm:', mjmError.message);
      console.error('Error details:', mjmError);
    } else {
      console.log(`✓ Successfully fetched ${mjmData?.length || 0} items from base_mjm`);
      if (mjmData && mjmData.length > 0) {
        console.log('Sample item:', JSON.stringify(mjmData[0], null, 2));
      }
    }
  } catch (e) {
    console.error('Exception accessing base_mjm:', e.message);
  }

  console.log('\n--- Testing base_bjw table ---');
  try {
    const { data: bjwData, error: bjwError } = await supabase
      .from('base_bjw')
      .select('*')
      .limit(3);
    
    if (bjwError) {
      console.error('Error accessing base_bjw:', bjwError.message);
      console.error('Error details:', bjwError);
    } else {
      console.log(`✓ Successfully fetched ${bjwData?.length || 0} items from base_bjw`);
      if (bjwData && bjwData.length > 0) {
        console.log('Sample item:', JSON.stringify(bjwData[0], null, 2));
      }
    }
  } catch (e) {
    console.error('Exception accessing base_bjw:', e.message);
  }

  console.log('\n--- Testing other tables ---');
  try {
    const { data: photoData, error: photoError } = await supabase
      .from('foto')
      .select('*')
      .limit(1);
    
    if (photoError) {
      console.error('Error accessing foto:', photoError.message);
    } else {
      console.log(`✓ Successfully accessed foto table (${photoData?.length || 0} items)`);
    }
  } catch (e) {
    console.error('Exception accessing foto:', e.message);
  }
}

testConnection().then(() => {
  console.log('\nTest complete.');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
