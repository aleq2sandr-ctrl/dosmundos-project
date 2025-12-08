import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';

dotenv.config();

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

// Initialize OpenAI (DeepSeek)
const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
if (!deepseekApiKey) {
  console.error('Error: VITE_DEEPSEEK_API_KEY not found in .env');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: deepseekApiKey,
  baseURL: 'https://api.deepseek.com',
});

async function generateQuestions(transcriptData, episodeLang) {
  // Prepare text
  const utterances = transcriptData.utterances || [];
  let textToAnalyze = '';

  if (utterances.length > 1000) {
    const totalDuration = utterances[utterances.length - 1]?.end || 0;
    const intervals = [];
    const intervalDuration = Math.floor(totalDuration / 10);

    for (let i = 0; i < 10; i++) {
      intervals.push({
        start: i * intervalDuration,
        end: (i + 1) * intervalDuration
      });
    }

    const last30Minutes = utterances.filter(u => {
      return u.start >= (totalDuration - (1800 * 1000));
    });

    let intervalSegments = [];
    intervals.forEach(interval => {
      const intervalUtterances = utterances.filter(u => {
        return u.start >= interval.start && u.start < interval.end;
      }).slice(0, 20);
      intervalSegments.push(...intervalUtterances);
    });

    const allSegments = [...intervalSegments, ...last30Minutes];
    const uniqueFinalSegments = allSegments.filter((segment, index, self) =>
      index === self.findIndex(s => s.start === segment.start)
    ).slice(0, 300);

    textToAnalyze = uniqueFinalSegments.map((utterance) => {
      const timeInSeconds = Math.floor(utterance.start / 1000);
      const speakerInfo = utterance.speaker ? `[${utterance.speaker}]` : '';
      const text = utterance.text || '';
      return `[${timeInSeconds}s]${speakerInfo} ${text}`;
    }).join('\n');
  } else {
    textToAnalyze = utterances.map((utterance) => {
      const timeInSeconds = Math.floor(utterance.start / 1000);
      const speakerInfo = utterance.speaker ? `[${utterance.speaker}]` : '';
      const text = utterance.text || '';
      return `[${timeInSeconds}s]${speakerInfo} ${text}`;
    }).join('\n');
  }

  const systemPrompt = `You are an expert content analyst specializing in multilingual podcast analysis. Your task is to identify key questions, topics, and discussions from healing/healer podcasts where people ask questions about health, wellness, and life advice.

IMPORTANT CONTEXT:
- The podcast has multiple listeners, a healer, and a translator
- Different speakers are labeled with letters (A, B, C, etc.)
- The translator translates questions from listeners and answers from the healer
- You need to identify ORIGINAL questions from listeners, not translations
- The transcript format includes timing markers: [125s][A] means 125 seconds, speaker A

STRATEGY: Focus on identifying NEW questions or topics that start new discussion threads. Look for:
- When a NEW listener starts speaking about a different problem/topic
- Changes in conversation direction to a new issue/question
- New questions that haven't been discussed before
- Different aspects of the same general topic (but as separate questions)
- Pay attention to speaker changes - new speakers often indicate new questions
- Look for explicit question markers like "вопрос от", "следующий вопрос", "очередной слушатель", "question from", "next question"
- Pay special attention to phrases that introduce new listeners or their problems
- MEDITATIONS: Look for when the healer starts guided meditations, relaxation exercises, or mindfulness practices at the end of Q&A sessions
- Look for meditation phrases like "давайте медитировать", "закройте глаза", "глубокое дыхание", "релаксация", "визуализация", "let's meditate", "close your eyes", "deep breathing"

For each identified question/topic/meditation:
1. Find the EXACT moment when this question/topic/meditation FIRST appears in the conversation
2. Look for the ORIGINAL question from the listener (not the translation)
3. Create a concise title (3-8 words) that captures the essence of the question/topic/meditation
4. For MEDITATIONS: Create titles like "Guided Meditation", "Relaxation Exercise", "Breathing Practice", etc.
5. CRITICAL: Extract the time from the [time] markers in the transcript (e.g., [125s] means 125 seconds)
6. Use the timestamp from the very first utterance where this topic/question/meditation begins

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects. Do not include markdown formatting or explanations.
Example:
[
  { "time": 120, "title": "Dealing with anxiety" },
  { "time": 450, "title": "Question about relationships" },
  { "time": 890, "title": "Guided Meditation" }
]

Language for titles: Spanish (since the episode is in Spanish).
`;

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this transcript and extract questions/topics:\n\n${textToAnalyze}` }
    ],
    temperature: 0.3,
    stream: false
  });

  const content = response.choices[0].message.content;
  // Clean up markdown code blocks if present
  const jsonText = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(jsonText);
}

async function processEpisodes() {
  console.log('Fetching ES transcripts with no description...');
  
  // Fetch transcripts where lang is 'es' - fetch only lightweight columns first
  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('id, episode_slug, short_description')
    .eq('lang', 'es');

  if (error) {
    console.error('Error fetching transcripts:', error);
    return;
  }

  // TEST MODE: Filter for specific slug
  const targetTranscripts = transcripts.filter(t => t.episode_slug === '2020-01-22');

  console.log(`Found ${targetTranscripts.length} transcripts to process.`);

  for (const transcriptSummary of targetTranscripts) {
    console.log(`Processing episode ${transcriptSummary.episode_slug}...`);
    
    // Fetch full data for this transcript
    const { data: transcript, error: detailError } = await supabase
        .from('transcripts')
        .select('id, episode_slug, edited_transcript_data')
        .eq('id', transcriptSummary.id)
        .single();
    
    if (detailError) {
        console.error(`Error fetching details for ${transcriptSummary.episode_slug}:`, detailError);
        continue;
    }

    if (!transcript.edited_transcript_data || !transcript.edited_transcript_data.utterances) {
      console.log(`Skipping ${transcript.episode_slug}: No utterances found.`);
      continue;
    }

    try {
      // Generate questions
      console.log(`Generating questions for ${transcript.episode_slug}...`);
      const questions = await generateQuestions(transcript.edited_transcript_data, 'es');
      
      if (!questions || questions.length === 0) {
        console.log(`No questions generated for ${transcript.episode_slug}.`);
        continue;
      }

      console.log(`Generated ${questions.length} questions:`);
      console.log(JSON.stringify(questions, null, 2));

      // Format questions for short_description
      // Format: [time] Title
      const descriptionLines = questions.map(q => {
        const minutes = Math.floor(q.time / 60);
        const seconds = Math.floor(q.time % 60);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return `[${timeStr}] ${q.title}`;
      });
      
      const shortDescription = descriptionLines.join('\n');
      console.log('Generated Short Description:');
      console.log(shortDescription);

      // SKIP DB UPDATE FOR TEST
      /*
      const updatedData = {
        ...transcript.edited_transcript_data,
        questions: questions
      };

      const { error: updateError } = await supabase
        .from('transcripts')
        .update({
          short_description: shortDescription,
          edited_transcript_data: updatedData
        })
        .eq('id', transcript.id);

      if (updateError) {
        console.error(`Error updating ${transcript.episode_slug}:`, updateError);
      } else {
        console.log(`Successfully updated ${transcript.episode_slug}`);
      }
      */

    } catch (err) {
      console.error(`Error processing ${transcript.episode_slug}:`, err);
    }
    break; // Process only one
  }
  
  console.log('Processing completed.');
}

processEpisodes();