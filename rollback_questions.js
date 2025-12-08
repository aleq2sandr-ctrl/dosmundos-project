import { supabase } from './src/lib/supabaseServerClient.js';

async function rollbackQuestions() {
  console.log('Finding transcripts to rollback...');
  
  // Find transcripts with generated descriptions
  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('id, episode_slug, edited_transcript_data, short_description')
    .ilike('short_description', '[%');

  if (error) {
    console.error('Error fetching transcripts:', error);
    return;
  }

  console.log(`Found ${transcripts.length} transcripts to rollback.`);

  for (const transcript of transcripts) {
    console.log(`Rolling back ${transcript.episode_slug}...`);
    
    // Remove questions from edited_transcript_data
    const updatedData = { ...transcript.edited_transcript_data };
    if (updatedData.questions) {
      delete updatedData.questions;
    }

    // Update DB: clear short_description and update edited_transcript_data
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        short_description: null,
        edited_transcript_data: updatedData
      })
      .eq('id', transcript.id);

    if (updateError) {
      console.error(`Error rolling back ${transcript.episode_slug}:`, updateError);
    } else {
      console.log(`Successfully rolled back ${transcript.episode_slug}`);
    }
  }
  
  console.log('Rollback completed.');
}

rollbackQuestions();