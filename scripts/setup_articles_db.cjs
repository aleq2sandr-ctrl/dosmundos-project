const { Client } = require('pg');
require('dotenv').config();

const connectionString = `postgres://postgres:${process.env.POSTGRES_PASSWORD}@${process.env.VPS_IP}:5432/postgres`;

const client = new Client({
  connectionString,
});

async function setupDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create articles table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        title JSONB NOT NULL DEFAULT '{}',
        summary JSONB NOT NULL DEFAULT '{}',
        content JSONB NOT NULL DEFAULT '{}',
        categories JSONB DEFAULT '[]',
        author TEXT,
        youtube_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await client.query(createTableQuery);
    console.log('Articles table created or already exists');

    // Enable RLS
    await client.query(`ALTER TABLE articles ENABLE ROW LEVEL SECURITY;`);
    console.log('RLS enabled');

    // Create policy for public read access
    const policyQuery = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'articles' AND policyname = 'Public read access'
        ) THEN
          CREATE POLICY "Public read access" ON articles FOR SELECT USING (true);
        END IF;
      END
      $$;
    `;
    await client.query(policyQuery);
    console.log('Public read policy created');

    // Create policy for service role write access (implicit for superuser/postgres, but good for service_role user if used via API)
    // Actually, service_role bypasses RLS, so we just need public read.

  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    await client.end();
  }
}

setupDatabase();
