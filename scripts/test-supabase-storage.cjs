const { createClient } = require('@supabase/supabase-js');

// Hardcoded values from .env for the test script to avoid dotenv parsing issues in this isolated context
const SUPABASE_URL = 'https://supabase.dosmundos.pe';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxOTk5OTk5OTk5fQ.pdS3lTNFaZfuJgJYLGZr9Zvaq09G2zD942Tz1uu3Wow';

console.log('Testing Supabase Storage Connection...');
console.log('URL:', SUPABASE_URL);
console.log('Key (first 10 chars):', SERVICE_ROLE_KEY.substring(0, 10) + '...');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testStorage() {
  try {
    const bucketName = 'transcript';
    // Simulate a real Deepgram file name
    const fileName = 'test_episode_RU_deepgram.json';
    // Simulate Deepgram JSON content
    const fileContent = JSON.stringify({
      metadata: {
        transaction_key: "deprecated",
        request_id: "test-request-id-123",
        sha256: "test-sha",
        created: new Date().toISOString(),
        duration: 123.45,
        channels: 1
      },
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: "This is a test transcript content to verify JSON upload.",
                confidence: 0.99,
                words: []
              }
            ]
          }
        ]
      }
    }, null, 2);

    console.log(`\nAttempting to upload "${fileName}" to bucket "${bucketName}"...`);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      console.error('❌ Upload Failed:', error);
      return;
    }

    console.log('✅ Upload Successful!');
    console.log('Data:', data);

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log('🔗 Public URL:', publicUrlData.publicUrl);

    // Verify we can list files
    console.log('\nVerifying file in bucket list...');
    const { data: listData, error: listError } = await supabase.storage
      .from(bucketName)
      .list();

    if (listError) {
      console.error('❌ List Failed:', listError);
    } else {
      const found = listData.find(f => f.name === fileName);
      if (found) {
        console.log('✅ File found in bucket listing:', found);
      } else {
        console.warn('⚠️ File uploaded but not found in list immediately (might be eventual consistency).');
      }
    }

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
  }
}

testStorage();
