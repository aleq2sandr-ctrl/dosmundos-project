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

async function check2021Transcripts() {
  console.log('=== Checking 2021 Episodes Transcripts ===\n');
  
  // Get 2021 episodes
  const { data: episodes, error: epError } = await supabase
    .from('episodes')
    .select('slug')
    .like('slug', '2021-%')
    .order('slug', { ascending: true });
  
  if (epError) {
    console.error('Error fetching episodes:', epError);
    return;
  }
  
  console.log(`Total 2021 episodes: ${episodes.length}\n`);
  
  // Get transcripts for 2021 episodes (without large data field)
  const slugs = episodes.map(e => e.slug);
  const { data: transcripts, error: tError } = await supabase
    .from('transcripts')
    .select('episode_slug, lang')
    .in('episode_slug', slugs);
  
  if (tError) {
    console.error('Error fetching transcripts:', tError);
    return;
  }
  
  // Group by episode
  const byEpisode = {};
  for (const t of transcripts || []) {
    if (!byEpisode[t.episode_slug]) {
      byEpisode[t.episode_slug] = {};
    }
    byEpisode[t.episode_slug][t.lang] = {
      hasData: !!t.edited_transcript_data,
      utterances: t.edited_transcript_data?.utterances?.length || 0
    };
  }
  
  // Show status
  const langs = ['es', 'en', 'fr', 'de', 'pl', 'ru'];
  
  console.log('2021 Episodes transcript status:');
  for (const ep of episodes) {
    const epTranscripts = byEpisode[ep.slug] || {};
    const status = langs.map(l => {
      const t = epTranscripts[l];
      if (!t) return `${l}:❌`;
      if (t.hasData && t.utterances > 0) return `${l}:${t.utterances}u`;
      if (t.hasData) return `${l}:✓`;
      return `${l}:❌`;
    }).join(' ');
    console.log(`  ${ep.slug}: ${status}`);
  }
  
  // Find episodes with ES but missing other languages
  const needsTranslation = [];
  for (const ep of episodes) {
    const epTranscripts = byEpisode[ep.slug] || {};
    if (epTranscripts.es?.hasData) {
      const missing = langs.filter(l => l !== 'es' && !epTranscripts[l]?.hasData);
      if (missing.length > 0) {
        needsTranslation.push({ slug: ep.slug, missing, esUtterances: epTranscripts.es.utterances });
      }
    }
  }
  
  console.log(`\nEpisodes with ES but missing other languages: ${needsTranslation.length}`);
  for (const ep of needsTranslation.slice(0, 10)) {
    console.log(`  ${ep.slug}: ES(${ep.esUtterances}u) missing ${ep.missing.join(', ')}`);
  }
  
  return needsTranslation;
}

check2021Transcripts();
