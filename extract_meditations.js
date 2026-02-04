import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log('Fetching RU timecodes...');

  // Fetch timecodes where lang is 'ru'
  const { data: timecodes, error: timecodesError } = await supabase
    .from('timecodes')
    .select('*')
    .eq('lang', 'ru')
    .order('time', { ascending: true });

  if (timecodesError) {
    console.error('Error fetching timecodes:', timecodesError);
    return;
  }

  console.log(`Found ${timecodes.length} RU timecodes.`);

  // Group timecodes by episode_slug
  const episodes = {};
  for (const tc of timecodes) {
    if (!episodes[tc.episode_slug]) {
      episodes[tc.episode_slug] = [];
    }
    episodes[tc.episode_slug].push(tc);
  }

  const episodeSlugs = Object.keys(episodes);
  console.log(`Found ${episodeSlugs.length} episodes with timecodes.`);

  // Target directory: ../../DosMundos/Book/Медитации
  const targetDir = path.resolve(__dirname, '../../DosMundos/Book/Медитации');
  
  console.log(`Target directory: ${targetDir}`);

  if (!fs.existsSync(targetDir)){
      console.log('Creating directory...');
      fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const slug of episodeSlugs) {
    console.log(`Processing ${slug}...`);
    
    // Fetch transcript
    const { data: transcript, error: transcriptError } = await supabase
        .from('transcripts')
        .select('edited_transcript_data')
        .eq('episode_slug', slug)
        .eq('lang', 'ru')
        .single();

    if (transcriptError) {
        console.error(`Error fetching transcript for ${slug}:`, transcriptError.message);
        continue;
    }

    if (!transcript || !transcript.edited_transcript_data || !transcript.edited_transcript_data.utterances) {
        console.log(`No transcript data for ${slug}`);
        continue;
    }

    const utterances = transcript.edited_transcript_data.utterances;
    const questions = episodes[slug];

    // Extract date from slug YYYY-MM-DD
    const dateMatch = slug.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : slug;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Sanitize title for filename
      const title = q.title.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim().replace(/\s+/g, '_');
      const filename = `${date}_${i + 1}_${title}.txt`;
      const filepath = path.join(targetDir, filename);

      const startTimeMs = q.time * 1000;
      
      const nextQ = questions[i + 1];
      const endTimeMs = nextQ ? nextQ.time * 1000 : Infinity;

      const relevantUtterances = utterances.filter(u => u.start >= startTimeMs && u.start < endTimeMs);
      
      if (relevantUtterances.length === 0) {
          console.log(`No utterances found for question: ${title} (${q.time}s)`);
          continue;
      }

      const content = relevantUtterances.map(u => {
        const speaker = u.speaker ? `${u.speaker}: ` : '';
        return `${speaker}${u.text || ''}`;
      }).join('\n');

      fs.writeFileSync(filepath, content, 'utf-8');
    }
  }

  console.log('Processing completed.');
}

processEpisodes();
