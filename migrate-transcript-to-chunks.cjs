const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function migrateTranscriptToChunks() {
  try {
    console.log('🔍 Finding transcript with full utterances...');
    
    // Find transcript that might have full utterances in edited_transcript_data
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
      editedTranscriptSize: JSON.stringify(transcript.edited_transcript_data || {}).length,
      hasUtterances: !!(transcript.edited_transcript_data?.utterances),
      utteranceCount: transcript.edited_transcript_data?.utterances?.length || 0
    });
    
    // Check if we have full utterances in edited_transcript_data
    if (transcript.edited_transcript_data?.utterances && Array.isArray(transcript.edited_transcript_data.utterances)) {
      console.log('✅ Found full utterances, creating chunks...');
      
      const utterances = transcript.edited_transcript_data.utterances;
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
      
      console.log('🎉 Migration completed!');
      
      // Verify chunks were created
      const { data: verifyChunks } = await supabase
        .from('transcript_chunks')
        .select('chunk_type, chunk_index')
        .eq('episode_slug', '2025-11-19')
        .eq('lang', 'ru')
        .order('chunk_type, chunk_index');
      
      console.log('✅ Verification - chunks created:', verifyChunks?.length || 0);
      console.log('📋 Chunk types:', [...new Set(verifyChunks?.map(c => c.chunk_type) || [])]);
      
    } else {
      console.log('❌ No full utterances found in edited_transcript_data');
      console.log('Current edited_transcript_data:', transcript.edited_transcript_data);
    }
    
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateTranscriptToChunks();
