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

async function checkEnglishHeaders() {
  console.log('Checking English timecodes headers...\n');
  
  // Get all English timecodes
  const { data, error } = await supabase
    .from('timecodes')
    .select('*')
    .eq('lang', 'en')
    .order('episode_slug')
    .order('time');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Group by episode_slug
  const byEpisode = {};
  data.forEach(t => {
    if (!byEpisode[t.episode_slug]) byEpisode[t.episode_slug] = [];
    byEpisode[t.episode_slug].push(t);
  });
  
  console.log(`Total episodes with EN timecodes: ${Object.keys(byEpisode).length}\n`);
  
  // Check for incorrect headers (not Meditation DD.MM.YY format)
  const meditationPattern = /^Meditation \d{2}\.\d{2}\.\d{2}$/;
  const incorrectEpisodes = [];
  
  for (const [slug, timecodes] of Object.entries(byEpisode)) {
    const firstTitle = timecodes[0].title;
    const isCorrect = meditationPattern.test(firstTitle);
    if (!isCorrect) {
      incorrectEpisodes.push({ slug, firstTitle });
      console.log(`INCORRECT: ${slug} -> "${firstTitle}"`);
    }
  }
  
  console.log(`\nTotal incorrect: ${incorrectEpisodes.length}`);
  
  // Also check what languages are missing
  console.log('\n=== Checking missing translations ===');
  
  const { data: esData } = await supabase
    .from('timecodes')
    .select('episode_slug')
    .eq('lang', 'es');
  
  const esSlugs = [...new Set(esData.map(e => e.episode_slug))];
  console.log(`Episodes with ES: ${esSlugs.length}`);
  
  for (const lang of ['en', 'fr', 'de', 'pl']) {
    const { data: langData } = await supabase
      .from('timecodes')
      .select('episode_slug')
      .eq('lang', lang);
    
    const langSlugs = [...new Set(langData.map(e => e.episode_slug))];
    const missing = esSlugs.filter(s => !langSlugs.includes(s));
    console.log(`${lang.toUpperCase()}: ${langSlugs.length} episodes, ${missing.length} missing`);
    if (missing.length > 0 && missing.length <= 10) {
      console.log(`  Missing: ${missing.join(', ')}`);
    }
  }
}

checkEnglishHeaders().then(() => process.exit(0));
