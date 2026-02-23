require('dotenv').config();
const { Client } = require('ssh2');

const VPS_CONFIG = {
  host: process.env.VPS_IP || '72.61.186.175',
  user: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD || 'Qazsxdc@1234',
  remotePath: '/var/storage/transcript/',
  publicBase: 'https://dosmundos.pe/files/transcript/'
};

console.log('Testing VPS Large File Upload...');
console.log('Host:', VPS_CONFIG.host);

// Generate a 5MB dummy file
const sizeMB = 5;
const sizeBytes = sizeMB * 1024 * 1024;
console.log(`Generating ${sizeMB}MB test data...`);
const buffer = Buffer.alloc(sizeBytes, 'x'); // Fill with 'x'
console.log(`Buffer created. Size: ${buffer.length} bytes`);

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connection ready');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP Error:', err);
      conn.end();
      return;
    }

    console.log('✅ SFTP Session established');
    
    const fileName = 'test_large_upload_' + Date.now() + '.txt';
    const remoteFilePath = VPS_CONFIG.remotePath + fileName;

    console.log(`Attempting to upload to: ${remoteFilePath}`);
    const startTime = Date.now();

    const writeStream = sftp.createWriteStream(remoteFilePath);
    
    writeStream.on('close', () => {
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ Upload successful!`);
      console.log(`Time taken: ${duration}s`);
      console.log(`Speed: ${(sizeMB / duration).toFixed(2)} MB/s`);
      
      // Verify file exists and check size
      sftp.stat(remoteFilePath, (statErr, stats) => {
        if (statErr) {
            console.error('❌ Verification failed (stat):', statErr);
            conn.end();
        } else {
            console.log('✅ File verification successful.');
            console.log(`Expected size: ${sizeBytes}`);
            console.log(`Actual size:   ${stats.size}`);
            
            if (stats.size === sizeBytes) {
                console.log('✅ Size matches perfectly.');
            } else {
                console.error('❌ Size mismatch!');
            }
            
            // Cleanup
            console.log('Cleaning up test file...');
            sftp.unlink(remoteFilePath, (unlinkErr) => {
                if (unlinkErr) console.warn('⚠️ Cleanup failed:', unlinkErr);
                else console.log('✅ Cleanup successful');
                conn.end();
            });
        }
      });
    });
    
    writeStream.on('error', (uploadErr) => {
      console.error('❌ Upload stream error:', uploadErr);
      conn.end();
    });
    
    writeStream.write(buffer);
    writeStream.end();
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Error:', err);
}).connect({
  host: VPS_CONFIG.host,
  port: 22,
  username: VPS_CONFIG.user,
  password: VPS_CONFIG.password,
  readyTimeout: 20000
});
