import { supabase } from './src/lib/supabaseServerClient.js';

async function inspect() {
  console.log('Checking for "questions" table...');
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .limit(1);

  if (qError) {
    console.log('Error querying "questions":', qError.message);
  } else {
    console.log('"questions" table exists. Sample:', questions);
  }

  console.log('Checking "episodes" table...');
  const { data: episodes, error: eError } = await supabase
    .from('episodes')
    .select('*')
    .limit(1);

  if (eError) {
    console.log('Error querying "episodes":', eError.message);
  } else {
    console.log('"episodes" table exists. Keys:', episodes && episodes[0] ? Object.keys(episodes[0]) : 'empty');
  }
}

inspect();