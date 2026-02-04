import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const config = {
  user: 'supabase_admin',
  password: process.env.VPS_PASSWORD, // Trying VPS password
  host: '72.61.186.175', // Try IP directly
  port: 5432,
  database: 'postgres',
  ssl: false
};

async function run() {
  console.log('Connecting to database...', { ...config, password: '***' });
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected successfully!');
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

run();
