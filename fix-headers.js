import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Convert episode slug (YYYY-MM-DD) to header format "Meditation DD.MM.YY"
 * @param {string} slug - Episode slug like "2019-06-26"
 * @returns {string} - Header like "Meditation 26.06.19"
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

async function fixHeaders() {
  console.log('=== Fixing Headers in Database ===\n');
  
  const languages = ['en', 'es', 'fr', 'de', 'pl'];
  let totalUpdates = 0;
  let totalErrors = 0;
  
  for (const lang of languages) {
    console.log(`\nProcessing language: ${lang}`);
    
    // Get all timecodes for this language
    const { data: timecodes, error } = await supabase
      .from('timecodes')
      .select('*')
      .eq('lang', lang)
      .order('episode_slug')
      .order('time', { ascending: true });
    
    if (error) {
      console.error(`Error fetching ${lang} timecodes:`, error);
      continue;
    }
    
    // Group by episode_slug
    const grouped = {};
    timecodes.forEach(t => {
      if (!grouped[t.episode_slug]) {
        grouped[t.episode_slug] = [];
      }
      grouped[t.episode_slug].push(t);
    });
    
    // Find first timecode for each episode
    for (const [slug, episodeTimecodes] of Object.entries(grouped)) {
      const firstTimecode = episodeTimecodes[0];
      const expectedHeader = slugToHeader(slug, lang);
      
      if (!expectedHeader) {
        continue;
      }
      
      if (firstTimecode.title !== expectedHeader) {
        const { error: updateError } = await supabase
          .from('timecodes')
          .update({ title: expectedHeader })
          .eq('id', firstTimecode.id);
        
        if (updateError) {
          console.error(`  Error updating ${slug} (${lang}):`, updateError);
          totalErrors++;
        } else {
          console.log(`  Updated ${slug} (${lang}): "${firstTimecode.title}" -> "${expectedHeader}"`);
          totalUpdates++;
        }
      }
    }
  }
  
  console.log(`\n=== Update Complete ===`);
  console.log(`Successfully updated: ${totalUpdates}`);
  console.log(`Errors: ${totalErrors}`);
}

fixHeaders().then(() => process.exit(0));
