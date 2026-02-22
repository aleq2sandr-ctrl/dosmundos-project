import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
console.log('URL:', url);
console.log('KEY exists:', !!key, key ? key.substring(0,20)+'...' : 'NONE');

const sb = createClient(url, key);
const r = await sb.from('transcripts').select('title').eq('episode_slug','2026-02-18').eq('lang','ru').single();
console.log('Result:', JSON.stringify(r));
process.exit(0);
