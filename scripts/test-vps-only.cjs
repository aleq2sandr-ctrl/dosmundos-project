const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const path = require('path');
const execAsync = promisify(exec);

async function testVPSUpload() {
  console.log('=== VPS Upload Test ===');
  
  const fileName = `test-vps-${Date.now()}.json`;
  const content = JSON.stringify({ test: 'data '.repeat(100000) }, null, 2); // ~1MB
  
  try {
    // Test 1: SSH connectivity
    console.log('\n1. Testing SSH connectivity...');
    await execAsync('ssh -o StrictHostKeyChecking=no root@72.61.186.175 "echo SSH OK"');
    console.log('✅ SSH OK');
  } catch (error) {
    console.error('❌ SSH FAILED:', error.message);
    return;
  }
  
  try {
    // Test 2: Create temp dir
    console.log('\n2. Creating temp dir...');
    await execAsync('mkdir -p temp');
    console.log('✅ Temp dir OK');
    
    // Test 3: Write temp file
    const localFilePath = path.join(process.cwd(), 'temp', fileName);
    await fs.writeFile(localFilePath, content, 'utf8');
    console.log('✅ Temp file written');
    
    // Test 4: SCP upload
    console.log('\n4. SCP upload...');
    const scpCommand = `scp -o StrictHostKeyChecking=no "${localFilePath}" "root@72.61.186.175:/var/storage/transcript/${fileName}"`;
    await execAsync(scpCommand);
    console.log('✅ SCP upload OK');
    
    // Test 5: Verify URL
    console.log('\n5. Testing public URL...');
    const publicUrl = `https://dosmundos.pe/files/transcript/${fileName}`;
    const response = await fetch(publicUrl);
    console.log('URL status:', response.status);
    if (response.ok) {
      const text = await response.text();
      console.log('✅ URL accessible (first 100 chars):', text.substring(0, 100));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    try {
      await fs.unlink(localFilePath);
      console.log('🧹 Cleanup complete');
    } catch {}
  }
}

testVPSUpload();
