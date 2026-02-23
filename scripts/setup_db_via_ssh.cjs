const { Client } = require('ssh2');
require('dotenv').config();

const conn = new Client();

const createTableSQL = `
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

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

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

conn.on('ready', () => {
  console.log('SSH Client :: ready');
  // Assuming standard Supabase Docker setup, the db container is usually 'supabase-db' or similar.
  // We'll try to list containers first to find the postgres one.
  conn.exec('docker ps --format "{{.Names}}"', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', (code, signal) => {
      const containers = output.split('\n');
      const dbContainer = containers.find(c => c.includes('db') && c.includes('supabase')) || 'supabase-db';
      console.log(`Found DB container: ${dbContainer}`);

      // Now execute SQL inside the container
      const psqlCommand = `docker exec -i ${dbContainer} psql -U postgres -d postgres`;
      
      conn.exec(psqlCommand, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('SQL execution completed with code ' + code);
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });
        
        stream.write(createTableSQL);
        stream.end();
      });

    }).on('data', (data) => {
      output += data;
    });
  });
}).connect({
  host: process.env.VPS_IP,
  port: 22,
  username: process.env.VPS_USER,
  password: process.env.VPS_PASSWORD
});
