/**
 * Import New Episodes from Peru/Audio
 * 
 * This script:
 * 1. Scans audio files and creates episode records
 * 2. Calculates duration from local MP3 files
 * 3. Processes AssemblyAI JSON transcripts
 * 4. Generates questions using DeepSeek
 * 
 * Usage: node scripts/import-new-episodes.cjs [--skip-existing|--update-existing]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const SOURCE_DIR = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const AUDIO_BASE_URL = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/Audio';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Title templates by language
const TITLES = {
  es: 'Meditación',
  ru: 'Медитация',
  en: 'Meditation',
  de: 'Meditation',
  fr: 'Méditation',
  pl: 'Medytacja'
};

/**
 * Format duration from seconds to HH:MM:SS
 */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Get title for episode in specified language
 */
function getTitle(lang, dateStr) {
  const prefix = TITLES[lang.toLowerCase()] || 'Meditation';
  const [year, month, day] = dateStr.split('-');
  return `${prefix} ${day}.${month}.${year}`;
}

/**
 * Parse filename to extract slug and language
 * Examples:
 * - 2025-12-10.mp3 -> { slug: '2025-12-10', lang: 'mixed', date: '2025-12-10' }
 * - 2025-12-10_ES.mp3 -> { slug: '2025-12-10', lang: 'es', date: '2025-12-10' }
 * - 2025-12-31_ano_nuevo.mp3 -> { slug: '2025-12-31_ano_nuevo', lang: 'mixed', date: '2025-12-31' }
 */
function parseAudioFilename(filename) {
  const nameWithoutExt = filename.replace('.mp3', '');
  const parts = nameWithoutExt.split('_');
  
  // Check if last part is a language code
  const langCodes = ['ES', 'RU', 'EN', 'DE', 'FR', 'PL'];
  const lastPart = parts[parts.length - 1].toUpperCase();
  
  if (langCodes.includes(lastPart)) {
    // Has language suffix
    const lang = lastPart.toLowerCase();
    const slugParts = parts.slice(0, -1);
    const slug = slugParts.join('_');
    const date = slugParts[0]; // First part is always date
    return { slug, lang, date };
  } else {
    // No language suffix = mixed
    const slug = nameWithoutExt;
    const date = parts[0]; // First part is date
    return { slug, lang: 'mixed', date };
  }
}

/**
 * Parse transcript filename
 * Examples:
 * - 2025-12-10_ES.json -> { slug: '2025-12-10', lang: 'es' }
 * - 2025-12-31_ano_nuevo_RU.json -> { slug: '2025-12-31_ano_nuevo', lang: 'ru' }
 */
function parseTranscriptFilename(filename) {
  const nameWithoutExt = filename.replace('.json', '');
  const parts = nameWithoutExt.split('_');
  
  // Last part is language code
  const langCode = parts.pop().toLowerCase();
  const slug = parts.join('_');
  
  return { slug, lang: langCode };
}

/**
 * Get audio duration from local file using music-metadata
 */
