const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const DEEPSEEK_API_KEY = process.env.VITE_DEEPSEEK_API_KEY;
const DIRECTORY_PATH = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';

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

  // Limit context if necessary. For now, let's try to send a reasonable chunk.
  // If episodes are long, we might need to split. 
  // Let's assume we process the first ~2000 segments of AssemblyAI and corresponding time range of Deepgram.
  // But for best results, we should try to process the whole thing if it fits.
  // DeepSeek V3 has 64k context. 
  // 1 hour of audio ~ 600-800 utterances? Or more?
  // Let's check the length of utterances.
  
  console.log(`  AssemblyAI segments: ${assemblyUtterances.length}`);
  console.log(`  Deepgram segments: ${deepgramUtterances.length}`);

  // Prepare the prompt content
  // We will format it as:
  // ASSEMBLY_AI:
  // [start-end] Speaker: Text
  // ...
  // DEEPGRAM:
  // [start-end] Speaker: Text
  // ...

  const formatUtterances = (utterances) => {
    return utterances.map(u => {
        // Round to seconds for brevity in prompt, but keep ms in mind
        const s = Math.floor(u.start / 1000);
        const e = Math.floor(u.end / 1000);
        return `[${u.start}-${u.end}] ${u.speaker}: ${u.text}`;
    }).join('\n');
  };

  const assemblyText = formatUtterances(assemblyUtterances);
  const deepgramText = formatUtterances(deepgramUtterances);

  const systemPrompt = `You are an expert audio transcript editor. You have two versions of the same podcast episode transcript:
1. ASSEMBLY_AI (Priority source).
2. DEEPGRAM (Secondary source for correction).

Your task is to merge them into a single high-quality transcript JSON.

Rules:
1. **Timeline & Structure**: Base the segmentation (start/end times) primarily on ASSEMBLY_AI, unless it is clearly hallucinating or missing large chunks found in DEEPGRAM.
2. **Content Quality**: 
   - Use ASSEMBLY_AI text as the base.
   - Cross-reference with DEEPGRAM to fix misheard words, phonetic errors, or "garbage" output.
   - **CRITICAL**: Remove AI hallucinations (e.g., repetitive loops, random characters, text that doesn't make sense in context, or "Thank you for watching" type subtitles if they aren't in the audio).
3. **Terminology**: Ensure the following terms are spelled EXACTLY as listed (correcting slang/misrecognition):
   ${TERMINOLOGY.join(', ')}
4. **Output Format**: Return ONLY valid JSON containing the 'utterances' array. Do not include markdown formatting like \`\`\`json.
   
JSON Structure:
{
  "utterances": [
    { "start": 1234, "end": 5678, "speaker": "0", "text": "Corrected text..." },
    ...
  ]
}
`;

  const userPrompt = `Here are the transcripts:

=== ASSEMBLY_AI ===
${assemblyText}

=== DEEPGRAM ===
${deepgramText}

Please generate the merged JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat', // V3
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for consistent editing
      max_tokens: 8000, // Output limit
      stream: false
    });

    let content = completion.choices[0].message.content;
    
    // Clean up markdown if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    // Validate JSON
    JSON.parse(content);

    fs.writeFileSync(outputFile, content);
    console.log(`✅ Saved merged transcript to: ${path.basename(outputFile)}`);

  } catch (error) {
    console.error('❌ Error calling DeepSeek or parsing result:', error);
    if (error.response) {
        console.error('Response data:', error.response.data);
    }
  }
}

async function main() {
  const files = fs.readdirSync(DIRECTORY_PATH);
  
  // Find all RU AssemblyAI edit files
  const assemblyFiles = files.filter(f => f.endsWith('_RU_assemblyai_edit.json'));

  for (const aFile of assemblyFiles) {
    // Construct corresponding Deepgram filename
    // Format: YYYY-MM-DD_RU_assemblyai_edit.json -> YYYY-MM-DD_RU_deepgram_edit.json
    const dFile = aFile.replace('_assemblyai_edit.json', '_deepgram_edit.json');
    
    if (files.includes(dFile)) {
      const assemblyPath = path.join(DIRECTORY_PATH, aFile);
      const deepgramPath = path.join(DIRECTORY_PATH, dFile);
      const outputPath = path.join(DIRECTORY_PATH, aFile.replace('_assemblyai_edit.json', '_merge.json'));

      // Check if merge file already exists to avoid re-processing (optional, but good for saving credits)
      if (fs.existsSync(outputPath)) {
          console.log(`⏭️  Skipping ${aFile}, merge file already exists.`);
          continue;
      }

      await mergeTranscripts(assemblyPath, deepgramPath, outputPath);
      
      // Add a small delay to avoid rate limits if processing many
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
        console.log(`⚠️  No matching Deepgram file for ${aFile}`);
    }
  }
}

main();
