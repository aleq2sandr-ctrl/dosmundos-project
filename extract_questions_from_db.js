import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function processEpisodes() {
  console.log('Fetching RU transcripts with questions...');

  // Fetch transcripts where lang is 'ru'
  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('episode_slug, edited_transcript_data')
    .eq('lang', 'ru');

  if (error) {
    console.error('Error fetching transcripts:', error);
    return;
  }

  console.log(`Found ${transcripts.length} RU transcripts with questions.`);

  for (const transcript of transcripts) {
    console.log(`Processing ${transcript.episode_slug}...`);

    const data = transcript.edited_transcript_data;
    if (!data.questions || data.questions.length === 0) {
      console.log(`No questions for ${transcript.episode_slug}.`);
      continue;
    }

    const date = transcript.episode_slug.match(/(\d{4}-\d{2}-\d{2})/)[1];

    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const title = q.title.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').replace(/\s+/g, '_');
      const filename = `${date}_${i + 1}_${title}.txt`;
      const filepath = path.join(process.cwd(), '..', '..', 'DosMundos', 'Meditacions', 'Медитации', filename);

      // Extract content for the question
      const utterances = data.utterances || [];
      const startTimeMs = q.time * 1000;
      const nextQ = data.questions[i + 1];
      const endTimeMs = nextQ ? nextQ.time * 1000 : Infinity;

      const relevantUtterances = utterances.filter(u => u.start >= startTimeMs && u.start < endTimeMs);
      const content = relevantUtterances.map(u => {
        const timeInSeconds = Math.floor(u.start / 1000);
        const speakerInfo = u.speaker ? `[${u.speaker}]` : '';
        return `[${timeInSeconds}s]${speakerInfo} ${u.text || ''}`;
      }).join('\n');

      fs.writeFileSync(filepath, content, 'utf-8');
      console.log(`Saved ${filename}`);
    }
  }

  console.log('Processing completed.');
}

processEpisodes();
