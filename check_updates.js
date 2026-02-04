import { supabase } from './src/lib/supabaseServerClient.js';

async function checkRecentUpdates() {
  console.log('Checking for transcripts with generated short_description...');
  
  // Check for descriptions starting with '[' (e.g. [00:00] Title)
  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('id, episode_slug, short_description, updated_at')
    .ilike('short_description', '[%')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (transcripts.length === 0) {
    console.log('No transcripts found with generated short_description.');
  } else {
    console.log(`Found ${transcripts.length} transcripts:`);
    transcripts.forEach(t => {
      console.log(`- ${t.episode_slug} (updated: ${t.updated_at})`);
      console.log(`  Desc: ${t.short_description.substring(0, 50)}...`);
    });
  }
}

checkRecentUpdates();