import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const config = {
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: 'supabase.dosmundos.pe', // Try domain first
  port: 5432,
  database: 'postgres',
  ssl: false // Usually self-hosted doesn't enforce SSL on direct IP, or might need it. Let's try false first.
};

// Fallback to IP if domain fails? Or maybe try IP directly.
// config.host = '72.61.186.175';

async function run() {
  console.log('Connecting to database...', { ...config, password: '***' });
  const client = new Client(config);

  try {
    await client.connect();
    console.log('Connected successfully!');

    const res = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, column_name;
    `);

    const schema = {};
    res.rows.forEach(row => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push(`${row.column_name} (${row.data_type})`);
    });

    console.log(JSON.stringify(schema, null, 2));

  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}

run();
