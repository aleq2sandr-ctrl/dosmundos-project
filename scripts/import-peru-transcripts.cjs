/**
 * Import Peru Audio Transcripts to Database
 * 
 * This script processes JSON transcription files from the Peru/Audio directory
 * and imports them into the DosMundos database.
 * 
 * Usage: node scripts/import-peru-transcripts.cjs
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Source directory for Peru audio transcriptions
const SOURCE_DIR = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

// Audio URL base path
const AUDIO_BASE_URL = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Convert words array to utterances array
 * Groups consecutive words by speaker into utterances
 */
function convertWordsToUtterances(words) {
  if (!words || !Array.isArray(words) || words.length === 0) {
    return [];
  }

  const utterances = [];
  let currentUtterance = null;
  let utteranceId = 1;

  for (const word of words) {
    const speaker = word.speaker || 'A';
    
    if (!currentUtterance || currentUtterance.speaker !== speaker) {
      // Save previous utterance
      if (currentUtterance) {
        utterances.push(currentUtterance);
      }
      
      // Start new utterance
      currentUtterance = {
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speaker,
        id: utteranceId++
      };
    } else {
      // Append to current utterance
      currentUtterance.text += ' ' + word.text;
      currentUtterance.end = word.end;
    }
  }

  // Don't forget the last utterance
  if (currentUtterance) {
    utterances.push(currentUtterance);
  }

  return utterances;
}

/**
 * Parse filename to extract episode slug and language
 * Examples:
 * - 2025-12-10_ES.json -> { slug: '2025-12-10', lang: 'es' }
 * - 2025-12-31_ano_nuevo_RU.json -> { slug: '2025-12-31_ano_nuevo', lang: 'ru' }
 */
function parseFilename(filename) {
  // Remove .json extension
  const nameWithoutExt = filename.replace('.json', '');
  
  // Split by underscore
  const parts = nameWithoutExt.split('_');
  
  // Last part is the language code
  const langCode = parts.pop().toLowerCase();
  
  // Rest is the slug
  const slug = parts.join('_');
  
  return { slug, lang: langCode };
}

/**
 * Get audio filename for an episode
 * For 2026-01-28, use mixed audio for both languages
 */
function getAudioFilename(slug, lang) {
  // Special case: 2026-01-28 uses mixed audio
  if (slug === '2026-01-28') {
    return `${slug}.mp3`; // mixed audio
  }
  
  // Standard case: language-specific audio
  return `${slug}_${lang.toUpperCase()}.mp3`;
}

/**
 * Process a single transcript file
 */
async function processFile(filePath, filename) {
  console.log(`\n📄 Processing: ${filename}`);
  
  const { slug, lang } = parseFilename(filename);
  console.log(`   Slug: ${slug}, Lang: ${lang}`);
  
  try {
    // Read and parse JSON
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(fileContent);
    
    // Convert words to utterances
    const utterances = convertWordsToUtterances(json.words);
    console.log(`   Converted ${json.words?.length || 0} words to ${utterances.length} utterances`);
    
    // Create compact transcript data
    const transcriptData = {
      utterances: utterances.map(u => ({
        start: u.start,
        end: u.end,
        text: u.text,
        speaker: u.speaker,
        id: u.id
      })),
      text: json.text || ''
    };
    
    // Calculate approximate size
    const dataSize = JSON.stringify(transcriptData).length;
    console.log(`   Compact data size: ${(dataSize / 1024).toFixed(1)} KB`);
    
    // Get audio filename
    const audioFilename = getAudioFilename(slug, lang);
    const audioUrl = `${AUDIO_BASE_URL}/${audioFilename}`;
    
    // Check if episode exists
    const { data: existingEpisode, error: episodeError } = await supabase
      .from('episodes')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    
    if (episodeError) {
      console.error(`   ❌ Error checking episode: ${episodeError.message}`);
      return { success: false, error: episodeError.message };
    }
    
    // Create episode if it doesn't exist
    if (!existingEpisode) {
      console.log(`   Creating new episode: ${slug}`);
      const { error: createEpisodeError } = await supabase
        .from('episodes')
        .insert({
          slug: slug,
          date: slug.split('_')[0] // Use date part as date
        });
      
      if (createEpisodeError) {
        console.error(`   ❌ Error creating episode: ${createEpisodeError.message}`);
        return { success: false, error: createEpisodeError.message };
      }
    }
    
    // Upsert transcript - only use columns that exist
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .upsert({
        episode_slug: slug,
        lang: lang,
        edited_transcript_data: transcriptData
      }, {
        onConflict: 'episode_slug,lang'
      });
    
    if (transcriptError) {
      console.error(`   ❌ Error upserting transcript: ${transcriptError.message}`);
      return { success: false, error: transcriptError.message };
    }
    
    // Check if audio record exists
    const { data: existingAudio, error: audioCheckError } = await supabase
      .from('episode_audios')
      .select('id')
      .eq('episode_slug', slug)
      .eq('lang', lang === 'es' && slug === '2026-01-28' ? 'mixed' : lang)
      .maybeSingle();
    
    if (audioCheckError) {
      console.warn(`   ⚠️ Error checking audio: ${audioCheckError.message}`);
    }
    
    // For 2026-01-28, use 'mixed' as audio language
    const audioLang = slug === '2026-01-28' ? 'mixed' : lang;
    
    // Upsert audio reference - only use columns that exist
    const { error: audioError } = await supabase
      .from('episode_audios')
      .upsert({
        episode_slug: slug,
        lang: audioLang,
        audio_url: audioUrl
      }, {
        onConflict: 'episode_slug,lang'
      });
    
    if (audioError) {
      console.warn(`   ⚠️ Error upserting audio: ${audioError.message}`);
    }
    
    console.log(`   ✅ Successfully imported`);
    return { success: true, slug, lang, utterances: utterances.length };
    
  } catch (error) {
    console.error(`   ❌ Error processing file: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Peru Audio Transcripts Import');
  console.log(`   Source: ${SOURCE_DIR}`);
  console.log(`   Supabase: ${supabaseUrl}`);
  
  // Check if source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }
  
  // Get all JSON files
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.json') && (f.includes('_ES.json') || f.includes('_RU.json')));
  
  console.log(`\nFound ${files.length} transcript files to process`);
  
  // Sort by filename
  files.sort();
  
  const results = {
    success: 0,
    failed: 0,
    total: files.length,
    details: []
  };
  
  // Process each file
  for (const file of files) {
    const filePath = path.join(SOURCE_DIR, file);
    const result = await processFile(filePath, file);
    
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }
    results.details.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary');
  console.log('='.repeat(50));
  console.log(`   Total files: ${results.total}`);
  console.log(`   Successful: ${results.success}`);
  console.log(`   Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed imports:');
    results.details
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.error}`));
  }
  
  console.log('\n✅ Import completed!');
}

main().catch(console.error);
