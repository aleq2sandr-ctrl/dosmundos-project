const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials missing in .env');
  process.exit(1);
}

if (!DEEPSEEK_API_KEY) {
  console.error('❌ DeepSeek API key missing in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

async function generateQuestions(transcriptData, episodeLang) {
  console.log(`🤖 Generating questions for lang: ${episodeLang}`);

  // Prepare text
  const utterances = transcriptData.utterances || [];
  let textToAnalyze = '';

  // DeepSeek V3 has a large context window (64k tokens). 
  // We can send a significant amount of text.
  // Assuming avg 20 tokens per utterance, 2500 utterances is ~50k tokens.
  const MAX_UTTERANCES = 2500;
  
  const segmentsToAnalyze = utterances.slice(0, MAX_UTTERANCES);
  
  textToAnalyze = segmentsToAnalyze.map((utterance) => {
    const timeInSeconds = Math.floor(utterance.start / 1000);
    const speakerInfo = utterance.speaker ? `[${utterance.speaker}]` : '';
    const text = utterance.text || '';
    return `[${timeInSeconds}s]${speakerInfo} ${text}`;
  }).join('\n');

  console.log(`📝 Analyzing ${segmentsToAnalyze.length} segments (${textToAnalyze.length} chars)`);

  const langMap = {
    'ru': { name: 'русском', prompt: 'russian' },
    'es': { name: 'испанском', prompt: 'spanish' },
    'en': { name: 'английском', prompt: 'english' }
  };
  const langConfig = langMap[episodeLang] || langMap['en'];

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
- MEDITATIONS: Look for when the healer starts guided meditations at the end of Q&A sessions
- Look for meditation phrases like "давайте медитировать", "закройте глаза", "let's meditate", "close your eyes", "deep breathing"

For each identified question/topic/meditation:
1. Find the EXACT moment when this question/topic/meditation FIRST appears in the conversation
2. Look for the ORIGINAL question from the listener (not the translation)
3. Create a concise title (3-8 words) that captures the essence of the question/topic/meditation
4. For MEDITATIONS: Create titles like "Guided Meditation", "Relaxation Exercise", "Breathing Practice", etc.
5. CRITICAL: Extract the time from the [time] markers in the transcript (e.g., [125s] means 125 seconds)
6. Use the timestamp from the very first utterance where this topic/question/meditation begins

Return ONLY a valid JSON array in this format:
[
  {
    "title": "Краткий заголовок вопроса/медитации на ${langConfig.name} языке",
    "time": точное_время_в_секундах_из_первого_сегмента_темы
  }
]

Guidelines:
- Extract as many important questions/topics/MEDITATIONS as possible (aim for 10-30+ for longer podcasts)
- Focus on genuine questions about health, relationships, personal growth, etc.
- INCLUDE MEDITATIONS: Look for guided meditations, relaxation exercises, breathing practices
- PRIORITY: Identify questions from different listeners (different speakers)
- Pay attention to speaker changes - new speaker = potentially new question
- Ignore meta-discussion about the podcast itself and technical issues
- Ignore translations - focus on original questions from listeners and original meditations
- TIME CRITICAL: Extract time from [time] markers (e.g., [125s] = 125 seconds)
- Time should be from the FIRST utterance of each question/topic/meditation (usually when the listener starts speaking or healer starts meditation)
- If you can't find exact timing markers, estimate based on text position
- Ensure titles are concise but descriptive
- Return only the JSON array, no additional text`;

  const userPrompt = `Проанализируй этот текст подкаста с целителем и найди ключевые вопросы и темы:

${textToAnalyze}

ВНИМАНИЕ: Текст содержит временные метки в формате [время] и метки спикеров [A], [B] и т.д.

В подкасте участвуют несколько слушателей и переводчик. Ищи:

1. Новые вопросы от разных слушателей (разные метки спикеров [A], [B], [C]...)
2. Когда новый слушатель начинает говорить о своей проблеме
3. Переходы к новым темам в ответах целителя
4. МЕДИТАЦИИ: Когда целитель начинает проводить медитации
5. Ищи фразы: "вопрос от", "следующий вопрос", "очередной слушатель", "давайте медитировать", "закройте глаза"
6. ОСОБОЕ ВНИМАНИЕ: медитации часто находятся В КОНЦЕ ПОДКАСТА после вопросов и ответов
7. ИГНОРИРУЙ переводы - фокусируйся на оригинальных вопросах слушателей и оригинальных медитациях

ВАЖНО: ИЩИ МАКСИМАЛЬНОЕ КОЛИЧЕСТВО ВОПРОСОВ И МЕДИТАЦИЙ - не ограничивайся 5-10, старайся найти все значимые вопросы и медитационные сессии в подкасте.

КРИТИЧНО: Для каждой найденной темы укажи ВРЕМЯ из временной метки [время] в самом начале сегмента оригинального вопроса слушателя. Например, если видишь [125s][A] текст вопроса, то время = 125.

Пример правильного ответа:
- Вопрос от слушателя A: "[125s][A] У меня болит голова..."
- Время для этого вопроса: 125 секунд
- Медитация: "[1800s] Давайте закроем глаза и начнем медитацию..."
- Время для медитации: 1800 секунд`;

  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const response = completion.choices[0].message.content.trim();
  
  // Parse JSON
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  const jsonText = jsonMatch ? jsonMatch[0] : response;
  let questions = JSON.parse(jsonText);

  // Validate and fix
  questions = questions.filter(q => {
    return q && typeof q === 'object' && typeof q.title === 'string' && q.title.trim().length > 0;
  }).map(q => {
    let time = 0;
    const title = q.title.trim();
    const timeMatch = title.match(/\[(\d+)s?\]/);
    
    if (timeMatch) {
      time = parseInt(timeMatch[1]);
    } else if (typeof q.time === 'number' && !isNaN(q.time)) {
      time = Math.max(0, Number(q.time));
    } else if (typeof q.time === 'string' && !isNaN(Number(q.time))) {
      time = Math.max(0, Number(q.time));
    } else {
      // Fallback search strategies
      const questionText = title.toLowerCase();
      let matchingUtterance = utterances.find(u => {
        const utteranceText = (u.text || '').toLowerCase();
        return utteranceText.includes(questionText.substring(0, 15)) ||
               questionText.includes(utteranceText.substring(0, 15));
      });

      if (!matchingUtterance) {
        const questionWords = questionText.split(' ').filter(word => word.length > 3).slice(0, 3);
        matchingUtterance = utterances.find(u => {
          const utteranceText = (u.text || '').toLowerCase();
          return questionWords.some(word => utteranceText.includes(word));
        });
      }

      if (matchingUtterance) {
        time = Math.floor(matchingUtterance.start / 1000);
      }
    }

    return {
      title: title.replace(/\[\d+s?\]/g, '').trim(),
      time: Math.max(0, time)
    };
  });

  return questions;
}

async function main() {
  try {
    console.log('🚀 Starting question generation script...');
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('Supabase Key length:', SUPABASE_KEY ? SUPABASE_KEY.length : 0);
    console.log('DeepSeek Key length:', DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.length : 0);

    // 1. Get all RU transcripts (slugs only first)
    console.log('Fetching transcript slugs from Supabase...');
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('episode_slug')
      .eq('lang', 'ru')
      .not('edited_transcript_data', 'is', null);

    if (transcriptsError) throw transcriptsError;
    console.log(`📚 Found ${transcripts.length} RU transcripts`);

    // 2. Get existing questions to filter out
    const { data: existingQuestions, error: questionsError } = await supabase
      .from('timecodes')
      .select('episode_slug')
      .eq('lang', 'ru');

    if (questionsError) throw questionsError;
    
    const episodesWithQuestions = new Set(existingQuestions.map(q => q.episode_slug));
    
    // 3. Filter episodes that need questions
    const episodesToProcess = transcripts.filter(t => !episodesWithQuestions.has(t.episode_slug));
    console.log(`🎯 Found ${episodesToProcess.length} episodes needing questions`);

    // 4. Process each episode
    for (const [index, episode] of episodesToProcess.entries()) {
      console.log(`\n[${index + 1}/${episodesToProcess.length}] Processing episode: ${episode.episode_slug}`);
      
      try {
        // Fetch transcript data for this episode
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('transcripts')
          .select('edited_transcript_data')
          .eq('episode_slug', episode.episode_slug)
          .eq('lang', 'ru')
          .single();
        
        if (transcriptError) throw transcriptError;
        if (!transcriptData || !transcriptData.edited_transcript_data) {
            console.log('⚠️ No transcript data found, skipping');
            continue;
        }

        const questions = await generateQuestions(transcriptData.edited_transcript_data, 'ru');
        console.log(`✅ Generated ${questions.length} questions`);

        // Save to DB
        const questionsToInsert = questions.map(q => ({
          episode_slug: episode.episode_slug,
          lang: 'ru',
          title: q.title,
          time: q.time
        }));

        const { error: insertError } = await supabase
          .from('timecodes')
          .insert(questionsToInsert);

        if (insertError) {
          console.error(`❌ Error saving questions for ${episode.episode_slug}:`, insertError);
        } else {
          console.log(`💾 Saved questions to DB`);
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        console.error(`❌ Failed to process episode ${episode.episode_slug}:`, err.message);
      }
    }

    console.log('\n✨ Script completed!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

main();
