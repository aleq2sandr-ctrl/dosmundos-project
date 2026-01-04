# Database Data Loading Fix

## Problem Description

The application was experiencing incomplete data loading from the database. The issue was caused by missing database tables that the application code was trying to query.

## Root Cause

The application code in `src/lib/transcriptChunkingService.js` and `src/pages/PlayerPage.jsx` was attempting to query tables that didn't exist in the database schema:

- `transcript_chunks` - Used for storing chunked transcript data
- `transcript_chunks_summary` - Used for quick metadata access

When the application tried to load transcripts, it would fail silently or return incomplete data because these tables were missing.

## Solution

### 1. Database Schema Fix

Created the missing database tables by running the migration script:

```sql
-- Run this in Supabase SQL editor or via supabase db push
-- File: scripts/create_transcript_chunks_tables.sql
```

The migration creates:

- **transcript_chunks** table for storing chunked transcript data
- **transcript_chunks_summary** table for quick metadata access
- Proper indexes for performance
- RLS (Row Level Security) policies
- Foreign key constraints

### 2. Code Improvements

Enhanced the transcript reconstruction logic in `src/lib/transcriptChunkingService.js`:

- Added better error handling and logging
- Improved chunk type filtering (utterances, edited_transcript, transcript)
- Added null checks for chunk data
- Better fallback logic when different chunk types are available
- More detailed logging for debugging

## Files Modified

1. **database/create_transcript_chunks_tables.sql** - New migration file
2. **scripts/create_transcript_chunks_tables.sql** - Duplicate for easy access
3. **src/lib/transcriptChunkingService.js** - Enhanced reconstruction logic
4. **src/pages/PlayerPage.jsx** - Verified table references (already correct)

## How to Apply the Fix

### Step 1: Run Database Migration

Execute the SQL migration in your Supabase SQL editor:

```sql
-- Copy and paste the content from scripts/create_transcript_chunks_tables.sql
-- into your Supabase SQL editor and run it
```

Or use the Supabase CLI:

```bash
supabase db push
```

### Step 2: Verify Tables

Check that the tables were created successfully:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transcript_chunks', 'transcript_chunks_summary');
```

### Step 3: Test Data Loading

1. Navigate to the Player page for any episode
2. Verify that transcripts load completely
3. Check that questions/timecodes load properly
4. Monitor browser console for any errors

## Expected Results

After applying this fix:

- ✅ Transcripts should load completely from the database
- ✅ Questions/timecodes should load properly
- ✅ No more silent failures when loading episode data
- ✅ Better error messages if issues persist
- ✅ Improved performance with proper database indexes

## Troubleshooting

### If data still doesn't load:

1. **Check database connection**: Verify Supabase credentials in `.env`
2. **Check table permissions**: Ensure RLS policies are correctly applied
3. **Check console logs**: Look for specific error messages
4. **Verify data exists**: Check if transcripts exist in the `transcripts` table

### Common Issues:

- **Missing RLS policies**: Tables created but no permissions granted
- **Incorrect table names**: Code referencing wrong table names
- **Network issues**: Supabase connection problems
- **Data corruption**: Existing data in wrong format

## Technical Details

### Table Structure

**transcript_chunks**:
- `id`: UUID primary key
- `episode_slug`: Episode identifier
- `lang`: Language code
- `chunk_type`: Type of chunk (utterances, edited_transcript, etc.)
- `chunk_index`: Order of chunk
- `chunk_data`: JSONB containing the actual data
- `created_at`, `updated_at`: Timestamps

**transcript_chunks_summary**:
- `episode_slug`, `lang`: Composite primary key
- Various counters for different chunk types
- `chunk_size`: Size of chunks
- `chunked_at`: When chunking was performed

### Chunk Types

- `utterances`: Raw utterance data
- `edited_transcript`: User-edited transcript data
- `transcript`: Original transcript data
- `text`: Text-only chunks (currently disabled for space optimization)

## Performance Considerations

- Added proper indexes on frequently queried columns
- Chunk size limited to 30KB to prevent oversized records
- Maximum 100 chunks per transcript to prevent runaway growth
- Efficient sorting and filtering in reconstruction logic

## Future Improvements

1. **Automatic migration**: Add this to the main schema migration process
2. **Data migration**: Migrate existing large transcripts to chunked format
3. **Monitoring**: Add metrics for chunk loading performance
4. **Cleanup**: Add periodic cleanup of old chunk data
