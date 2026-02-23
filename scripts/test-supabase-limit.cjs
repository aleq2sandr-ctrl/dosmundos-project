const { createClient } = require('@supabase/supabase-js');

// Hardcoded values from .env
const SUPABASE_URL = 'https://supabase.dosmundos.pe';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTk5OTk5OTk5fQ.pdS3lTNFaZfuJgJYLGZr9Zvaq09G2zD942Tz1uu3Wow';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const bucketName = 'transcript';

async function uploadWithSize(sizeMB) {
  const sizeBytes = sizeMB * 1024 * 1024;
  console.log(`\nTesting upload of ${sizeMB} MB (${sizeBytes} bytes)...`);
  
  // Create a dummy string of that size
  const dummyData = 'x'.repeat(sizeBytes);
  const fileName = `test_limit_${sizeMB}MB.txt`;

  const startTime = Date.now();
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, dummyData, {
      contentType: 'text/plain',
      upsert: true
    });

  const duration = Date.now() - startTime;

  if (error) {
    console.error(`❌ Failed ${sizeMB} MB:`, error.message || error);
    if (error.cause) console.error('Cause:', error.cause);
  } else {
    console.log(`✅ Success ${sizeMB} MB in ${duration}ms`);
    // Clean up
    await supabase.storage.from(bucketName).remove([fileName]);
  }
}

async function runTests() {
  console.log('Starting Supabase Storage Limit Test...');
  
  await uploadWithSize(0.1); // 100KB
  await uploadWithSize(0.5); // 500KB
  await uploadWithSize(1.0); // 1MB
  await uploadWithSize(1.1); // 1.1MB (often the limit is 1MB)
  await uploadWithSize(2.0); // 2MB
  await uploadWithSize(5.0); // 5MB
}

runTests();
