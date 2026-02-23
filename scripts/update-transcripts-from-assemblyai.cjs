
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processFile(filePath) {
  const filename = path.basename(filePath);
  
  // Regex to match:
  // 2025-12-03_ES_RU_assemblyai.json -> Date: 2025-12-03, Lang: RU
  // 2025-12-03_RU_assemblyai.json    -> Date: 2025-12-03, Lang: RU
  // 2025-12-03_ES_assemblyai.json    -> Date: 2025-12-03, Lang: ES
  
  // Logic: 
  // 1. Start with Date (YYYY-MM-DD)
  // 2. Optional middle part (e.g. _ES)
  // 3. Target Lang (_RU)
  // 4. _assemblyai.json
  
  // Actually, simpler: The LAST language code before _assemblyai.json is the target language.
  // And the first part is the date.
  
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})_.*([A-Z]{2})_assemblyai\.json$/i);
  
  if (!match) {
    // Try simpler pattern if the above fails (e.g. just DATE_LANG_assemblyai.json)
    // But the above regex .* should handle it.
    // Let's test:
    // "2025-12-03_ES_RU_assemblyai.json".match(...) -> "2025-12-03", "RU"
    // "2025-12-03_RU_assemblyai.json".match(...) -> "2025-12-03", "RU"
    console.warn(`⚠️ Skipping file with non-matching name: ${filename}`);
    return;
  }

  const dateStr = match[1];
  const lang = match[2].toLowerCase();

  console.log(`\n📄 Processing: ${filename}`);
  console.log(`   Date: ${dateStr}, Lang: ${lang}`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(fileContent);

    if (!json.utterances || !Array.isArray(json.utterances)) {
      console.warn(`   ⚠️ No 'utterances' array found in file. Skipping.`);
      return;
    }

    // Prepare the transcript object. 
    // We keep the structure { utterances: [...] } to match existing data.
    // We can optionally clean up the utterances (remove 'words' if too large, or keep them).
    // The user said "extract necessary text for segments". 
    // Usually 'words' are not strictly necessary for simple display, but good for karaoke mode.
    // Existing _edit.json files didn't seem to have 'words'.
    // Let's keep it simple and just save the utterances as is, or maybe strip 'words' to save DB space if they are huge.
    // But AssemblyAI 'words' provide word-level timestamps.
    // Let's check if existing data has words. The _edit.json I saw earlier did NOT have words.
    // To be safe and save space, I will map the utterances to the standard format.
    
    const cleanUtterances = json.utterances.map(u => ({
      start: u.start,
      end: u.end,
      speaker: u.speaker,
      text: u.text
      // We omit 'words' and 'confidence' to match the _edit.json format and save space.
    }));

    const newTranscript = {
      utterances: cleanUtterances
    };

    // Update DB
    // We update the 'transcripts' table, column 'edited_transcript_data'
    const { data, error } = await supabase
      .from('transcripts')
      .update({ edited_transcript_data: newTranscript })
      .eq('episode_slug', dateStr)
      .eq('lang', lang)
      .select();

    if (error) {
      console.error(`   ❌ Supabase Update Error: ${error.message}`);
    } else if (data.length === 0) {
      // If no record exists, maybe we should insert it?
      // The user said "replacing cells", implying existing records.
      // But if it's a new translation, maybe insert?
      // Let's try upsert if update fails to find record.
      console.warn(`   ⚠️ No record found for ${dateStr} (${lang}). Trying to insert...`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('transcripts')
        .insert({
          episode_slug: dateStr,
          lang: lang,
          edited_transcript_data: newTranscript,
          status: 'completed',
          title: `Meditation ${dateStr}` // Fallback title
        })
        .select();
        
      if (insertError) {
         console.error(`   ❌ Supabase Insert Error: ${insertError.message}`);
      } else {
         console.log(`   ✅ Transcript inserted successfully.`);
      }
    } else {
      console.log(`   ✅ Transcript updated successfully.`);
    }

  } catch (e) {
    console.error(`   ❌ Error processing file: ${e.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0];

  if (!targetDir) {
    console.log('Usage: node scripts/update-transcripts-from-assemblyai.cjs <path_to_folder>');
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(targetDir).filter(f => f.endsWith('_assemblyai.json'));

  if (files.length === 0) {
    console.log('No *_assemblyai.json files found in directory.');
    return;
  }

  console.log(`Found ${files.length} AssemblyAI files. Starting update...`);

  for (const file of files) {
    await processFile(path.join(targetDir, file));
  }

  console.log('\n🎉 Update finished.');
}

main();