async function getAudioDuration(filePath) {
  try {
    const { parseFile } = await import('music-metadata');
    const metadata = await parseFile(filePath);
    if (metadata && metadata.format && metadata.format.duration) {
      return metadata.format.duration;
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️ Error reading audio metadata: ${error.message}`);
    return null;
  }
}

/**
 * Convert words array to utterances array
 * Groups consecutive words by speaker into utterances
 * Preserves words array within each utterance for smart segmentation
 */
function convertWordsToUtterances(words) {
  if (!words || !Array.isArray(words) || words.length === 0) {
    return [];
  }

  const utterances = [];
  let currentUtterance = null;
  let utteranceId = 0;

  const sortedWords = [...words].sort((a, b) => a.start - b.start);

  for (const word of sortedWords) {
    const speaker = word.speaker || 'A';
    
    // Create normalized word object (remove confidence, keep essential fields)
    const normalizedWord = {
      text: word.text,
      start: word.start,
      end: word.end,
      speaker: speaker
    };
    
    const timeGap = currentUtterance ? word.start - currentUtterance.end : 0;
    const isNewSpeaker = !currentUtterance || currentUtterance.speaker !== speaker;
    const isLongPause = timeGap > 3000; // Увеличиваем интервал до 3 секунд для лучшего разбиения

    // Если speaker равен null или не определен, используем только время для разбиения
    let shouldCreateNew = false;
    if (!currentUtterance) {
      shouldCreateNew = true;
    } else if (word.speaker === null || word.speaker === undefined) {
      shouldCreateNew = isLongPause;
    } else {
      shouldCreateNew = isNewSpeaker || isLongPause;
    }

    if (shouldCreateNew) {
      if (currentUtterance) {
        utterances.push(currentUtterance);
      }
      
      // Start new utterance
      currentUtterance = {
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speaker,
        id: utteranceId++,
        words: [normalizedWord]
      };
    } else {
      // Append to current utterance
      currentUtterance.text += ' ' + word.text;
      currentUtterance.end = word.end;
      currentUtterance.words.push(normalizedWord);
    }
  }

  // Don't forget the last utterance
  if (currentUtterance) {
    utterances.push(currentUtterance);
  }

  return utterances;
}

/**
 * Scan directory and collect all files (including subdirectories)
 */
function scanFiles() {
  const audioFiles = [];
  const transcriptFiles = [];

  // Recursive directory scanner
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(filePath);
      } else if (stat.isFile()) {
        const relativeFilename = file;
        if (file.endsWith('.mp3')) {
          audioFiles.push({ filename: relativeFilename, path: filePath, size: stat.size });
        } else if (file.endsWith('.json') && (file.includes('_ES.json') || file.includes('_RU.json'))) {
          transcriptFiles.push({ filename: relativeFilename, path: filePath, size: stat.size });
        }
      }
    }
  }

  scanDirectory(SOURCE_DIR);
  
  return { audioFiles, transcriptFiles };
}

/**
 * Group audio files by episode slug
 */
function groupAudioFiles(audioFiles) {
  const episodes = new Map();
  
  for (const file of audioFiles) {
    const parsed = parseAudioFilename(file.filename);
    
    if (!episodes.has(parsed.slug)) {
      episodes.set(parsed.slug, {
        slug: parsed.slug,
        date: parsed.date,
        audios: []
      });
    }
    
    episodes.get(parsed.slug).audios.push({
      lang: parsed.lang,
      filename: file.filename,
      path: file.path,
      size: file.size
    });
  }
  
  return episodes;
}

/**
 * Check if episode exists in database
 */
async function checkEpisodeExists(slug) {
  const { data, error } = await supabase
    .from('episodes')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  
  if (error) {
    console.error(`   ❌ Error checking episode: ${error.message}`);
    return false;
  }
  
  return !!data;
}

/**
 * Check if audio record exists
 */
async function checkAudioExists(slug, lang) {
  const { data, error } = await supabase
    .from('episode_audios')
    .select('id')
    .eq('episode_slug', slug)
    .eq('lang', lang)
    .maybeSingle();
  
  if (error) {
    return false;
  }
  
  return !!data;
}

/**
 * Check if transcript exists
 */
async function checkTranscriptExists(slug, lang) {
  const { data, error } = await supabase
    .from('transcripts')
    .select('id')
    .eq('episode_slug', slug)
    .eq('lang', lang)
    .maybeSingle();
  
  if (error) {
    return false;
  }
  
  return !!data;
}

/**
 * Create episode in database
 */
async function createEpisode(slug, date) {
  const { error } = await supabase
    .from('episodes')
    .insert({
      slug: slug,
      date: date
    });
  
  if (error) {
    throw new Error(`Failed to create episode: ${error.message}`);
  }
}

/**
 * Create or update audio record
 */
async function upsertAudio(slug, lang, audioUrl, duration, updateExisting = false) {
  const existing = await checkAudioExists(slug, lang);
  
  if (existing && !updateExisting) {
    console.log(`   ⏭️  Audio ${lang} already exists, skipping`);
    return false;
  }
  
  const record = {
    episode_slug: slug,
    lang: lang,
    audio_url: audioUrl
  };
  
  // Duration is stored as integer (seconds) in the database
  if (duration) {
    record.duration = Math.round(duration);
  }
  
  const { error } = await supabase
    .from('episode_audios')
    .upsert(record, { onConflict: 'episode_slug,lang' });
  
  if (error) {
    throw new Error(`Failed to upsert audio: ${error.message}`);
  }
  
  return true;
}

/**
 * Create or update transcript
 */
async function upsertTranscript(slug, lang, transcriptData, updateExisting = false) {
  const existing = await checkTranscriptExists(slug, lang);
  
  if (existing && !updateExisting) {
    console.log(`   ⏭️  Transcript ${lang} already exists, skipping`);
    return false;
  }
  
  const title = getTitle(lang, slug.split('_')[0]);
  
  const record = {
    episode_slug: slug,
    lang: lang,
    title: title,
    edited_transcript_data: transcriptData
  };
  
  const { error } = await supabase
    .from('transcripts')
    .upsert(record, { onConflict: 'episode_slug,lang' });
  
  if (error) {
    throw new Error(`Failed to upsert transcript: ${error.message}`);
  }
  
  return true;
}

/**
 * Check if text is a single word
 */
function isSingleWord(text) {
  const trimmed = text.trim();
  return trimmed.length > 0 && !trimmed.includes(' ');
}

/**
 * Combine single-word utterances with adjacent utterances
 */
function combineSingleWordUtterances(utterances) {
  if (!utterances || utterances.length < 2) {
    return utterances;
  }
  
  const result = [];
  let i = 0;
  
  while (i < utterances.length) {
    const current = utterances[i];
    
    if (isSingleWord(current.text)) {
      const prev = result.length > 0 ? result[result.length - 1] : null;
      const next = i + 1 < utterances.length ? utterances[i + 1] : null;
      
      if (prev && prev.speaker === current.speaker) {
        prev.text = prev.text.trim() + ' ' + current.text.trim();
        prev.end = current.end;
        i++;
      } else if (next && next.speaker === current.speaker) {
        const combined = {
          id: result.length,
          start: current.start,
          end: next.end,
          text: current.text.trim() + ' ' + next.text.trim(),
          speaker: current.speaker
        };
        result.push(combined);
        i += 2;
      } else if (prev) {
        prev.text = prev.text.trim() + ' ' + current.text.trim();
        prev.end = current.end;
        i++;
      } else if (next) {
        const combined = {
          id: result.length,
          start: current.start,
          end: next.end,
          text: current.text.trim() + ' ' + next.text.trim(),
          speaker: next.speaker
        };
        result.push(combined);
        i += 2;
      } else {
        current.id = result.length;
        result.push(current);
        i++;
      }
    } else {
      current.id = result.length;
      result.push(current);
      i++;
    }
  }
  
  return result;
}

/**
 * Process transcript JSON file
 */

/**
 * Split long utterances by sentence endings
 */
function splitUtteranceBySentences(utterance) {
  const sentences = [];
  const regex = /[.!?]+\s*/g;
  let startIndex = 0;
  let match;
  
  while ((match = regex.exec(utterance.text)) !== null) {
    const endIndex = match.index + match[0].length;
    const sentenceText = utterance.text.slice(startIndex, endIndex).trim();
    
    if (sentenceText.length > 0) {
      const totalDuration = utterance.end - utterance.start;
      const totalLength = utterance.text.length;
      const sentenceLength = endIndex - startIndex;
      const sentenceDuration = Math.round((sentenceLength / totalLength) * totalDuration);
      
      const sentenceStart = sentences.length === 0 ? utterance.start : sentences[sentences.length - 1].end;
      const sentenceEnd = sentenceStart + sentenceDuration;
      
      sentences.push({
        id: sentences.length,
        start: sentenceStart,
        end: sentenceEnd,
        text: sentenceText,
        speaker: utterance.speaker
      });
      
      startIndex = endIndex;
    }
  }
  
  if (startIndex < utterance.text.length) {
    const sentenceText = utterance.text.slice(startIndex).trim();
    if (sentenceText.length > 0) {
      const sentenceStart = sentences.length === 0 ? utterance.start : sentences[sentences.length - 1].end;
      sentences.push({
        id: sentences.length,
        start: sentenceStart,
        end: utterance.end,
        text: sentenceText,
        speaker: utterance.speaker
      });
    }
  }
  
  // Ensure all durations are positive and valid
  return sentences.map((s, i) => {
    if (i > 0 && s.start < sentences[i - 1].end) {
      return {
        ...s,
        start: sentences[i - 1].end
      };
    }
    if (s.end > utterance.end) {
      return {
        ...s,
        end: utterance.end
      };
    }
    if (s.start < utterance.start) {
      return {
        ...s,
        start: utterance.start
      };
    }
    return s;
  }).filter(s => s.end > s.start);
}
async function processTranscriptFile(file, updateExisting = false) {
  console.log(`\n📄 Processing transcript: ${file.filename}`);
  
  const { slug, lang } = parseTranscriptFilename(file.filename);
  console.log(`   Slug: ${slug}, Lang: ${lang}`);
  
  try {
    // Read and parse JSON
    const content = fs.readFileSync(file.path, 'utf8');
    const json = JSON.parse(content);
    
    // Use utterances from AssemblyAI if available, otherwise convert words
    let utterances;
    if (json.utterances && json.utterances.length > 0) {
      // Use existing utterances from AssemblyAI (without words to reduce size)
      utterances = json.utterances.map((u, index) => ({
        id: index,
        start: u.start,
        end: u.end,
        text: u.text,
        speaker: u.speaker
      }));
      console.log(`   Using ${utterances.length} utterances from AssemblyAI`);
    } else if (json.words && json.words.length > 0) {
      // Fallback: convert words to utterances
      utterances = convertWordsToUtterances(json.words);
      console.log(`   Converted ${json.words.length} words to ${utterances.length} utterances`);
    } else {
      throw new Error('No utterances or words found in transcript JSON');
    }
    
    // Combine single-word utterances
    const singleWordBefore = utterances.filter(u => isSingleWord(u.text)).length;
    if (singleWordBefore > 0) {
      utterances = combineSingleWordUtterances(utterances);
      const singleWordAfter = utterances.filter(u => isSingleWord(u.text)).length;
      console.log(`   Combined single-word utterances: ${singleWordBefore} → ${singleWordAfter}`);
    }
    
    // Split long utterances (more than 2 minutes)
    const MAX_DURATION = 2 * 60 * 1000; // 2 minutes
    const longBefore = utterances.filter(u => u.end - u.start > MAX_DURATION).length;
    if (longBefore > 0) {
      const processedUtterances = [];
      let idCounter = 0;
      
      for (const u of utterances) {
        if (u.end - u.start > MAX_DURATION) {
          const sentences = splitUtteranceBySentences(u);
          sentences.forEach(s => {
            s.id = idCounter++;
            processedUtterances.push(s);
          });
          console.log(`   Split long utterance into ${sentences.length} sentences`);
        } else {
          u.id = idCounter++;
          processedUtterances.push(u);
        }
      }
      
      utterances = processedUtterances;
      const longAfter = utterances.filter(u => u.end - u.start > MAX_DURATION).length;
      console.log(`   Split long utterances: ${longBefore} → ${longAfter}`);
    }
    
    // Create compact transcript data (remove words field to reduce size)
    const compactUtterances = utterances.map(u => ({
      id: u.id,
      start: u.start,
      end: u.end,
      text: u.text,
      speaker: u.speaker
    }));
    
    const transcriptData = {
      utterances: compactUtterances,
      text: json.text || ''
    };
    
    // Calculate size
    const dataSize = JSON.stringify(transcriptData).length;
    console.log(`   Compact data size: ${(dataSize / 1024).toFixed(1)} KB`);
    
    // Upsert to database
    const result = await upsertTranscript(slug, lang, transcriptData, updateExisting);
    
    if (result) {
      console.log(`   ✅ Transcript saved successfully`);
    }
    
    return { success: true, slug, lang, utterancesCount: utterances.length };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting Episode Import');
  console.log(`   Source: ${SOURCE_DIR}`);
  console.log(`   Supabase: ${supabaseUrl}`);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const updateExisting = args.includes('--update-existing');
  const skipExisting = args.includes('--skip-existing');
  
  if (updateExisting) {
    console.log('   Mode: UPDATE existing records');
  } else if (skipExisting) {
    console.log('   Mode: SKIP existing records');
  } else {
    console.log('   Mode: ASK for each existing record');
  }
  
  // Scan files
  console.log('\n📁 Scanning files...');
  const { audioFiles, transcriptFiles } = scanFiles();
  console.log(`   Found ${audioFiles.length} audio files`);
  console.log(`   Found ${transcriptFiles.length} transcript files`);
  
  // Group audio files by episode
  const episodes = groupAudioFiles(audioFiles);
  console.log(`   Found ${episodes.size} unique episodes`);
  
  const results = {
    episodes: { created: 0, skipped: 0, failed: 0 },
    audios: { created: 0, skipped: 0, failed: 0 },
    transcripts: { created: 0, skipped: 0, failed: 0 }
  };
  
  // Process each episode
  for (const [slug, episode] of episodes) {
    console.log(`\n🎙️  Processing episode: ${slug}`);
    
    // Check if episode exists
    const episodeExists = await checkEpisodeExists(slug);
    
    if (episodeExists) {
      if (skipExisting) {
        console.log('   ⏭️  Episode exists, skipping...');
        results.episodes.skipped++;
        continue;
      } else if (!updateExisting) {
        // Ask user
        console.log('   ⚠️  Episode already exists. Use --update-existing to update or --skip-existing to skip.');
        results.episodes.skipped++;
        continue;
      }
    }
    
    // Create episode if needed
    if (!episodeExists) {
      try {
        await createEpisode(slug, episode.date);
        console.log(`   ✅ Episode created`);
        results.episodes.created++;
      } catch (error) {
        console.error(`   ❌ Failed to create episode: ${error.message}`);
        results.episodes.failed++;
        continue;
      }
    }
    
    // Process audio files for this episode
    for (const audio of episode.audios) {
      console.log(`\n   🎵 Processing audio: ${audio.filename} (${audio.lang})`);
      
      // Get duration from local file
      console.log('   📊 Calculating duration...');
      const duration = await getAudioDuration(audio.path);
      if (duration) {
        console.log(`   ⏱️  Duration: ${formatDuration(duration)}`);
      }
      
      // Create audio URL
      const audioUrl = `${AUDIO_BASE_URL}/${audio.filename}`;
      
      // Upsert audio record
      try {
        const result = await upsertAudio(slug, audio.lang, audioUrl, duration, updateExisting);
        if (result) {
          console.log(`   ✅ Audio record saved`);
          results.audios.created++;
        } else {
          results.audios.skipped++;
        }
      } catch (error) {
        console.error(`   ❌ Failed to save audio: ${error.message}`);
        results.audios.failed++;
      }
    }
  }
  
  // Process transcript files
  console.log('\n\n📝 Processing transcripts...');
  for (const file of transcriptFiles) {
    const result = await processTranscriptFile(file, updateExisting);
    if (result.success) {
      results.transcripts.created++;
    } else {
      results.transcripts.failed++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary');
  console.log('='.repeat(60));
  console.log(`   Episodes: ${results.episodes.created} created, ${results.episodes.skipped} skipped, ${results.episodes.failed} failed`);
  console.log(`   Audios: ${results.audios.created} created, ${results.audios.skipped} skipped, ${results.audios.failed} failed`);
  console.log(`   Transcripts: ${results.transcripts.created} created, ${results.transcripts.skipped} skipped, ${results.transcripts.failed} failed`);
  
  console.log('\n✅ Import completed!');
  console.log('\n📌 Next step: Run generate_questions.js to generate timecodes/questions');
}

main().catch(console.error);
