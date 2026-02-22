import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuestions() {
  // Get all English transcripts
  const { data: enTranscripts, error: transcriptsError } = await supabase
    .from('transcripts')
    .select('episode_slug')
    .eq('lang', 'en');

  if (transcriptsError) {
    console.error('Error fetching English transcripts:', transcriptsError);
    return;
  }

  // Get all English questions
  const { data: enQuestions, error: questionsError } = await supabase
    .from('timecodes')
    .select('episode_slug')
    .eq('lang', 'en');

  if (questionsError) {
    console.error('Error fetching English questions:', questionsError);
    return;
  }

  const transcriptSlugs = new Set(enTranscripts.map(t => t.episode_slug));
  const questionSlugs = new Set(enQuestions.map(q => q.episode_slug));

  const missingQuestions = [];
  transcriptSlugs.forEach(slug => {
    if (!questionSlugs.has(slug)) {
      missingQuestions.push(slug);
    }
  });

  console.log('=== English episodes without questions ===');
  if (missingQuestions.length > 0) {
    console.log(`Found ${missingQuestions.length} episodes:`);
    missingQuestions.forEach(slug => console.log(`- ${slug}`));
  } else {
    console.log('All English episodes have questions');
  }

  console.log('\n=== Number of questions per episode ===');
  const questionsCount = {};
  enQuestions.forEach(q => {
    questionsCount[q.episode_slug] = (questionsCount[q.episode_slug] || 0) + 1;
  });

  Object.entries(questionsCount).sort().forEach(([slug, count]) => {
    console.log(`${slug}: ${count} questions`);
  });
}

checkQuestions().catch(console.error);
