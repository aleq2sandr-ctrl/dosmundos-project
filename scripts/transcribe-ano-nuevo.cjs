/**
 * Script to transcribe 2025-12-31_ano_nuevo files
 * 
 * Usage: node scripts/transcribe-ano-nuevo.cjs
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.VITE_ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_API_URL = 'https://api.assemblyai.com/v2';
const AUDIO_BASE_URL = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio';
const OUTPUT_DIR = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

const files = [
  { filename: '2025-12-31_ano_nuevo_RU.mp3', languageCode: 'ru', suffix: 'RU' },
  { filename: '2025-12-31_ano_nuevo_ES.mp3', languageCode: 'es', suffix: 'ES' }
];

async function transcribe(file) {
  const audioUrl = `${AUDIO_BASE_URL}/${file.filename}`;
  console.log(`\n📤 Submitting: ${file.filename} (language: ${file.languageCode})`);
  
  try {
    // Submit transcription
    const submitResult = await axios.post(
      `${ASSEMBLYAI_API_URL}/transcript`,
      {
        audio_url: audioUrl,
        language_code: file.languageCode,
        speech_models: ['universal-2']
      },
      {
        headers: {
          authorization: API_KEY,
          'content-type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const transcriptId = submitResult.data.id;
    console.log(`   Transcript ID: ${transcriptId}`);
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 120;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      const response = await axios.get(
        `${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`,
        { headers: { authorization: API_KEY }, timeout: 30000 }
      );
      
      const { status } = response.data;
      
      if (status === 'completed') {
        console.log(`   ✅ Transcription completed!`);
        
        // Save to file
        const outputPath = path.join(OUTPUT_DIR, `2025-12-31_ano_nuevo_${file.suffix}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2), 'utf8');
        console.log(`   💾 Saved: ${outputPath}`);
        console.log(`   Words: ${response.data.words?.length || 0}`);
        return response.data;
      }
      
      if (status === 'error') {
        throw new Error('Transcription failed: ' + JSON.stringify(response.data.error));
      }
      
      process.stdout.write(`   [${attempts}/${maxAttempts}] Status: ${status}...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Timeout');
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Transcribing 2025-12-31_ano_nuevo files');
  console.log('='.repeat(50));
  
  for (const file of files) {
    await transcribe(file);
  }
  
  console.log('\n✅ All done!');
}

main().catch(console.error);
