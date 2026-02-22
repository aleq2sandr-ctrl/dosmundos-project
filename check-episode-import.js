import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEpisodeImport() {
  const episodeSlug = '2026-02-18';
  
  console.log(`Checking if episode ${episodeSlug} is imported...\n`);

  // Check episodes table
  console.log('1. Checking episodes table:');
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('*')
    .eq('slug', episodeSlug)
    .maybeSingle();

  if (episodeError) {
    console.error(`   ❌ Error: ${episodeError.message}`);
  } else if (episode) {
    console.log(`   ✅ Episode found: ${episode.slug}`);
    console.log(`      Date: ${episode.date}`);
    console.log(`      Created: ${new Date(episode.created_at).toLocaleString()}`);
  } else {
    console.log(`   ❌ Episode not found in episodes table`);
  }

  // Check episode_audios table
  console.log('\n2. Checking episode_audios table:');
  const { data: audios, error: audiosError } = await supabase
    .from('episode_audios')
    .select('*')
    .eq('episode_slug', episodeSlug);

  if (audiosError) {
    console.error(`   ❌ Error: ${audiosError.message}`);
  } else if (audios.length > 0) {
    console.log(`   ✅ Found ${audios.length} audio variants:`);
    audios.forEach(audio => {
      console.log(`      - ${audio.lang}: ${audio.audio_url}`);
      console.log(`         Duration: ${audio.duration} seconds`);
      console.log(`         Published: ${audio.is_published}`);
    });
  } else {
    console.log(`   ❌ No audio variants found in episode_audios table`);
  }

  // Check transcripts table
  console.log('\n3. Checking transcripts table:');
  const { data: transcripts, error: transcriptsError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('episode_slug', episodeSlug);

  if (transcriptsError) {
    console.error(`   ❌ Error: ${transcriptsError.message}`);
  } else if (transcripts.length > 0) {
    console.log(`   ✅ Found ${transcripts.length} transcripts:`);
    transcripts.forEach(transcript => {
      console.log(`      - ${transcript.lang}: ${transcript.title}`);
      console.log(`         Status: ${transcript.status}`);
    });
  } else {
    console.log(`   ❌ No transcripts found in transcripts table`);
  }

  // Check timecodes table
  console.log('\n4. Checking timecodes table:');
  const { data: timecodes, error: timecodesError } = await supabase
    .from('timecodes')
    .select('*')
    .eq('episode_slug', episodeSlug);

  if (timecodesError) {
    console.error(`   ❌ Error: ${timecodesError.message}`);
  } else if (timecodes.length > 0) {
    console.log(`   ✅ Found ${timecodes.length} timecodes`);
  } else {
    console.log(`   ❌ No timecodes found in timecodes table`);
  }

  console.log('\n============================================');
  console.log('Summary:');
  console.log('============================================');
  
  if (episode && audios.length > 0) {
    console.log('✅ Episode is imported and has audio files');
  } else {
    console.log('❌ Episode is not properly imported');
  }
}

checkEpisodeImport().catch(error => {
  console.error('\n❌ Error checking episode import:', error);
  process.exit(1);
});
