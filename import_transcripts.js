import fs from 'fs';
import path from 'path';
import { saveTranscriptInChunks } from './src/lib/transcriptChunkingService.js';

const workspaceDir = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';

async function importTranscripts() {
  try {
    // Get all *_ES_assemblyai_edit.json files
    const files = fs.readdirSync(workspaceDir)
      .filter(file => file.endsWith('_ES_assemblyai_edit.json'));

    console.log(`Found ${files.length} files to import`);

    for (const file of files) {
      const filePath = path.join(workspaceDir, file);
      console.log(`Processing ${file}...`);

      // Read and parse JSON
      const transcriptData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Extract episode slug from filename (e.g., 2019-06-26 from 2019-06-26_ES_assemblyai_edit.json)
      const slug = file.replace('_ES_assemblyai_edit.json', '');

      // Save to database
      await saveTranscriptInChunks(slug, 'es', transcriptData);

      console.log(`Imported ${slug}`);
    }

    console.log('All imports completed!');
  } catch (error) {
    console.error('Error importing transcripts:', error);
  }
}

importTranscripts();