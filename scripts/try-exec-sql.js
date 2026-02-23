import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function tryExecSql() {
  console.log('Trying to execute SQL via RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { query: 'SELECT 1' });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

tryExecSql();
