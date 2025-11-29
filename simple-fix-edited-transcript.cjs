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

async function fixEditedTranscript() {
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
    
    console.log('✅ Got utterances from AssemblyAI, updating edited_transcript_data...');
    
    // Create minimal edited_transcript_data with just utterances
    const editedTranscriptData = {
      utterances: assemblyAiResult.utterances
    };
    
    console.log('📦 edited_transcript_data size:', JSON.stringify(editedTranscriptData).length, 'bytes');
    
    // Update transcript with just utterances
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        edited_transcript_data: editedTranscriptData
      })
      .eq('id', transcript.id);
    
    if (updateError) {
      console.error('❌ Error updating transcript:', updateError);
      
      // If 413 error, try with smaller chunks
      if (updateError.message && updateError.message.includes('413')) {
        console.log('🔄 413 error, trying with smaller chunks...');
        
        // Try with first 20 utterances
        const smallerData = {
          utterances: assemblyAiResult.utterances.slice(0, 20)
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
          
          // Try with just 5 utterances
          const tinyData = {
            utterances: assemblyAiResult.utterances.slice(0, 5)
          };
          
          console.log('📦 Tiny data size:', JSON.stringify(tinyData).length, 'bytes');
          
          const { error: tinyError } = await supabase
            .from('transcripts')
            .update({
              edited_transcript_data: tinyData
            })
            .eq('id', transcript.id);
            
          if (tinyError) {
            console.error('❌ Even tiny data failed:', tinyError);
          } else {
            console.log('✅ Successfully saved tiny transcript data (first 5 utterances)');
          }
        } else {
          console.log('✅ Successfully saved smaller transcript data (first 20 utterances)');
        }
      }
    } else {
      console.log('✅ Successfully updated edited_transcript_data with full utterances!');
    }
    
    // Verify the update
    const { data: verifyData } = await supabase
      .from('transcripts')
      .select('edited_transcript_data')
      .eq('id', transcript.id)
      .single();
    
    if (verifyData?.edited_transcript_data?.utterances) {
      console.log('✅ Verification successful - utterances count:', verifyData.edited_transcript_data.utterances.length);
      console.log('📋 First utterance sample:', verifyData.edited_transcript_data.utterances[0]);
    } else {
      console.log('❌ Verification failed - no utterances found');
    }
    
  } catch (error) {
    console.error('Fix error:', error);
  }
}

fixEditedTranscript();
