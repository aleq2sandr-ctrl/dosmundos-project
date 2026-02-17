/**
 * Script to delete the last N episodes from the database
 * along with all related data (transcripts, timecodes, episode_audios, transcript_chunks)
 * 
 * Usage: node scripts/delete-last-episodes.js [count]
 * Default count: 6
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EPISODES_TO_DELETE = parseInt(process.argv[2]) || 6;

async function findLatestEpisodes(count) {
  console.log(`\n🔍 Finding the ${count} most recent episodes...`);
  
  const { data, error } = await supabase
    .from('episodes')
    .select('slug, date, created_at')
    .order('date', { ascending: false })
    .limit(count);
  
  if (error) {
    console.error('❌ Error fetching episodes:', error);
    return null;
  }
  
  return data;
}

async function getRelatedDataStats(episodeSlugs) {
  console.log('\n📊 Counting related data...');
  
  const stats = {};
  
  // Count transcripts
  const { data: transcripts, error: trError } = await supabase
    .from('transcripts')
    .select('id, episode_slug, lang')
    .in('episode_slug', episodeSlugs);
  
  if (trError) {
    console.error('❌ Error counting transcripts:', trError);
  } else {
    stats.transcripts = transcripts?.length || 0;
    console.log(`   - Transcripts: ${stats.transcripts}`);
  }
  
  // Count timecodes (questions)
  const { data: timecodes, error: tcError } = await supabase
    .from('timecodes')
    .select('id, episode_slug, lang')
    .in('episode_slug', episodeSlugs);
  
  if (tcError) {
    console.error('❌ Error counting timecodes:', tcError);
  } else {
    stats.timecodes = timecodes?.length || 0;
    console.log(`   - Timecodes (questions): ${stats.timecodes}`);
  }
  
  // Count episode_audios
  const { data: audios, error: audError } = await supabase
    .from('episode_audios')
    .select('id, episode_slug, lang')
    .in('episode_slug', episodeSlugs);
  
  if (audError) {
    console.error('❌ Error counting episode_audios:', audError);
  } else {
    stats.episode_audios = audios?.length || 0;
    console.log(`   - Episode audios: ${stats.episode_audios}`);
  }
  
  // Count transcript_chunks
  const { data: chunks, error: chError } = await supabase
    .from('transcript_chunks')
    .select('id, episode_slug')
    .in('episode_slug', episodeSlugs);
  
  if (chError) {
    console.error('❌ Error counting transcript_chunks:', chError);
  } else {
    stats.transcript_chunks = chunks?.length || 0;
    console.log(`   - Transcript chunks: ${stats.transcript_chunks}`);
  }
  
  // Count transcript_chunks_summary
  const { data: chunksSummary, error: chSumError } = await supabase
    .from('transcript_chunks_summary')
    .select('episode_slug')
    .in('episode_slug', episodeSlugs);
  
  if (chSumError) {
    console.error('❌ Error counting transcript_chunks_summary:', chSumError);
  } else {
    stats.transcript_chunks_summary = chunksSummary?.length || 0;
    console.log(`   - Transcript chunks summary: ${stats.transcript_chunks_summary}`);
  }
  
  return stats;
}

async function deleteEpisodeData(episodeSlugs) {
  console.log('\n🗑️ Deleting related data...');
  
  // Delete transcript_chunks_summary first (has FK to episodes)
  console.log('   Deleting transcript_chunks_summary...');
  const { error: summaryError } = await supabase
    .from('transcript_chunks_summary')
    .delete()
    .in('episode_slug', episodeSlugs);
  
  if (summaryError) {
    console.error('   ❌ Error deleting transcript_chunks_summary:', summaryError);
  } else {
    console.log('   ✅ Deleted transcript_chunks_summary');
  }
  
  // Delete transcript_chunks
  console.log('   Deleting transcript_chunks...');
  const { error: chunksError } = await supabase
    .from('transcript_chunks')
    .delete()
    .in('episode_slug', episodeSlugs);
  
  if (chunksError) {
    console.error('   ❌ Error deleting transcript_chunks:', chunksError);
  } else {
    console.log('   ✅ Deleted transcript_chunks');
  }
  
  // Delete transcripts
  console.log('   Deleting transcripts...');
  const { error: trError } = await supabase
    .from('transcripts')
    .delete()
    .in('episode_slug', episodeSlugs);
  
  if (trError) {
    console.error('   ❌ Error deleting transcripts:', trError);
  } else {
    console.log('   ✅ Deleted transcripts');
  }
  
  // Delete timecodes (questions)
  console.log('   Deleting timecodes (questions)...');
  const { error: tcError } = await supabase
    .from('timecodes')
    .delete()
    .in('episode_slug', episodeSlugs);
  
  if (tcError) {
    console.error('   ❌ Error deleting timecodes:', tcError);
  } else {
    console.log('   ✅ Deleted timecodes');
  }
  
  // Delete episode_audios
  console.log('   Deleting episode_audios...');
  const { error: audError } = await supabase
    .from('episode_audios')
    .delete()
    .in('episode_slug', episodeSlugs);
  
  if (audError) {
    console.error('   ❌ Error deleting episode_audios:', audError);
  } else {
    console.log('   ✅ Deleted episode_audios');
  }
  
  // Finally delete episodes
  console.log('   Deleting episodes...');
  const { error: epError } = await supabase
    .from('episodes')
    .delete()
    .in('slug', episodeSlugs);
  
  if (epError) {
    console.error('   ❌ Error deleting episodes:', epError);
    return false;
  } else {
    console.log('   ✅ Deleted episodes');
  }
  
  return true;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DELETE LAST EPISODES SCRIPT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Episodes to delete: ${EPISODES_TO_DELETE}`);
  
  // Step 1: Find the latest episodes
  const episodes = await findLatestEpisodes(EPISODES_TO_DELETE);
  
  if (!episodes || episodes.length === 0) {
    console.log('❌ No episodes found');
    process.exit(1);
  }
  
  console.log('\n📋 Episodes to be deleted:');
  console.log('─'.repeat(60));
  episodes.forEach((ep, i) => {
    console.log(`   ${i + 1}. ${ep.slug}`);
    console.log(`      Date: ${ep.date}`);
    console.log(`      Created: ${ep.created_at}`);
  });
  console.log('─'.repeat(60));
  
  const episodeSlugs = episodes.map(ep => ep.slug);
  
  // Step 2: Get related data stats
  const stats = await getRelatedDataStats(episodeSlugs);
  
  // Step 3: Ask for confirmation
  console.log('\n⚠️  WARNING: This will permanently delete the above episodes');
  console.log('    and all their related data (transcripts, questions, audios, etc.)');
  console.log('\n    To confirm deletion, run the script with --confirm flag:');
  console.log(`    node scripts/delete-last-episodes.js ${EPISODES_TO_DELETE} --confirm`);
  
  // Check for confirmation flag
  if (process.argv.includes('--confirm')) {
    console.log('\n🔒 Confirmation received. Proceeding with deletion...');
    
    const success = await deleteEpisodeData(episodeSlugs);
    
    if (success) {
      console.log('\n✅ Successfully deleted all data!');
    } else {
      console.log('\n❌ Deletion completed with errors. Check the logs above.');
      process.exit(1);
    }
  } else {
    console.log('\n⏸️  Dry run complete. No data was deleted.');
    console.log('    Run with --confirm to actually delete the data.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
