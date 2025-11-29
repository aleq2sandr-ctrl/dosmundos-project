import { supabase } from './src/lib/supabaseServerClient.js';

async function testSupabaseStorage() {
  console.log('Testing Supabase storage...');

  try {
    // Test uploading a simple file
    const testData = JSON.stringify({ test: 'data', timestamp: new Date().toISOString() });
    const fileName = 'test-upload.json';

    console.log('Uploading test file...');
    const { data, error } = await supabase.storage
      .from('transcript')
      .upload(fileName, testData, {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return false;
    }

    console.log('Upload successful:', data);

    // Test getting the public URL
    const { data: urlData } = supabase.storage
      .from('transcript')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);

    // Test downloading the file
    console.log('Testing download...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('transcript')
      .download(fileName);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return false;
    }

    const downloadedText = await downloadData.text();
    console.log('Downloaded content:', downloadedText);

    console.log('✅ Supabase storage is working!');
    return true;

  } catch (error) {
    console.error('❌ Supabase storage test failed:', error);
    return false;
  }
}

testSupabaseStorage();
