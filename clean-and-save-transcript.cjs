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

// Clean utterances by removing words array
function cleanUtterances(utterances) {
  return utterances.map(utterance => {
    const { words, ...cleanUtterance } = utterance;
    return cleanUtterance;
  });
}

async function cleanAndSaveTranscript() {
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
      providerId: transcript.transcript_data?.provider_id
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
    
    console.log('✅ Got utterances from AssemblyAI, cleaning...');
    
    // Clean utterances by removing words
    const cleanedUtterances = cleanUtterances(assemblyAiResult.utterances);
    
    console.log('📊 Size comparison:');
    console.log('  Original utterances size:', JSON.stringify(assemblyAiResult.utterances).length, 'bytes');
    console.log('  Cleaned utterances size:', JSON.stringify(cleanedUtterances).length, 'bytes');
    console.log('  Size reduction:', Math.round((1 - JSON.stringify(cleanedUtterances).length / JSON.stringify(assemblyAiResult.utterances).length) * 100), '%');
    
    // Try to save cleaned utterances
    const editedTranscriptData = {
      utterances: cleanedUtterances
    };
    
    console.log('📦 Final data size:', JSON.stringify(editedTranscriptData).length, 'bytes');
    
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        edited_transcript_data: editedTranscriptData
      })
      .eq('id', transcript.id);
    
    if (updateError) {
      console.error('❌ Error updating transcript:', updateError);
      
      // If still too large, try with even fewer utterances
      if (updateError.message && updateError.message.includes('413')) {
        console.log('🔄 Still too large, trying with first 100 cleaned utterances...');
        
        const smallerData = {
          utterances: cleanedUtterances.slice(0, 100)
        };
        
        console.log('📦 Smaller data size:', JSON.stringify(smallerData).length, 'bytes');
        
        const { error: smallerError } = await supabase
          .from('transcripts')
          .update({
            edited_transcript_data: smallerData
          })
          .eq('id', transcript.id);
          
        if (smallerError) {
          console.error('❌ Even smaller data failed:', smallerError);
        } else {
          console.log('✅ Successfully saved first 100 cleaned utterances!');
        }
      }
    } else {
      console.log('✅ Successfully saved all cleaned utterances!');
    }
    
    // Also update chunks with cleaned data
    console.log('🔄 Updating chunks with cleaned data...');
    
    const chunkSize = 50;
    const chunks = [];
    
    // Create transcript chunks with cleaned data
    for (let i = 0; i < cleanedUtterances.length; i += chunkSize) {
      const chunk = cleanedUtterances.slice(i, i + chunkSize);
      chunks.push({
        episode_slug: '2025-11-19',
        lang: 'ru',
        chunk_type: 'transcript',
        chunk_index: Math.floor(i / chunkSize),
        chunk_data: { utterances: chunk }
      });
    }
    
    // Create edited_transcript chunks with cleaned data
    for (let i = 0; i < cleanedUtterances.length; i += chunkSize) {
      const chunk = cleanedUtterances.slice(i, i + chunkSize);
      chunks.push({
        episode_slug: '2025-11-19',
        lang: 'ru',
        chunk_type: 'edited_transcript',
        chunk_index: Math.floor(i / chunkSize),
        chunk_data: { utterances: chunk }
      });
    }
    
    console.log(`📦 Creating ${chunks.length} cleaned chunks`);
    
    // Delete existing chunks first
    const { error: deleteError } = await supabase
      .from('transcript_chunks')
      .delete()
      .eq('episode_slug', '2025-11-19')
      .eq('lang', 'ru');
    
    if (deleteError) {
      console.error('Error deleting old chunks:', deleteError);
    } else {
      console.log('✅ Old chunks deleted');
    }
    
    // Insert cleaned chunks in batches
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
    
    console.log('🎉 Clean transcript migration completed!');
    
  } catch (error) {
    console.error('Clean and save error:', error);
  }
}

cleanAndSaveTranscript();
