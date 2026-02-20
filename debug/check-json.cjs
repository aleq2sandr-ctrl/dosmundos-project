const fs = require('fs');
const path = require('path');

const files = [
    '2026-01-28_ES.json',
    '2026-01-28_RU.json',
    '2026-02-04_ES.json',
    '2026-02-04_RU.json',
    '2026-02-11_ES.json',
    '2026-02-11_RU.json'
];

const audioDir = 'C:/Users/alexb/OneDrive/Desktop/Peru/Audio';

files.forEach(filename => {
    const filePath = path.join(audioDir, filename);
    if (fs.existsSync(filePath)) {
        try {
            console.log('===', filename, '===');
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            console.log('Size:', (content.length / 1024).toFixed(1), 'KB');
            console.log('Keys:', Object.keys(data));
            
            if (data.utterances) {
                console.log('Utterances:', data.utterances.length);
                if (data.utterances.length > 0) {
                    console.log('First utterance:', data.utterances[0].text.substring(0, 100));
                }
            } else {
                console.log('❌ No utterances');
            }
            
            if (data.words) {
                console.log('Words:', data.words.length);
            }
            
            console.log();
        } catch (error) {
            console.error(filename, 'Error:', error.message);
            console.log();
        }
    }
});
