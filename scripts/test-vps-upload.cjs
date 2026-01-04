require('dotenv').config();
const { Client } = require('ssh2');

const VPS_CONFIG = {
  host: process.env.VPS_IP || '72.61.186.175',
  user: process.env.VPS_USER || 'root',
  password: process.env.VPS_PASSWORD || 'Qazsxdc@1234',
  remotePath: '/var/storage/transcript/',
  publicBase: 'https://dosmundos.pe/files/transcript/'
};

console.log('Testing VPS Connection...');
console.log('Host:', VPS_CONFIG.host);
console.log('User:', VPS_CONFIG.user);
console.log('Remote Path:', VPS_CONFIG.remotePath);

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
    
    // Check if directory exists first
    sftp.readdir(VPS_CONFIG.remotePath, (readErr, list) => {
        if (readErr) {
            console.warn(`⚠️ Warning: Could not list directory ${VPS_CONFIG.remotePath}. It might not exist or permission denied.`);
            console.warn('Error:', readErr.message);
            // Try to create it?
            // sftp.mkdir(VPS_CONFIG.remotePath, ...); 
        } else {
            console.log(`✅ Directory exists and is accessible.`);
        }

        const fileName = 'test_vps_upload_' + Date.now() + '.txt';
        const content = 'This is a test file for VPS upload verification.';
        const remoteFilePath = VPS_CONFIG.remotePath + fileName;

        console.log(`Attempting to upload to: ${remoteFilePath}`);

        const writeStream = sftp.createWriteStream(remoteFilePath);
        
        writeStream.on('close', () => {
          console.log(`✅ Upload successful!`);
          console.log(`Public URL should be: ${VPS_CONFIG.publicBase}${fileName}`);
          
          // Verify file exists
          sftp.stat(remoteFilePath, (statErr, stats) => {
            if (statErr) {
                console.error('❌ Verification failed (stat):', statErr);
                conn.end();
            } else {
                console.log('✅ File verification successful. Size:', stats.size);
                
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
        
        writeStream.write(content);
        writeStream.end();
    });
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
