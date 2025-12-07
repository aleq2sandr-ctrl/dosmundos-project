const fs = require('fs');
const path = require('path');

const directoryPath = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }

    files.forEach((file) => {
        // Match files ending in _RU_edit.json or _ES_edit.json
        // But NOT those that already have _deepgram_ in them (to avoid double renaming if run multiple times)
        if ((file.endsWith('_RU_edit.json') || file.endsWith('_ES_edit.json')) && !file.includes('_deepgram_')) {
            
            const oldPath = path.join(directoryPath, file);
            
            // Replace _edit.json with _deepgram_edit.json
            const newFilename = file.replace('_edit.json', '_deepgram_edit.json');
            const newPath = path.join(directoryPath, newFilename);

            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.log('Error renaming file:', file, err);
                } else {
                    console.log(`Renamed: ${file} -> ${newFilename}`);
                }
            });
        }
    });
});
