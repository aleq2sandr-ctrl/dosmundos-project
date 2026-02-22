import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

async function translateText(text, targetLangName) {
  const prompt = `Translate the following Spanish title to ${targetLangName}. 
Return ONLY the translated text without any quotes, markdown or explanations.

Text: ${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a professional translator. Return only the translated text." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      stream: false
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error translating to ${targetLangName}:`, error);
    return null;
  }
}

async function restoreHeaders() {
  console.log('=== Restoring Original Headers ===\n');
  
  // Get all ES timecodes (first of each episode)
  const { data: esTimecodes, error } = await supabase
    .from('timecodes')
    .select('*')
    .eq('lang', 'es')
    .order('episode_slug')
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching ES timecodes:', error);
    return;
  }

  // Group by episode and get first timecode
  const grouped = {};
  esTimecodes.forEach(t => {
    if (!grouped[t.episode_slug]) {
      grouped[t.episode_slug] = t;
    }
  });

  const esHeaders = Object.entries(grouped).map(([slug, tc]) => ({
    slug,
    esTitle: tc.title,
    time: tc.time
  }));

  console.log(`Found ${esHeaders.length} ES headers to restore.\n`);

  // Restore ES headers (they were also changed)
  console.log('Restoring ES headers...');
  for (const header of esHeaders) {
    // Check if current header is in "Meditación DD.MM.YY" format
    const meditationPattern = /^Meditación \d{2}\.\d{2}\.\d{2}$/;
    const { data: currentTc } = await supabase
      .from('timecodes')
      .select('title')
      .eq('episode_slug', header.slug)
      .eq('lang', 'es')
      .eq('time', header.time)
      .single();

    if (currentTc && meditationPattern.test(currentTc.title)) {
      // Need to restore - but we don't have original, need to check if there's backup
      console.log(`  ES ${header.slug}: Current="${currentTc.title}" - need original title`);
    }
  }

  // For other languages, translate from ES
  for (const lang of TARGET_LANGUAGES) {
    console.log(`\nRestoring ${lang.name} (${lang.code}) headers...`);
    
    let restored = 0;
    let errors = 0;

    for (const header of esHeaders) {
      // Get current header for this episode in this language
      const { data: currentTc } = await supabase
        .from('timecodes')
        .select('id, title')
        .eq('episode_slug', header.slug)
        .eq('lang', lang.code)
        .eq('time', header.time)
        .single();

      if (!currentTc) {
        continue; // No timecode for this episode in this language
      }

      // Check if it's in "Meditation DD.MM.YY" format
      const meditationPattern = /^Medit[aei]ci[oó]n \d{2}\.\d{2}\.\d{2}$/;
      
      if (meditationPattern.test(currentTc.title)) {
        // Translate ES title to this language
        const translatedTitle = await translateText(header.esTitle, lang.name);
        
        if (translatedTitle) {
          const { error: updateError } = await supabase
            .from('timecodes')
            .update({ title: translatedTitle })
            .eq('id', currentTc.id);

          if (updateError) {
            console.error(`  Error updating ${header.slug} (${lang.code}):`, updateError);
            errors++;
          } else {
            console.log(`  ${header.slug} (${lang.code}): "${currentTc.title}" → "${translatedTitle}"`);
            restored++;
          }
        } else {
          errors++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`  ${lang.name}: Restored ${restored}, Errors ${errors}`);
  }

  console.log('\n=== Restoration Complete ===');
}

restoreHeaders().then(() => process.exit(0));
