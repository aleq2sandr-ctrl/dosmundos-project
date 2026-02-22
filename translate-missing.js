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

/**
 * Convert episode slug (YYYY-MM-DD) to header format
 */
function slugToHeader(slug, lang = 'en') {
  const match = slug.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const [, year, month, day] = match;
  const shortYear = year.slice(-2);
  
  const meditationWord = {
    en: 'Meditation',
    es: 'Meditación',
    fr: 'Méditation',
    de: 'Meditation',
    pl: 'Medytacja'
  };
  
  return `${meditationWord[lang] || 'Meditation'} ${day}.${month}.${shortYear}`;
}

/**
 * Translate texts using Deepseek
 */
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

async function translateMissingEpisodes() {
  console.log('=== Translating Missing Episodes ===\n');
  
  // Get all ES episodes
  const { data: esEpisodes, error: fetchError } = await supabase
    .from('timecodes')
    .select('episode_slug')
    .eq('lang', 'es');

  if (fetchError) {
    console.error('Error fetching ES episodes:', fetchError);
    return;
  }

  const esSlugs = [...new Set(esEpisodes.map(e => e.episode_slug))];
  console.log(`Found ${esSlugs.length} episodes with ES timecodes.\n`);

  for (const lang of TARGET_LANGUAGES) {
    console.log(`\n=== Processing ${lang.name} (${lang.code}) ===`);
    
    // Get existing episodes for this language
    const { data: langEpisodes } = await supabase
      .from('timecodes')
      .select('episode_slug')
      .eq('lang', lang.code);
    
    const existingSlugs = new Set(langEpisodes?.map(e => e.episode_slug) || []);
    const missingSlugs = esSlugs.filter(s => !existingSlugs.has(s));
    
    console.log(`Missing ${lang.code}: ${missingSlugs.length} episodes`);
    
    if (missingSlugs.length === 0) {
      console.log(`  All episodes already have ${lang.name} translations.`);
      continue;
    }
    
    for (const slug of missingSlugs) {
      console.log(`\n  Processing ${slug}...`);
      
      // Fetch ES questions for this episode
      const { data: esQuestions, error: qError } = await supabase
        .from('timecodes')
        .select('*')
        .eq('episode_slug', slug)
        .eq('lang', 'es')
        .order('time', { ascending: true });

      if (qError || !esQuestions || esQuestions.length === 0) {
        console.error(`  Error fetching ES questions for ${slug}:`, qError);
        continue;
      }
      
      // Get titles to translate (skip first one - it's the header)
      const titlesToTranslate = esQuestions.slice(1).map(q => q.title);
      
      // Translate titles
      let translatedTitles = null;
      let retries = 3;
      
      while (retries > 0 && !translatedTitles) {
        translatedTitles = await translateTexts(titlesToTranslate, lang.name);
        if (!translatedTitles) {
          console.log(`    Retry ${4 - retries}...`);
          retries--;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      if (!translatedTitles || translatedTitles.length !== titlesToTranslate.length) {
        console.error(`  Failed to translate ${slug} to ${lang.code}.`);
        continue;
      }
      
      // Generate header for first timecode
      const header = slugToHeader(slug, lang.code);
      
      // Prepare rows for insertion
      const rowsToInsert = [
        {
          episode_slug: slug,
          lang: lang.code,
          time: esQuestions[0].time,
          title: header
        },
        ...esQuestions.slice(1).map((q, index) => ({
          episode_slug: slug,
          lang: lang.code,
          time: q.time,
          title: translatedTitles[index]
        }))
      ];
      
      const { error: insertError } = await supabase
        .from('timecodes')
        .insert(rowsToInsert);

      if (insertError) {
        console.error(`  Error inserting ${lang.code} timecodes:`, insertError);
      } else {
        console.log(`  Successfully saved ${rowsToInsert.length} timecodes for ${lang.code}.`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== Translation Complete ===');
}

translateMissingEpisodes().then(() => process.exit(0));
