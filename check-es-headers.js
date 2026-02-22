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

async function checkSpanishHeaders() {
  const { data, error } = await supabase
    .from('timecodes')
    .select('*')
    .eq('lang', 'es')
    .order('episode_slug')
    .order('time');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const byEpisode = {};
  data.forEach(t => {
    if (!byEpisode[t.episode_slug]) byEpisode[t.episode_slug] = [];
    byEpisode[t.episode_slug].push(t);
  });
  
  console.log('=== Sample Spanish headers (first 20 episodes) ===');
  const slugs = Object.keys(byEpisode).sort().slice(0, 20);
  for (const slug of slugs) {
    const firstTitle = byEpisode[slug][0].title;
    console.log(`${slug}: ${firstTitle}`);
  }
  
  console.log('\n=== Checking pattern ===');
  const meditationPattern = /^Meditación \d{2}\.\d{2}\.\d{2}$/;
  let correct = 0;
  let incorrect = 0;
  
  for (const [slug, timecodes] of Object.entries(byEpisode)) {
    const firstTitle = timecodes[0].title;
    if (meditationPattern.test(firstTitle)) {
      correct++;
    } else {
      incorrect++;
    }
  }
  
  console.log(`Correct (Meditación DD.MM.YY): ${correct}`);
  console.log(`Incorrect: ${incorrect}`);
}

checkSpanishHeaders().then(() => process.exit(0));
