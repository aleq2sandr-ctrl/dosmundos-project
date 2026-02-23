const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY;
const DIRECTORY_PATH = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';
const CHUNK_DURATION_MS = 10 * 60 * 1000; // 10 minutes per chunk

if (!DEEPSEEK_API_KEY) {
  console.error('❌ DeepSeek API key missing in .env');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const TERMINOLOGY = [
  "Аяваска", "Дос Мундос", "Чирик Сананго", "Ахо Сача", "Камалонга", 
  "Мукура", "Охэ", "Яхэ", "Сарса", "Тоэ", "Учу Сананго", "Мальва", 
  "Хлоруру", "Алоэ", "Мурурэ", "Кумасеба", "Унья де гато", "Чакруна", 
  "Рапэ", "Сан Педро", "Горячие обливания", "Гуаюса", "Манчинга", 
  "Табак", "Чучуваси", "Комасеба", "Пиньон", "Гуаява", "Пепе"
];

async function processChunk(chunkIndex, assemblyChunk, deepgramChunk) {
    console.log(`   Processing chunk ${chunkIndex + 1} (${assemblyChunk.length} A-segments, ${deepgramChunk.length} D-segments)...`);
    
    if (assemblyChunk.length === 0 && deepgramChunk.length === 0) return [];

    const formatUtterances = (utterances) => {
        return utterances.map(u => {
            return `[${u.start}-${u.end}] ${u.speaker}: ${u.text}`;
        }).join('\n');
    };

    const assemblyText = formatUtterances(assemblyChunk);
    const deepgramText = formatUtterances(deepgramChunk);

    const systemPrompt = `You are an expert audio transcript editor. You are processing a 10-minute chunk of a podcast.
You have two versions of the transcript:
1. ASSEMBLY_AI (Priority source).
2. DEEPGRAM (Secondary source for correction).

Your task is to merge them into a single high-quality transcript JSON for this chunk.

Rules:
1. **Timeline & Structure**: Base the segmentation (start/end times) primarily on ASSEMBLY_AI.
2. **Content Quality**: 
   - Use ASSEMBLY_AI text as the base.
   - Cross-reference with DEEPGRAM to fix misheard words, phonetic errors, or "garbage" output.
   - **CRITICAL**: Remove AI hallucinations (loops, random characters, "Thank you for watching", etc.).
3. **Terminology**: Ensure these terms are spelled EXACTLY: ${TERMINOLOGY.join(', ')}.
4. **Output**: Return ONLY valid JSON. No markdown.
   
JSON Structure:
{
  "utterances": [
    { "start": 1234, "end": 5678, "speaker": "0", "text": "Corrected text..." }
  ]
}`;

    const userPrompt = `ASSEMBLY_AI_CHUNK:\n${assemblyText}\n\nDEEPGRAM_CHUNK:\n${deepgramText}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.1,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        });

        const content = completion.choices[0].message.content;
        const parsed = JSON.parse(content);
        return parsed.utterances || [];
    } catch (error) {
        console.error(`   ❌ Error in chunk ${chunkIndex + 1}:`, error.message);
        // Fallback: return AssemblyAI chunk if AI fails
        return assemblyChunk;
    }
}

async function mergeTranscripts(assemblyFile, deepgramFile, outputFile) {
  console.log(`🔄 Merging:\n  A: ${path.basename(assemblyFile)}\n  D: ${path.basename(deepgramFile)}`);

  let assemblyData, deepgramData;
  try {
    assemblyData = JSON.parse(fs.readFileSync(assemblyFile, 'utf8'));
    deepgramData = JSON.parse(fs.readFileSync(deepgramFile, 'utf8'));
  } catch (e) {
    console.error('❌ Error reading files:', e.message);
    return;
  }

  const assemblyUtterances = assemblyData.utterances || [];
  const deepgramUtterances = deepgramData.utterances || [];

  // Determine total duration
  const lastA = assemblyUtterances[assemblyUtterances.length - 1]?.end || 0;
  const lastD = deepgramUtterances[deepgramUtterances.length - 1]?.end || 0;
  const maxDuration = Math.max(lastA, lastD);

  let mergedUtterances = [];

  for (let time = 0; time < maxDuration; time += CHUNK_DURATION_MS) {
      const chunkEnd = time + CHUNK_DURATION_MS;
      
      const aChunk = assemblyUtterances.filter(u => u.start >= time && u.start < chunkEnd);
      const dChunk = deepgramUtterances.filter(u => u.start >= time && u.start < chunkEnd);

      if (aChunk.length === 0 && dChunk.length === 0) continue;

      const resultChunk = await processChunk(time / CHUNK_DURATION_MS, aChunk, dChunk);
      mergedUtterances = mergedUtterances.concat(resultChunk);
  }

  // Sort merged utterances by start time just in case
  mergedUtterances.sort((a, b) => a.start - b.start);

  const outputData = {
      utterances: mergedUtterances
  };

  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`✅ Saved merged file: ${path.basename(outputFile)} (${mergedUtterances.length} segments)`);
}

async function main() {
    // 1. Find all RU AssemblyAI edit files
    const files = fs.readdirSync(DIRECTORY_PATH);
    const assemblyFiles = files.filter(f => f.endsWith('_RU_assemblyai_edit.json'));

    // 2. Sort by date (descending)
    assemblyFiles.sort((a, b) => {
        const dateA = a.split('_')[0];
        const dateB = b.split('_')[0];
        return dateB.localeCompare(dateA);
    });

    // 3. Take last 5 (which are the newest 5 because we sorted descending)
    const filesToProcess = assemblyFiles.slice(0, 5);

    console.log(`Found ${assemblyFiles.length} files. Processing top 5 newest:`);
    filesToProcess.forEach(f => console.log(` - ${f}`));

    for (const aFile of filesToProcess) {
        const datePrefix = aFile.split('_')[0];
        const dFile = `${datePrefix}_RU_deepgram_edit.json`;
        const oFile = `${datePrefix}_RU_merge.json`;

        const aPath = path.join(DIRECTORY_PATH, aFile);
        const dPath = path.join(DIRECTORY_PATH, dFile);
        const oPath = path.join(DIRECTORY_PATH, oFile);

        if (fs.existsSync(dPath)) {
            await mergeTranscripts(aPath, dPath, oPath);
        } else {
            console.warn(`⚠️ Deepgram file not found for ${datePrefix}, skipping.`);
        }
    }
}

main();
