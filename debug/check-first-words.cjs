const fs = require('fs');
const path = require('path');

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

const episodes = [
  '2025-12-10',
  '2025-12-24',
  '2025-12-31',
  '2026-01-28',
  '2026-02-04',
  '2026-02-11'
];

console.log('Checking first 3 utterances of each episode:\n');

episodes.forEach(episode => {
  const esFile = path.join(audioDir, `${episode}_ES.json`);
  const ruFile = path.join(audioDir, `${episode}_RU.json`);
  
  ['ES', 'RU'].forEach(lang => {
    const filePath = lang === 'ES' ? esFile : ruFile;
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${episode}_${lang} not found`);
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      let utterances;
      if (data.utterances && data.utterances.length > 0) {
        utterances = data.utterances;
      } else if (data.words && data.words.length > 0) {
        // Сделаем простую конвертацию для проверки
        utterances = [];
        let current = null;
        data.words.forEach(word => {
          if (!current || word.speaker !== current.speaker) {
            if (current) utterances.push(current);
            current = {
              id: utterances.length,
              text: word.text,
              start: word.start,
              end: word.end,
              speaker: word.speaker || 'A'
            };
          } else {
            current.text += ' ' + word.text;
            current.end = word.end;
          }
        });
        if (current) utterances.push(current);
      }
      
      if (utterances && utterances.length > 0) {
        console.log(`=== ${episode}_${lang} ===`);
        for (let i = 0; i < Math.min(3, utterances.length); i++) {
          const u = utterances[i];
          const duration = u.end - u.start;
          console.log(`  ${i+1}: "${u.text}" (${duration}ms, speaker: ${u.speaker})`);
        }
        
        // Проверка на слишком короткие utterances
        const shortUtterances = utterances.filter(u => (u.end - u.start) < 1000 && u.text.trim().split(' ').length === 1);
        if (shortUtterances.length > 0) {
          console.log(`⚠️  Found ${shortUtterances.length} single-word utterances < 1 second`);
        }
        
        console.log('');
        
      } else {
        console.log(`❌ ${episode}_${lang} no utterances`);
      }
    } catch (e) {
      console.error(`❌ Error parsing ${episode}_${lang}:`, e.message);
    }
  });
});
