import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

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

const TARGET_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pl', name: 'Polish' }
];

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

async function processTranslations() {
  console.log('Starting translation of questions...');

  // 1. Get all episodes that have ES timecodes
  const { data: esEpisodes, error: fetchError } = await supabase
    .from('timecodes')
    .select('episode_slug')
    .eq('lang', 'es');

  if (fetchError) {
    console.error('Error fetching ES episodes:', fetchError);
    return;
  }

  const uniqueSlugs = [...new Set(esEpisodes.map(e => e.episode_slug))];
  console.log(`Found ${uniqueSlugs.length} episodes with ES questions.`);

  for (const slug of uniqueSlugs) {
    console.log(`\nProcessing episode ${slug}...`);

    // Fetch ES questions for this episode
    const { data: esQuestions, error: qError } = await supabase
      .from('timecodes')
      .select('*')
      .eq('episode_slug', slug)
      .eq('lang', 'es')
      .order('time', { ascending: true });

    if (qError || !esQuestions || esQuestions.length === 0) {
      console.error(`Error fetching questions for ${slug}:`, qError);
      continue;
    }

    const titlesToTranslate = esQuestions.map(q => q.title);

    for (const lang of TARGET_LANGUAGES) {
      // Check if translations already exist
      const { count, error: countError } = await supabase
        .from('timecodes')
        .select('*', { count: 'exact', head: true })
        .eq('episode_slug', slug)
        .eq('lang', lang.code);

      if (count > 0) {
        console.log(`  Skipping ${lang.code}: Already exists.`);
        continue;
      }

      console.log(`  Translating to ${lang.name} (${lang.code})...`);
      
      const translatedTitles = await translateTexts(titlesToTranslate, lang.name);

      if (!translatedTitles || translatedTitles.length !== titlesToTranslate.length) {
        console.error(`  Failed to translate to ${lang.code} or length mismatch.`);
        continue;
      }

      // Prepare rows for insertion
      const rowsToInsert = esQuestions.map((q, index) => ({
        episode_slug: slug,
        lang: lang.code,
        time: q.time,
        title: translatedTitles[index]
      }));

      const { error: insertError } = await supabase
        .from('timecodes')
        .insert(rowsToInsert);

      if (insertError) {
        console.error(`  Error inserting ${lang.code} timecodes:`, insertError);
      } else {
        console.log(`  Successfully saved ${rowsToInsert.length} questions for ${lang.code}.`);
      }
    }
  }

  console.log('\nTranslation process completed.');
}

processTranslations();