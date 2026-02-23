const fs = require('fs');
const path = require('path');

const directoryPath = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }

    files.forEach((file) => {
        // Only process .json files
        if (path.extname(file) === '.json') {
            // Check if file contains _RU or _ES
            // We look for _RU or _ES in the filename. 
            // Based on naming convention (YYYY-MM-DD_LANG_...), this should be safe.
            const isRU = file.includes('_RU');
            const isES = file.includes('_ES');

            if (!isRU && !isES) {
                const filePath = path.join(directoryPath, file);
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.log('Error deleting file:', file, err);
                    } else {
                        console.log(`Deleted: ${file}`);
                    }
                });
            }
        }
    });
});
