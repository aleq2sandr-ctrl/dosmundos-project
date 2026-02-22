import fetch from 'node-fetch';

// Base URL for audio files from import plan
const AUDIO_BASE_URL = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio';

// Files to check (from the New folder)
const filesToCheck = [
  '2026-02-18.mp3',
  '2026-02-18_ES.mp3',
  '2026-02-18_RU.mp3'
];

// Function to check if a file is accessible
async function checkFileAccess(filename) {
  const url = `${AUDIO_BASE_URL}/${filename}`;
  console.log(`\nChecking: ${url}`);
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log(`✅ Success: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
      return true;
    } else {
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('Checking audio files accessibility on hostinger server:');
  console.log('=====================================================');
  
  const results = [];
  
  for (const filename of filesToCheck) {
    const isAccessible = await checkFileAccess(filename);
    results.push({ filename, isAccessible });
  }
  
  console.log('\n=====================================================');
  console.log('Summary:');
  console.log('=====================================================');
  
  const accessibleFiles = results.filter(r => r.isAccessible);
  const inaccessibleFiles = results.filter(r => !r.isAccessible);
  
  console.log(`✅ Accessible files: ${accessibleFiles.length} of ${filesToCheck.length}`);
  if (accessibleFiles.length > 0) {
    console.log('   - ' + accessibleFiles.map(r => r.filename).join('\n   - '));
  }
  
  console.log(`\n❌ Inaccessible files: ${inaccessibleFiles.length} of ${filesToCheck.length}`);
  if (inaccessibleFiles.length > 0) {
    console.log('   - ' + inaccessibleFiles.map(r => r.filename).join('\n   - '));
  }
  
  return results;
}

// Run the check
main().catch(error => {
  console.error('Error in main function:', error);
  process.exit(1);
});
