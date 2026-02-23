import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.dosmundos.pe';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const deepseekApiKey = process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
const openai = new OpenAI({
  apiKey: deepseekApiKey,
  baseURL: 'https://api.deepseek.com',
});

// Episodes to fix
const EPISODES_TO_FIX = [
  '2026-01-28',
  '2026-02-18'
];

const AUDIO_DIR = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

async function generateTimecodes(transcriptData, episodeSlug) {
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
- Look for explicit question markers like "pregunta de", "siguiente pregunta", "otro oyente", "question from", "next question"
- Pay special attention to phrases that introduce new listeners or their problems
- MEDITATIONS: Look for when the healer starts guided meditations, relaxation exercises, or mindfulness practices at the end of Q&A sessions
- Look for meditation phrases like "vamos a meditar", "cierren los ojos", "respiración profunda", "relajación", "visualización", "let's meditate", "close your eyes", "deep breathing"

For each identified question/topic/meditation:
1. Find the EXACT moment when this question/topic/meditation FIRST appears in the conversation
2. Look for the ORIGINAL question from the listener (not the translation)
3. Create a concise title (3-8 words) that captures the essence of the question/topic/meditation
4. For MEDITATIONS: Create titles like "Meditación guiada", "Ejercicio de relajación", "Práctica de respiración", etc.
5. CRITICAL: Extract the time from the [time] markers in the transcript (e.g., [125s] means 125 seconds)
6. Use the timestamp from the very first utterance where this topic/question/meditation begins

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects. Do not include markdown formatting or explanations.
Example:
[
  { "time": 120, "title": "Lidiar con la ansiedad" },
  { "time": 450, "title": "Pregunta sobre relaciones" },
  { "time": 890, "title": "Meditación guiada" }
]

Language for titles: Spanish.
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

async function translateTitle(title, targetLang) {
  const langNames = {
    en: 'English',
    fr: 'French',
    de: 'German',
    pl: 'Polish'
  };

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { 
        role: "system", 
        content: `You are a professional translator. Translate the following Spanish title to ${langNames[targetLang]}. Return ONLY the translated title, nothing else.` 
      },
      { role: "user", content: title }
    ],
    temperature: 0.3
  });

  return response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

/**
 * Convert words array to utterances array
 */
function convertWordsToUtterances(words) {
  if (!words || !Array.isArray(words) || words.length === 0) {
    return [];
  }

  const utterances = [];
  let currentUtterance = null;
  let utteranceId = 0;

  const sortedWords = [...words].sort((a, b) => a.start - b.start);

  for (const word of sortedWords) {
    const speaker = word.speaker || 'A';
    
    const normalizedWord = {
      text: word.text,
      start: word.start,
      end: word.end,
      speaker: speaker
    };
    
    const timeGap = currentUtterance ? word.start - currentUtterance.end : 0;
    const isNewSpeaker = !currentUtterance || currentUtterance.speaker !== speaker;
    const isLongPause = timeGap > 3000;

    let shouldCreateNew = false;
    if (!currentUtterance) {
      shouldCreateNew = true;
    } else if (word.speaker === null || word.speaker === undefined) {
      shouldCreateNew = isLongPause;
    } else {
      shouldCreateNew = isNewSpeaker || isLongPause;
    }

    if (shouldCreateNew) {
      if (currentUtterance) {
        utterances.push(currentUtterance);
      }
      
      currentUtterance = {
        start: word.start,
        end: word.end,
        text: word.text,
        speaker: speaker,
        id: utteranceId++,
        words: [normalizedWord]
      };
    } else {
      currentUtterance.text += ' ' + word.text;
      currentUtterance.end = word.end;
      currentUtterance.words.push(normalizedWord);
    }
  }

  if (currentUtterance) {
    utterances.push(currentUtterance);
  }

  return utterances;
}

async function processEpisode(slug) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${slug}`);
  console.log('='.repeat(60));

  // Read Spanish transcript from file
  const esPath = path.join(AUDIO_DIR, `${slug}_ES.json`);
  if (!fs.existsSync(esPath)) {
    console.log(`  ❌ Spanish transcript not found: ${esPath}`);
    return;
  }

  const transcriptJson = JSON.parse(fs.readFileSync(esPath, 'utf8'));
  
  // Check if it has utterances or words
  let utterances = transcriptJson.utterances;
  if (!utterances || utterances.length === 0) {
    // Try to convert from words
    if (transcriptJson.words && transcriptJson.words.length > 0) {
      console.log(`  Converting ${transcriptJson.words.length} words to utterances...`);
      utterances = convertWordsToUtterances(transcriptJson.words);
    }
  }
  
  if (!utterances || utterances.length === 0) {
    console.log(`  ❌ No utterances or words in transcript`);
    return;
  }

  console.log(`  Found ${utterances.length} utterances`);

  // Generate timecodes using Deepseek
  console.log(`  🤖 Generating timecodes with Deepseek...`);
  const timecodes = await generateTimecodes({ utterances }, slug);
  console.log(`  Generated ${timecodes.length} timecodes`);

  if (timecodes.length === 0) {
    console.log(`  ❌ No timecodes generated`);
    return;
  }

  // Delete existing timecodes for this episode (es, en, fr, de, pl)
  const { error: deleteError } = await supabase
    .from('timecodes')
    .delete()
    .eq('episode_slug', slug)
    .in('lang', ['es', 'en', 'fr', 'de', 'pl']);

  if (deleteError) {
    console.log(`  ❌ Error deleting old timecodes: ${deleteError.message}`);
    return;
  }

  // Insert Spanish timecodes
  console.log(`  💾 Saving Spanish timecodes...`);
  const esRecords = timecodes.map(tc => ({
    episode_slug: slug,
    lang: 'es',
    time: tc.time,
    title: tc.title
  }));

  const { error: esError } = await supabase
    .from('timecodes')
    .insert(esRecords);

  if (esError) {
    console.log(`  ❌ Error saving ES timecodes: ${esError.message}`);
    return;
  }

  // Translate and save for other languages
  const targetLangs = ['en', 'fr', 'de', 'pl'];
  
  for (const lang of targetLangs) {
    console.log(`  🌐 Translating to ${lang.toUpperCase()}...`);
    
    const translatedRecords = [];
    for (const tc of timecodes) {
      const translatedTitle = await translateTitle(tc.title, lang);
      translatedRecords.push({
        episode_slug: slug,
        lang: lang,
        time: tc.time,
        title: translatedTitle
      });
    }

    const { error: langError } = await supabase
      .from('timecodes')
      .insert(translatedRecords);

    if (langError) {
      console.log(`  ❌ Error saving ${lang.toUpperCase()} timecodes: ${langError.message}`);
    } else {
      console.log(`  ✅ Saved ${translatedRecords.length} ${lang.toUpperCase()} timecodes`);
    }
  }

  console.log(`  ✅ Episode ${slug} completed!`);
}

async function main() {
  console.log('=== Fixing Last 7 Episodes ===\n');
  console.log(`Episodes to fix: ${EPISODES_TO_FIX.join(', ')}`);

  for (const slug of EPISODES_TO_FIX) {
    await processEpisode(slug);
  }

  console.log('\n=== All episodes processed! ===');
}

main().catch(console.error);
