import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../../DosMundos/Book/Медитации');
const targetDir = path.resolve(__dirname, '../../DosMundos/Book/NotebookLM_Sources');

// Configuration
// Total words: ~2,075,642. Limit per source: ~500,000 words.
// We need at least 5 files.
// Total files: 2789. 2789 / 5 = ~558 files.
const FILES_PER_CHUNK = 600; 

console.log(`Source Directory: ${sourceDir}`);
console.log(`Target Directory: ${targetDir}`);

if (!fs.existsSync(sourceDir)) {
    console.error('Source directory does not exist!');
    process.exit(1);
}

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Get all .txt files
const files = fs.readdirSync(sourceDir)
    .filter(file => file.endsWith('.txt'))
    .sort(); // Sort alphabetically (which is chronological due to YYYY-MM-DD prefix)

console.log(`Found ${files.length} files.`);

let currentChunkIndex = 1;
let currentFileCount = 0;
let currentContent = '';

for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(sourceDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract date from filename for metadata
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : 'Unknown Date';

    // Add header for each section
    currentContent += `\n\n================================================================\n`;
    currentContent += `File: ${filename}\n`;
    currentContent += `Date: ${date}\n`;
    currentContent += `================================================================\n\n`;
    currentContent += content;
    currentContent += `\n`;

    currentFileCount++;

    // If we reached the limit or it's the last file, write the chunk
    if (currentFileCount >= FILES_PER_CHUNK || i === files.length - 1) {
        const outputFilename = `Meditations_Batch_${String(currentChunkIndex).padStart(2, '0')}_(${files[i - currentFileCount + 1].split('_')[0]}_to_${date}).txt`;
        const outputPath = path.join(targetDir, outputFilename);
        
        fs.writeFileSync(outputPath, currentContent, 'utf-8');
        console.log(`Created ${outputFilename} with ${currentFileCount} entries.`);

        // Reset for next chunk
        currentChunkIndex++;
        currentFileCount = 0;
        currentContent = '';
    }
}

console.log('Done!');
