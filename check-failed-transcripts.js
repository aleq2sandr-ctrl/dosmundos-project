import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTranscripts() {
  const failedEpisodes = ['2025-12-10', '2025-12-24', '2026-01-28'];
  for (const slug of failedEpisodes) {
    console.log(`Checking episode: ${slug}`);
    const { data, error } = await supabase
      .from('transcripts')
      .select('edited_transcript_data')
      .eq('episode_slug', slug)
      .eq('lang', 'es')
      .single();
      
    if (error) {
      console.error(`Error fetching ${slug}:`, error);
    } else {
      console.log(`Utterances count: ${data.edited_transcript_data.utterances.length}`);
      console.log('First 5 utterances:');
      data.edited_transcript_data.utterances.slice(0, 5).forEach((u, i) => {
        console.log(`${i + 1}: ${u.text}`);
      });
      console.log('------------------------');
    }
  }
}

checkTranscripts().catch(err => {
  console.error('Error:', err);
});
