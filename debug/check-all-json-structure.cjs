const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.json'));

console.log('=== JSON File Structure Check ===\n');
console.log('Total JSON files:', files.length);
console.log('=================================\n');

for (const filename of files) {
  const filePath = path.join(audioDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  console.log(filename);
  console.log('----------------------------------');
  
  if (data.utterances && Array.isArray(data.utterances)) {
    console.log(`Utterances: ${data.utterances.length}`);
    if (data.utterances.length > 0) {
      console.log(`Sample utterance: ${JSON.stringify(data.utterances[0], null, 2)}`);
    }
  } else if (data.words && Array.isArray(data.words)) {
    console.log(`Words: ${data.words.length}`);
    console.log('⚠️ No utterances - has words array instead');
  }
  
  if (data.text) {
    console.log(`Text length: ${data.text.length}`);
  }
  
  if (data.language_code) {
    console.log(`Language: ${data.language_code}`);
  }
  
  console.log();
}

console.log('=== Summary ===');
const withUtterances = files.filter(filename => {
  const filePath = path.join(audioDir, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.utterances && Array.isArray(data.utterances) && data.utterances.length > 0;
});

const withWordsOnly = files.filter(filename => {
  const filePath = path.join(audioDir, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return !data.utterances || !Array.isArray(data.utterances) || data.utterances.length === 0;
});

console.log(`Files with utterances: ${withUtterances.length}`);
console.log(`Files with words only: ${withWordsOnly.length}`);
console.log(`Total: ${withUtterances.length + withWordsOnly.length}`);
