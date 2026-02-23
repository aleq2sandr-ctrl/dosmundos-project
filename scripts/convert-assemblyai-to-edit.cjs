const fs = require('fs');
const path = require('path');

const directoryPath = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';

function mapSpeaker(speaker) {
    if (!speaker) return "0";
    // AssemblyAI uses A, B, C...
    // We want 0, 1, 2...
    if (speaker.length === 1 && speaker >= 'A' && speaker <= 'Z') {
        return (speaker.charCodeAt(0) - 'A'.charCodeAt(0)).toString();
    }
    return speaker;
}

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }

    files.forEach((file) => {
        if (file.endsWith('_RU_assemblyai.json')) {
            const filePath = path.join(directoryPath, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                
                if (!data.utterances) {
                    console.log(`Skipping ${file}: No utterances found.`);
                    return;
                }

                const newUtterances = data.utterances.map((u, index) => ({
                    id: index,
                    start: u.start,
                    end: u.end,
                    speaker: mapSpeaker(u.speaker),
                    text: u.text
                }));

                const newContent = {
                    utterances: newUtterances
                };

                // Construct new filename: replace _assemblyai.json with _assemblyai_edit.json
                const newFilename = file.replace('_assemblyai.json', '_assemblyai_edit.json');
                const newFilePath = path.join(directoryPath, newFilename);

                fs.writeFileSync(newFilePath, JSON.stringify(newContent, null, 2));
                console.log(`Converted: ${file} -> ${newFilename}`);

            } catch (e) {
                console.log(`Error processing ${file}:`, e);
            }
        }
    });
});
