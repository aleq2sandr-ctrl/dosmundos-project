
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUDIO_BASE_URL = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio/';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Title prefixes
const TITLES = {
  es: 'Meditación',
  ru: 'Медитация',
  en: 'Meditation',
  de: 'Meditation',
  fr: 'Méditation',
  pl: 'Medytacja'
};

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getTitle(lang, dateStr) {
  const prefix = TITLES[lang.toLowerCase()] || 'Meditation';
  // Format date as DD.MM.YYYY for the title
  const [year, month, day] = dateStr.split('-');
  return `${prefix} ${day}.${month}.${year}`;
}

async function getAudioDurationFromUrl(url) {
  try {
    const { parseStream } = await import('music-metadata');
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });
    
    const metadata = await parseStream(response.data, { mimeType: 'audio/mpeg' });
    if (metadata && metadata.format && metadata.format.duration) {
      return metadata.format.duration;
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️ Error reading audio metadata: ${error.message}`);
    return null;
  }
}

async function processFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing: ${filename}`);

  // 1. Parse Filename: YYYY-MM-DD_LANG_edit.json
  const nameMatch = filename.match(/^(\d{4}-\d{2}-\d{2})_([A-Z]{2})_edit\.json$/i);
  if (!nameMatch) {
    console.warn(`   ⚠️ Skipped: Invalid filename format. Expected YYYY-MM-DD_LANG_edit.json`);
    return;
  }

  const [_, dateStr, langCode] = nameMatch;
  const lang = langCode.toLowerCase();

  // 2. Read and Parse JSON
  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`   ❌ Error reading file: ${e.message}`);
    return;
  }

  let transcriptJson;
  try {
    transcriptJson = JSON.parse(fileContent);
  } catch (e) {
    console.error(`   ❌ Error parsing JSON: ${e.message}`);
    return;
  }

  // 3. Calculate Duration
  const audioUrl = `${AUDIO_BASE_URL}${dateStr}.mp3`;
  let duration = '00:00:00';
  
  console.log(`   🎵 Fetching audio duration from: ${audioUrl}`);
  const audioDuration = await getAudioDurationFromUrl(audioUrl);
  
  if (audioDuration) {
    duration = formatDuration(audioDuration);
    console.log(`   ⏱️  Duration from audio: ${duration}`);
  } else {
    console.log('   ⚠️ Could not get duration from audio, falling back to transcript.');
    if (Array.isArray(transcriptJson) && transcriptJson.length > 0) {
      const lastSegment = transcriptJson[transcriptJson.length - 1];
      if (lastSegment && typeof lastSegment.end === 'number') {
        duration = formatDuration(lastSegment.end);
        console.log(`   ⏱️  Duration from transcript: ${duration}`);
      }
    }
  }

  // 4. Prepare Data
  const title = getTitle(lang, dateStr);
  const slug = dateStr; // Using date as slug to avoid duplicates

  const dbRecord = {
    episode_slug: slug,
    lang: lang,
    title: title,
    audio_url: audioUrl,
    duration: duration,
    transcript: transcriptJson,
    is_published: true
  };

  // 5. Upsert to Supabase
  // We match on episode_slug and lang to update existing or insert new
  const { data, error } = await supabase
    .from('episode_audios')
    .upsert(dbRecord, { onConflict: 'episode_slug,lang' })
    .select();

  if (error) {
    console.error(`   ❌ Supabase Error: ${error.message}`);
  } else {
    console.log(`   ✅ Success! Saved as "${title}"`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0];

  if (!targetDir) {
    console.log('Usage: node scripts/import-episodes.js <path_to_json_files>');
    process.exit(0);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('No .json files found in directory.');
    return;
  }

  console.log(`Found ${files.length} JSON files. Starting import...`);

  for (const file of files) {
    await processFile(path.join(targetDir, file));
  }

  console.log('\n🎉 Import finished.');
}

main();
