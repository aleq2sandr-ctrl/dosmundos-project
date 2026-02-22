const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';
const filename = '2026-01-28_RU.json';
const filePath = path.join(audioDir, filename);

console.log('Reading file:', filePath);

try {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File read successfully');
  console.log('Content length:', content.length);
  
  // Check first 1000 characters
  console.log('\nFirst 1000 characters:');
  console.log(content.substring(0, 1000));
  
  const data = JSON.parse(content);
  console.log('\n=== File Info ===');
  console.log(`Language: ${data.language_code}`);
  
  if (data.words && Array.isArray(data.words)) {
    console.log(`Words count: ${data.words.length}`);
    
    const minTime = Math.min(...data.words.map(w => w.start)) / 1000;
    const maxTime = Math.max(...data.words.map(w => w.end)) / 1000;
    
    console.log(`\n=== Time Range ===`);
    console.log(`From: ${Math.floor(minTime / 60)}:${(minTime % 60).toFixed(0).padStart(2, '0')}`);
    console.log(`To: ${Math.floor(maxTime / 60)}:${(maxTime % 60).toFixed(0).padStart(2, '0')}`);
    console.log(`Duration: ${Math.floor((maxTime - minTime) / 60)}:${((maxTime - minTime) % 60).toFixed(0).padStart(2, '0')}`);
  }
  
  if (data.utterances && Array.isArray(data.utterances)) {
    console.log(`\n=== Utterances ===`);
    console.log(`Count: ${data.utterances.length}`);
    
    const minTime = Math.min(...data.utterances.map(u => u.start)) / 1000;
    const maxTime = Math.max(...data.utterances.map(u => u.end)) / 1000;
    
    console.log(`From: ${Math.floor(minTime / 60)}:${(minTime % 60).toFixed(0).padStart(2, '0')}`);
    console.log(`To: ${Math.floor(maxTime / 60)}:${(maxTime % 60).toFixed(0).padStart(2, '0')}`);
  }
  
} catch (error) {
  console.error('Error:', error);
}
