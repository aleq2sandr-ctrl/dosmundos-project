const fs = require('fs');
const path = require('path');

const directoryPath = '/Users/macbookairm4-15n/Documents/DosMundos/Meditacions';

fs.readdir(directoryPath, (err, files) => {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  }

  files.forEach((file) => {
    // Match pattern: YYYY-MM-DD_LANG.json
    // Exclude files that already have suffixes like _edit, _assemblyai, _deepgram
    const regex = /^(\d{4}-\d{2}-\d{2}_[A-Z]{2})\.json$/;
    const match = file.match(regex);

    if (match) {
      const oldPath = path.join(directoryPath, file);
      const newFilename = `${match[1]}_deepgram.json`;
      const newPath = path.join(directoryPath, newFilename);

      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          console.log(`Error renaming ${file}: ${err}`);
        } else {
          console.log(`Renamed: ${file} -> ${newFilename}`);
        }
      });
    }
  });
});
