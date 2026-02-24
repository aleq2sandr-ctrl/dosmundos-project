import { loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env variables
const env = loadEnv('production', __dirname, 'VITE_');

console.log('Loaded Vite environment variables:');
console.log(env);

console.log('\nVITE_DEEPSEEK_API_KEY value:');
console.log(env.VITE_DEEPSEEK_API_KEY);
