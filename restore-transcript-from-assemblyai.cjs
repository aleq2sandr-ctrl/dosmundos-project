const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// AssemblyAI service for fetching transcript
async function getTranscriptionResult(transcriptId, language = 'ru') {
  const apiKey = process.env.VITE_ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('AssemblyAI API key not found');
  }

  const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
    headers: {
      authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`AssemblyAI API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function restoreTranscript() {
  try {
    console.log('🔍 Finding transcript with provider_id...');
    
    // Find transcript with provider_id (AssemblyAI transcript ID)
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('episode_slug', '2025-11-19')
      .eq('lang', 'ru')
      .single();
    
    if (transcriptError) {
      console.error('Error finding transcript:', transcriptError);
      return;
    }
    
    console.log('📊 Found transcript:', {
      id: transcript.id,
      status: transcript.status,
      providerId: transcript.transcript_data?.provider_id,
      transcriptDataSize: JSON.stringify(transcript.transcript_data || {}).length
    });
    
    const providerId = transcript.transcript_data?.provider_id;
    if (!providerId) {
      console.log('❌ No provider_id found, cannot restore from AssemblyAI');
      return;
    }
    
    console.log('🔄 Fetching transcript from AssemblyAI...');
    const assemblyAiResult = await getTranscriptionResult(providerId, 'ru');
    
    console.log('📤 AssemblyAI result:', {
      id: assemblyAiResult.id,
      status: assemblyAiResult.status,
      utterancesCount: assemblyAiResult.utterances?.length || 0
    });
    
    if (assemblyAiResult.status !== 'completed' || !assemblyAiResult.utterances) {
      console.log('❌ AssemblyAI transcript not completed or no utterances');
      return;
    }
    
    console.log('✅ Got utterances from AssemblyAI, creating chunks...');
    
    const utterances = assemblyAiResult.utterances;
    const chunkSize = 50;
    const chunks = [];
    
    // Create transcript chunks
    for (let i = 0; i < utterances.length; i += chunkSize) {
      const chunk = utterances.slice(i, i + chunkSize);
      chunks.push({
        episode_slug: '2025-11-19',
        lang: 'ru',
        chunk_type: 'transcript',
        chunk_index: Math.floor(i / chunkSize),
        chunk_data: { utterances: chunk }
      });
    }
    
    // Create edited_transcript chunks (same data initially)
    for (let i = 0; i < utterances.length; i += chunkSize) {
      const chunk = utterances.slice(i, i + chunkSize);
      chunks.push({
        episode_slug: '2025-11-19',
        lang: 'ru',
        chunk_type: 'edited_transcript',
        chunk_index: Math.floor(i / chunkSize),
        chunk_data: { utterances: chunk }
      });
    }
    
    console.log(`📦 Creating ${chunks.length} chunks (${chunks.length/2} transcript + ${chunks.length/2} edited)`);
    
    // Insert chunks in batches
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('transcript_chunks')
        .upsert(batch, { onConflict: 'episode_slug,lang,chunk_type,chunk_index' });
      
      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError);
      } else {
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)} inserted`);
      }
    }
    
    console.log('🎉 Restoration completed!');
    
    // Also update edited_transcript_data with full utterances as backup
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        edited_transcript_data: {
          utterances: utterances,
          restored_from: 'assemblyai',
          restored_at: new Date().toISOString()
        }
      })
      .eq('id', transcript.id);
    
    if (updateError) {
      console.error('Error updating transcript with full data:', updateError);
    } else {
      console.log('✅ Also updated edited_transcript_data with full utterances as backup');
    }
    
    // Verify chunks were created
    const { data: verifyChunks } = await supabase
      .from('transcript_chunks')
      .select('chunk_type, chunk_index')
      .eq('episode_slug', '2025-11-19')
      .eq('lang', 'ru')
      .order('chunk_type, chunk_index');
    
    console.log('✅ Verification - chunks created:', verifyChunks?.length || 0);
    console.log('📋 Chunk types:', [...new Set(verifyChunks?.map(c => c.chunk_type) || [])]);
    
  } catch (error) {
    console.error('Restoration error:', error);
  }
}

restoreTranscript();
