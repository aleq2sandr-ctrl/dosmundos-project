/**
 * Script to transcribe mixed-language audio files using AssemblyAI
 * Specifically for 2026-01-28.mp3 which contains both Russian and Spanish
 * 
 * Usage: node scripts/transcribe-mixed-audio.cjs
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2';
const API_KEY = process.env.VITE_ASSEMBLYAI_API_KEY;

// Audio configuration
const AUDIO_BASE_URL = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio';
const AUDIO_DATE = '2026-01-28';
const AUDIO_FILENAME = `${AUDIO_DATE}.mp3`;
const AUDIO_URL = `${AUDIO_BASE_URL}/${AUDIO_FILENAME}`;

// Output directory - Peru/Audio folder
const OUTPUT_DIR = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

// Languages to transcribe
const LANGUAGES = [
  { code: 'ru', suffix: 'RU', name: 'Russian' },
  { code: 'es', suffix: 'ES', name: 'Spanish' }
];

if (!API_KEY) {
  console.error('❌ ASSEMBLYAI_API_KEY not found in environment variables');
  process.exit(1);
}

/**
 * Submit audio for transcription to AssemblyAI
 */
async function submitTranscription(audioUrl, languageCode) {
  console.log(`\n📤 Submitting transcription request...`);
  console.log(`   Audio URL: ${audioUrl}`);
  console.log(`   Language: ${languageCode}`);
  
  try {
    const response = await axios.post(
      `${ASSEMBLYAI_API_URL}/transcript`,
      {
        audio_url: audioUrl,
        language_code: languageCode,
        speech_models: ["universal-2"]  // Use universal-2 model (supports many languages)
      },
      {
        headers: {
          authorization: API_KEY,
          'content-type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    return response.data;
  } catch (error) {
    // Capture detailed error message
    const errorDetails = error.response?.data || { error: error.message };
    console.error(`\n❌ API Error Response:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${JSON.stringify(errorDetails, null, 2)}`);
    throw error;
  }
}

/**
 * Poll for transcription completion
 */
async function pollTranscription(transcriptId, languageName) {
  console.log(`\n⏳ Waiting for ${languageName} transcription to complete...`);
  console.log(`   Transcript ID: ${transcriptId}`);
  
  const maxAttempts = 120; // 10 minutes max (5 second intervals)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    const response = await axios.get(
      `${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`,
      {
        headers: { authorization: API_KEY },
        timeout: 30000
      }
    );
    
    const { status, error } = response.data;
    
    if (status === 'completed') {
      console.log(`\n✅ ${languageName} transcription completed!`);
      return response.data;
    }
    
    if (status === 'error') {
      throw new Error(`Transcription failed: ${error}`);
    }
    
    if (status === 'queued') {
      process.stdout.write(`\r   [${attempts}/${maxAttempts}] Status: Queued...`);
    } else if (status === 'processing') {
      process.stdout.write(`\r   [${attempts}/${maxAttempts}] Status: Processing...`);
    }
    
    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('Transcription timed out after 10 minutes');
}

/**
 * Save transcript to JSON file
 */
function saveTranscript(transcript, language) {
  const outputPath = path.join(OUTPUT_DIR, `${AUDIO_DATE}_${language.suffix}.json`);
  
  fs.writeFileSync(outputPath, JSON.stringify(transcript, null, 2), 'utf8');
  console.log(`\n💾 Saved: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  
  return outputPath;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('AssemblyAI Transcription Script for Mixed Audio');
  console.log('='.repeat(60));
  console.log(`\n📅 Audio Date: ${AUDIO_DATE}`);
  console.log(`🎵 Audio URL: ${AUDIO_URL}`);
  console.log(`📁 Output Directory: ${OUTPUT_DIR}`);
  console.log(`🌐 Languages: ${LANGUAGES.map(l => l.name).join(', ')}`);
  
  // Check if output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`\n❌ Output directory not found: ${OUTPUT_DIR}`);
    process.exit(1);
  }
  
  // Check if source audio exists (by checking if we can access the URL)
  console.log('\n🔍 Verifying audio URL accessibility...');
  try {
    const headResponse = await axios.head(AUDIO_URL, { timeout: 10000 });
    console.log(`   ✅ Audio file accessible (${(parseInt(headResponse.headers['content-length']) / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.warn(`   ⚠️ Could not verify audio URL: ${error.message}`);
    console.log('   Continuing anyway - AssemblyAI will handle the download...');
  }
  
  const results = [];
  
  for (const language of LANGUAGES) {
    console.log('\n' + '-'.repeat(60));
    console.log(`🎙️ Processing ${language.name} (${language.code.toUpperCase()})`);
    console.log('-'.repeat(60));
    
    try {
      // Check if output file already exists
      const outputPath = path.join(OUTPUT_DIR, `${AUDIO_DATE}_${language.suffix}.json`);
      if (fs.existsSync(outputPath)) {
        console.log(`\n⚠️ Output file already exists: ${outputPath}`);
        console.log('   Skipping... Delete the file if you want to re-transcribe.');
        results.push({ language: language.name, status: 'skipped', path: outputPath });
        continue;
      }
      
      // Submit transcription
      const submitResult = await submitTranscription(AUDIO_URL, language.code);
      const transcriptId = submitResult.id;
      
      // Poll for completion
      const transcript = await pollTranscription(transcriptId, language.name);
      
      // Save result
      const savedPath = saveTranscript(transcript, language);
      
      results.push({ 
        language: language.name, 
        status: 'completed', 
        path: savedPath,
        wordCount: transcript.words ? transcript.words.length : 0,
        textLength: transcript.text ? transcript.text.length : 0
      });
      
    } catch (error) {
      console.error(`\n❌ Error processing ${language.name}: ${error.message}`);
      results.push({ language: language.name, status: 'error', error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TRANSCRIPTION SUMMARY');
  console.log('='.repeat(60));
  
  for (const result of results) {
    if (result.status === 'completed') {
      console.log(`\n✅ ${result.language}:`);
      console.log(`   Words: ${result.wordCount?.toLocaleString()}`);
      console.log(`   Text length: ${result.textLength?.toLocaleString()} characters`);
      console.log(`   Output: ${result.path}`);
    } else if (result.status === 'skipped') {
      console.log(`\n⏭️ ${result.language}: Skipped (file exists)`);
    } else {
      console.log(`\n❌ ${result.language}: ${result.error}`);
    }
  }
  
  console.log('\n🎉 Done!');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
