const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkChunks() {
  try {
    console.log('🔍 Checking chunks for 2025-11-19 ru...');
    
    // Get all chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('transcript_chunks')
      .select('*')
      .eq('episode_slug', '2025-11-19')
      .eq('lang', 'ru')
      .order('chunk_type, chunk_index');
    
    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
      return;
    }
    
    console.log('📊 Found chunks:', chunks?.length || 0);
    
    if (!chunks || chunks.length === 0) {
      console.log('❌ No chunks found');
      return;
    }
    
    // Group by type
    const transcriptChunks = chunks.filter(c => c.chunk_type === 'transcript');
    const editedChunks = chunks.filter(c => c.chunk_type === 'edited_transcript');
    
    console.log('📋 Transcript chunks:', transcriptChunks.length);
    console.log('📋 Edited transcript chunks:', editedChunks.length);
    
    // Check first chunk of each type
    if (transcriptChunks.length > 0) {
      const firstTranscript = transcriptChunks[0];
      console.log('🔹 First transcript chunk:', {
        chunkIndex: firstTranscript.chunk_index,
        utterancesCount: firstTranscript.chunk_data?.utterances?.length || 0,
        sampleUtterance: firstTranscript.chunk_data?.utterances?.[0]?.text?.substring(0, 100) + '...'
      });
    }
    
    if (editedChunks.length > 0) {
      const firstEdited = editedChunks[0];
      console.log('🔹 First edited chunk:', {
        chunkIndex: firstEdited.chunk_index,
        utterancesCount: firstEdited.chunk_data?.utterances?.length || 0,
        sampleUtterance: firstEdited.chunk_data?.utterances?.[0]?.text?.substring(0, 100) + '...'
      });
    }
    
    // Try to reconstruct manually
    console.log('🔄 Attempting manual reconstruction...');
    
    const editedUtterances = [];
    for (const chunk of editedChunks.sort((a, b) => a.chunk_index - b.chunk_index)) {
      editedUtterances.push(...(chunk.chunk_data?.utterances || []));
    }
    
    console.log('✅ Reconstructed from edited chunks:', {
      totalUtterances: editedUtterances.length,
      firstUtterance: editedUtterances[0]?.text?.substring(0, 100) + '...',
      lastUtterance: editedUtterances[editedUtterances.length - 1]?.text?.substring(0, 100) + '...'
    });
    
    // Also check current transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('edited_transcript_data')
      .eq('episode_slug', '2025-11-19')
      .eq('lang', 'ru')
      .single();
    
    console.log('📊 Current edited_transcript_data:', {
      hasUtterances: !!(transcript?.edited_transcript_data?.utterances),
      utterancesCount: transcript?.edited_transcript_data?.utterances?.length || 0,
      hasCount: !!(transcript?.edited_transcript_data?.utterance_count),
      count: transcript?.edited_transcript_data?.utterance_count || 0
    });
    
  } catch (error) {
    console.error('Check error:', error);
  }
}

checkChunks();
