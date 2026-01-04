import 'dotenv/config';

(async () => {
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'not set');
  console.log('SERVICE_ROLE_KEY:', process.env.SERVICE_ROLE_KEY ? 'set' : 'not set');

  try {
    const saveTranscript = await import('./api/save-transcript.js');
    console.log('Import successful');
  } catch (e) {
    console.error('Import failed:', e.message);
    console.error('Stack:', e.stack);
  }
})();
