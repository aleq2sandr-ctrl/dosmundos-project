#!/usr/bin/env node

// Test script to verify Supabase upload limit fix
// Creates a large file (> 1MB) and tests upload to Supabase Storage

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.dosmundos.pe';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk5OTk5OTk5OX0.A4_N08ZorXYT17zhZReBXPlY6L5-9d8thMbm7TcDWl8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLargeUpload() {
  console.log('🧪 Testing Supabase large file upload...');

  // Create a large test file (5MB)
  const fileSizeMB = 5;
  const testData = {
    test: 'large_file_upload',
    timestamp: new Date().toISOString(),
    size: `${fileSizeMB}MB`,
    content: 'x'.repeat(fileSizeMB * 1024 * 1024) // Create large content
  };

  const jsonContent = JSON.stringify(testData, null, 2);
  const actualSize = Buffer.byteLength(jsonContent, 'utf8') / (1024 * 1024);

  console.log(`📁 Created test file: ${(actualSize).toFixed(2)}MB`);

  const fileName = `test-large-upload-${Date.now()}.json`;

  try {
    console.log(`📤 Uploading ${fileName}...`);

    const { data, error } = await supabase.storage
      .from('transcript')
      .upload(fileName, jsonContent, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      console.error('❌ Upload failed:', error.message);
      if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
        console.error('💡 This indicates the upload limit is still active (1MB limit)');
        console.error('🔧 Run the fix script: ./fix-supabase-upload-limit.sh');
      }
      return false;
    }

    console.log('✅ Upload successful!');
    console.log('📋 Upload result:', data);

    // Test download
    console.log('📥 Testing download...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('transcript')
      .download(fileName);

    if (downloadError) {
      console.error('❌ Download failed:', downloadError.message);
      return false;
    }

    const downloadedText = await downloadData.text();
    const downloadedSize = Buffer.byteLength(downloadedText, 'utf8') / (1024 * 1024);

    console.log(`✅ Download successful: ${(downloadedSize).toFixed(2)}MB`);

    // Clean up
    console.log('🗑️ Cleaning up test file...');
    await supabase.storage
      .from('transcript')
      .remove([fileName]);

    console.log('🎉 Large file upload test PASSED!');
    console.log('💡 Supabase can now handle files larger than 1MB');
    return true;

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    return false;
  }
}

// Run the test
testLargeUpload().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
