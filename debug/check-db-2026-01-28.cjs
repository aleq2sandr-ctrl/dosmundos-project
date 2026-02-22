const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEpisode() {
  console.log('=== Checking 2026-01-28 RU ===');
  
  // Check episode
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('*')
    .eq('slug', '2026-01-28')
    .maybeSingle();
    
  if (episodeError) {
    console.error('❌ Episode error:', episodeError);
    return;
  }
  
  if (!episode) {
    console.error('❌ Episode not found');
    return;
  }
  
  console.log('✅ Episode found');
  console.log(`Date: ${episode.date}`);
  
  // Check audio
  const { data: audio, error: audioError } = await supabase
    .from('episode_audios')
    .select('*')
    .eq('episode_slug', '2026-01-28')
    .eq('lang', 'mixed')
    .maybeSingle();
    
  if (audioError) {
    console.error('❌ Audio error:', audioError);
    return;
  }
  
  if (!audio) {
    console.error('❌ Audio not found');
    return;
  }
  
  console.log('✅ Audio found');
  console.log(`Duration: ${Math.floor(audio.duration / 3600)}:${Math.floor((audio.duration % 3600) / 60)}:${(audio.duration % 60).toString().padStart(2, '0')}`);
  
  // Check transcript
  const { data: transcript, error: transcriptError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('episode_slug', '2026-01-28')
    .eq('lang', 'ru')
    .maybeSingle();
    
  if (transcriptError) {
    console.error('❌ Transcript error:', transcriptError);
    return;
  }
  
  if (!transcript) {
    console.error('❌ Transcript not found');
    return;
  }
  
  console.log('✅ Transcript found');
  console.log(`Title: ${transcript.title}`);
  
  if (transcript.edited_transcript_data) {
    const { utterances, text } = transcript.edited_transcript_data;
    if (utterances && Array.isArray(utterances)) {
      console.log(`Utterances count: ${utterances.length}`);
      
      const minTime = Math.min(...utterances.map(u => u.start)) / 1000;
      const maxTime = Math.max(...utterances.map(u => u.end)) / 1000;
      
      console.log(`Utterances time range: ${Math.floor(minTime / 60)}:${(minTime % 60).toFixed(0).padStart(2, '0')} - ${Math.floor(maxTime / 60)}:${(maxTime % 60).toFixed(0).padStart(2, '0')}`);
    }
    
    if (text) {
      console.log(`Text length: ${text.length}`);
    }
  }
  
  // Check timecodes
  const { data: timecodes, error: timecodesError } = await supabase
    .from('timecodes')
    .select('*')
    .eq('episode_slug', '2026-01-28')
    .eq('lang', 'ru');
    
  if (timecodesError) {
    console.error('❌ Timecodes error:', timecodesError);
    return;
  }
  
  console.log(`\nTimecodes count: ${timecodes.length}`);
  
  if (timecodes.length > 0) {
    const minTime = Math.min(...timecodes.map(t => t.start_time)) / 1000;
    const maxTime = Math.max(...timecodes.map(t => t.start_time)) / 1000;
    
    console.log(`Timecodes time range: ${Math.floor(minTime / 60)}:${(minTime % 60).toFixed(0).padStart(2, '0')} - ${Math.floor(maxTime / 60)}:${(maxTime % 60).toFixed(0).padStart(2, '0')}`);
    
    // Check time distribution
    const distribution = {};
    timecodes.forEach(t => {
      const minute = Math.floor(t.start_time / 60000);
      distribution[minute] = (distribution[minute] || 0) + 1;
    });
    
    console.log('\nTime distribution by minute:');
    Object.keys(distribution).sort((a, b) => a - b).forEach(minute => {
      console.log(`  ${minute.padStart(2, '0')}min: ${distribution[minute]}`);
    });
  }
}

checkEpisode().catch(console.error);
