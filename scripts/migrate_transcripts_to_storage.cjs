/**
 * Data migration: Upload existing transcript_data to Supabase storage 'transcript' bucket
 * Set storage_url in transcripts table.
 * Run: node scripts/migrate_transcripts_to_storage.cjs
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrate() {
  console.log('Fetching transcripts without storage_url...');
  
  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('*')
    .is('storage_url', null);

  if (error) {
    console.error('Fetch error:', error);
    process.exit(1);
  }

  console.log(`Found ${transcripts.length} transcripts to migrate.`);

  let successCount = 0;
  let failCount = 0;

  for (const transcript of transcripts) {
    if (transcript.transcript_data) {
      try {
        const fileName = `${transcript.episode_slug}-${transcript.lang}-raw.json`;
        const rawJson = JSON.stringify(transcript.transcript_data);

        // Upload raw data
        const { error: uploadError } = await supabase.storage
          .from('transcript')
          .upload(fileName, rawJson, {
            contentType: 'application/json',
            upsert: true
          });

        if (uploadError) {
          console.error(`Upload failed for ${transcript.episode_slug}-${transcript.lang}:`, uploadError.message);
          failCount++;
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('transcript')
          .getPublicUrl(fileName);

        // Update table
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({ storage_url: publicUrl })
          .eq('id', transcript.id);

        if (updateError) {
          console.error(`Update failed for ${transcript.id}:`, updateError.message);
          failCount++;
        } else {
          console.log(`✅ Migrated ${transcript.episode_slug}-${transcript.lang} -> ${publicUrl}`);
          successCount++;
        }
      } catch (err) {
        console.error(`Error processing ${transcript.episode_slug}-${transcript.lang}:`, err.message);
        failCount++;
      }
    } else {
      console.log(`⏭️  Skipped ${transcript.episode_slug}-${transcript.lang} (no transcript_data)`);
    }
  }

  console.log(`\nMigration complete: ${successCount} success, ${failCount} failed.`);
}

migrate().catch(console.error);
