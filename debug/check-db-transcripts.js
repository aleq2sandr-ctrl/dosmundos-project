import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTranscripts() {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .gte('created_at', '2026-02-20');

  if (error) {
    console.error('Error fetching transcripts:', error);
    return;
  }

  console.log(`Found ${data.length} new transcripts (created after 2026-02-20)`);
  console.log('========================================');

  data.forEach((t, index) => {
    console.log(`Transcript ${index + 1}: ${t.episode_slug} (${t.lang})`);
    console.log(`Status: ${t.status}`);
    console.log(`Created at: ${t.created_at}`);
    if (t.edited_transcript_data) {
      const keys = Object.keys(t.edited_transcript_data);
      console.log(`Keys in data: ${keys.join(', ')}`);
      if (t.edited_transcript_data.utterances) {
        console.log(`Utterances count: ${t.edited_transcript_data.utterances.length}`);
        if (t.edited_transcript_data.utterances.length > 0) {
          const firstUtt = t.edited_transcript_data.utterances[0];
          console.log(
            `First utterance: ${firstUtt.text.substring(0, 50)}... (${firstUtt.start}ms - ${firstUtt.end}ms)`
          );
        }
      }
    }
    console.log('----------------------------------------');
  });
}

checkTranscripts().catch(console.error);
