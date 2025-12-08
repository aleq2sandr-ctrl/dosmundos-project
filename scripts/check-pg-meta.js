import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkPgMeta() {
  console.log('Checking pg_meta access...');
  try {
    // Try to list tables via pg_meta
    // Endpoint might be /pg_meta/default/tables or just /pg_meta/tables depending on setup
    const endpoints = [
      '/pg_meta/default/tables',
      '/pg_meta/tables',
      '/api/pg_meta/default/tables'
    ];

    for (const endpoint of endpoints) {
      console.log(`Trying ${endpoint}...`);
      const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      
      if (response.ok) {
        console.log(`✅ Success! Found pg_meta at ${endpoint}`);
        const data = await response.json();
        console.log('Tables:', data.map(t => t.name));
        return;
      } else {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPgMeta();
