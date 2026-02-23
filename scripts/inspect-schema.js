import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('table_name, column_name, data_type')
    .eq('table_schema', 'public')
    .order('table_name')
    .order('column_name');

  if (error) {
    // Try RPC if direct access to information_schema is blocked
    console.error('Error querying information_schema directly:', error);
    console.log('Trying to infer from common tables...');
    // Fallback: try to select * from known tables with limit 0 to get structure? 
    // No, that won't give column names easily in JS client without data.
    return;
  }

  const schema = {};
  data.forEach(row => {
    if (!schema[row.table_name]) {
      schema[row.table_name] = [];
    }
    schema[row.table_name].push(row.column_name);
  });

  console.log(JSON.stringify(schema, null, 2));
}

inspectSchema();
