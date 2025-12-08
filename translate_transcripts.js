import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

const WORKSPACE_DIR = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';
const CONCURRENCY = 3; // Process 3 episodes at a time

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize OpenAI (DeepSeek)
const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
const openai = new OpenAI({
  apiKey: deepseekApiKey,
  baseURL: 'https://api.deepseek.com',
});

async function translateChunk(texts) {
  const prompt = `You are a professional translator. Translate the following array of Spanish texts to English.
Return ONLY a JSON array of strings. Preserve the order and the number of items exactly.
Do not include any markdown formatting or explanations.

Input:
${JSON.stringify(texts)}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a professional translator. Translate the given array of texts accurately." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      stream: false
    });

    const content = response.choices[0].message.content;
    const jsonText = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error translating chunk:', error);
    return null;
  }
}

async function translateTranscript(filePath) {
  const fileName = path.basename(filePath);
  const episodeSlug = fileName.split('_')[0];
  const outputFileName = fileName.replace('_ES_assemblyai_edit.json', '_EN_assemblyai_translate.json');
  const outputPath = path.join(WORKSPACE_DIR, outputFileName);

  if (fs.existsSync(outputPath)) {
    console.log(`Skipping ${episodeSlug}: ${outputFileName} already exists.`);
    return;
  }

  console.log(`Processing ${episodeSlug}...`);

  let transcriptData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    transcriptData = JSON.parse(fileContent);
  } catch (err) {
    console.error(`Error reading ${fileName}:`, err);
    return;
  }

  if (!transcriptData.utterances || !Array.isArray(transcriptData.utterances)) {
    console.error(`Invalid format in ${fileName}: no utterances array.`);
    return;
  }

  const utterances = transcriptData.utterances;
  const translatedUtterances = [];
  const CHUNK_SIZE = 50;

  for (let i = 0; i < utterances.length; i += CHUNK_SIZE) {
    const chunk = utterances.slice(i, i + CHUNK_SIZE);
    const textsToTranslate = chunk.map(u => u.text);

    console.log(`  Translating chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(utterances.length / CHUNK_SIZE)} for ${episodeSlug}...`);
    
    let translatedTexts = null;
    let retries = 3;
    while (retries > 0 && !translatedTexts) {
        translatedTexts = await translateChunk(textsToTranslate);
        if (!translatedTexts) {
            console.log(`    Retry ${4 - retries}...`);
            retries--;
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (!translatedTexts || translatedTexts.length !== chunk.length) {
      console.error(`  Failed to translate chunk or length mismatch for ${episodeSlug}. Skipping file.`);
      return;
    }

    for (let j = 0; j < chunk.length; j++) {
      translatedUtterances.push({
        ...chunk[j],
        text: translatedTexts[j]
      });
    }
  }

  const translatedData = {
    ...transcriptData,
    utterances: translatedUtterances
  };

  // Save to file
  fs.writeFileSync(outputPath, JSON.stringify(translatedData, null, 2));
  console.log(`  Saved ${outputFileName}`);

  // Upload to DB
  console.log(`  Uploading ${episodeSlug} to DB...`);
  const { error } = await supabase
    .from('transcripts')
    .upsert({
      episode_slug: episodeSlug,
      lang: 'en',
      edited_transcript_data: translatedData
    }, { onConflict: 'episode_slug, lang' });

  if (error) {
    console.error(`  Error uploading ${episodeSlug} to DB:`, error);
  } else {
    console.log(`  Successfully uploaded ${episodeSlug} to DB.`);
  }
}

async function main() {
  const files = fs.readdirSync(WORKSPACE_DIR)
    .filter(f => f.endsWith('_ES_assemblyai_edit.json'))
    .sort()
    .reverse(); // Newest to oldest

  console.log(`Found ${files.length} ES transcripts.`);

  // Process in batches
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(file => translateTranscript(path.join(WORKSPACE_DIR, file))));
  }
}

main();
