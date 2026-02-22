import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.dosmundos.pe';
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

async function translateTranscript(transcriptData) {
  if (!transcriptData.utterances || !Array.isArray(transcriptData.utterances)) {
    console.error('Invalid format: no utterances array.');
    return null;
  }

  const utterances = transcriptData.utterances;
  const translatedUtterances = [];
  const CHUNK_SIZE = 50;

  for (let i = 0; i < utterances.length; i += CHUNK_SIZE) {
    const chunk = utterances.slice(i, i + CHUNK_SIZE);
    const textsToTranslate = chunk.map(u => u.text);

    console.log(`  Translating chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(utterances.length / CHUNK_SIZE)}...`);
    
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
      console.error(`  Failed to translate chunk or length mismatch.`);
      return null;
    }

    for (let j = 0; j < chunk.length; j++) {
      translatedUtterances.push({
        ...chunk[j],
        text: translatedTexts[j]
      });
    }
  }

  return {
    ...transcriptData,
    utterances: translatedUtterances
  };
}

async function translateTexts(texts, targetLangName) {
  const prompt = `Translate the following array of Spanish titles to ${targetLangName}. 
Return ONLY a valid JSON array of strings. Maintain the exact same order.
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

    if (!response || !response.choices || !response.choices.length) {
      console.error('Invalid API response:', JSON.stringify(response, null, 2));
      return null;
    }

    const content = response.choices[0].message.content;
    const jsonText = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(`Error translating to ${targetLangName}:`, error);
    return null;
  }
}

async function processEpisode(slug) {
  console.log(`\nProcessing episode ${slug}...`);

  // Fetch Spanish transcript
  const { data: esTranscript, error: transcriptError } = await supabase
    .from('transcripts')
    .select('edited_transcript_data')
    .eq('episode_slug', slug)
    .eq('lang', 'es')
    .single();

  if (transcriptError || !esTranscript) {
    console.error(`Error fetching ES transcript for ${slug}:`, transcriptError);
    return;
  }

  // Translate transcript
  console.log('Translating transcript...');
  const translatedTranscript = await translateTranscript(esTranscript.edited_transcript_data);

  if (!translatedTranscript) {
    console.error(`Failed to translate transcript for ${slug}`);
    return;
  }

  // Save translated transcript to DB
  console.log('Saving translated transcript to DB...');
  const { error: upsertError } = await supabase
    .from('transcripts')
    .upsert({
      episode_slug: slug,
      lang: 'en',
      edited_transcript_data: translatedTranscript
    }, { onConflict: 'episode_slug, lang' });

  if (upsertError) {
    console.error(`Error saving translated transcript for ${slug}:`, upsertError);
  } else {
    console.log('Successfully saved translated transcript');
  }

  // Fetch Spanish questions
  const { data: esQuestions, error: qError } = await supabase
    .from('timecodes')
    .select('*')
    .eq('episode_slug', slug)
    .eq('lang', 'es')
    .order('time', { ascending: true });

  if (esQuestions && esQuestions.length > 0) {
    console.log(`Translating ${esQuestions.length} questions...`);
    const titlesToTranslate = esQuestions.map(q => q.title);
    const translatedTitles = await translateTexts(titlesToTranslate, 'English');

    if (translatedTitles && translatedTitles.length === esQuestions.length) {
      // Prepare rows for insertion
      const rowsToInsert = esQuestions.map((q, index) => ({
        episode_slug: slug,
        lang: 'en',
        time: q.time,
        title: translatedTitles[index]
      }));

      const { error: insertError } = await supabase
        .from('timecodes')
        .insert(rowsToInsert);

      if (insertError) {
        console.error(`Error inserting EN questions:`, insertError);
      } else {
        console.log(`Successfully saved ${rowsToInsert.length} questions`);
      }
    } else {
      console.error('Failed to translate questions or length mismatch');
    }
  } else {
    console.log('No Spanish questions found');
  }

  console.log(`Completed processing ${slug}`);
}

async function main() {
  console.log('=== Finding episodes with ES transcripts but missing EN ===');

  // Get all transcripts
  const { data: allTranscripts, error: transcriptsError } = await supabase
    .from('transcripts')
    .select('episode_slug, lang');

  if (transcriptsError) {
    console.error('Error fetching transcripts:', transcriptsError);
    return;
  }

  // Group transcripts by episode and language
  const episodes = {};
  allTranscripts.forEach(t => {
    if (!episodes[t.episode_slug]) {
      episodes[t.episode_slug] = new Set();
    }
    episodes[t.episode_slug].add(t.lang);
  });

  // Find episodes with ES but without EN
  const missingEnTranscripts = [];
  Object.entries(episodes).forEach(([slug, langs]) => {
    if (langs.has('es') && !langs.has('en')) {
      missingEnTranscripts.push(slug);
    }
  });

  console.log(`Found ${missingEnTranscripts.length} episodes to process:`);
  missingEnTranscripts.forEach(slug => console.log(`- ${slug}`));

  // Process each episode
  for (const slug of missingEnTranscripts) {
    await processEpisode(slug);
    // Add delay to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n=== Translation process completed ===');
}

main();
