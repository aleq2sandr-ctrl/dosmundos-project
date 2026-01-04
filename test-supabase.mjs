import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

(async () => {
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SERVICE_ROLE_KEY set:', !!process.env.SERVICE_ROLE_KEY);

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe',
      process.env.SERVICE_ROLE_KEY
    );

    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('transcripts')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
    } else {
      console.log('Supabase connection successful');
    }
  } catch (error) {
    console.error('Connection failed:', error);
  }
})();
