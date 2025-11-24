import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// VPS connection details
const VPS_IP = '72.61.186.175';
const VPS_USER = 'root';
const VPS_PATH = '/var/www/dosmundos';

/**
 * Deploy dosmundos project directly to VPS
 */
async function deployToVPS() {
  console.log('🚀 Deploying DosMundos to VPS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Create deployment archive
    console.log('📦 Step 1: Creating deployment archive...');
    
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      console.error('❌ dist/ directory not found. Run "npm run build" first.');
      process.exit(1);
    }

    // Create tar.gz archive of dist folder
    const archiveName = `dosmundos-${Date.now()}.tar.gz`;
    const archivePath = path.join(process.cwd(), archiveName);
    
    // Use tar command (available in Windows 10+)
    const tarCmd = `tar -czf "${archiveName}" -C dist .`;
    try {
        execSync(tarCmd, { stdio: 'inherit', cwd: process.cwd() });
    } catch (e) {
        console.log('   Retrying tar creation with alternative command...');
        execSync(`cd dist && tar -czf "../${archiveName}" .`, { stdio: 'inherit', cwd: process.cwd() });
    }

    console.log('✅ Archive created:', archiveName);

    // Step 2: Upload to VPS using scp
    console.log('\n📤 Step 2: Uploading to VPS...');
    console.log('🔑 You may be asked for the VPS password.');
    
    const scpCmd = `scp "${archiveName}" ${VPS_USER}@${VPS_IP}:/tmp/`;

    try {
      execSync(scpCmd, { stdio: 'inherit', cwd: process.cwd() });
      console.log('✅ Upload complete');
    } catch (error) {
      console.error('❌ Upload failed.');
      throw error;
    }

    // Step 3: Deploy on VPS
    console.log('\n🔧 Step 3: Deploying on VPS...');
    console.log('🔑 You may be asked for the VPS password again.');
    
    const deployCommands = [
      `mkdir -p ${VPS_PATH}`,
      `cd ${VPS_PATH} && rm -rf *`,
      `cd ${VPS_PATH} && tar -xzf /tmp/${archiveName}`,
      `rm -f /tmp/${archiveName}`,
      `chown -R www-data:www-data ${VPS_PATH} || chown -R nginx:nginx ${VPS_PATH} || true`,
      `chmod -R 755 ${VPS_PATH}`,
      `systemctl reload nginx || service nginx reload || nginx -s reload || true`
    ].join(' && ');

    const sshCmd = `ssh ${VPS_USER}@${VPS_IP} "${deployCommands}"`;
      
    try {
      execSync(sshCmd, { stdio: 'inherit' });
    } catch (error) {
      console.error(`❌ Deployment commands failed`);
      throw error;
    }

    // Step 4: Verify deployment
    console.log('\n✅ Step 4: Verifying deployment...');
    
    const verifyCmd = `ssh ${VPS_USER}@${VPS_IP} "test -f ${VPS_PATH}/index.html && echo 'DEPLOYMENT SUCCESS' || echo 'DEPLOYMENT FAILED'"`;

    const result = execSync(verifyCmd, { encoding: 'utf8' }).trim();
    
    if (result.includes('SUCCESS')) {
      console.log('✅ Deployment verified successfully!');
    } else {
      console.log('❌ Deployment verification failed');
      throw new Error('Deployment verification failed');
    }

    // Cleanup local archive
    fs.unlinkSync(archivePath);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DosMundos deployed successfully to VPS!');
    console.log(`   Website: https://dosmundos.pe`);
    console.log(`   Server: ${VPS_IP}`);
    console.log(`   Path: ${VPS_PATH}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

console.log('🚀 Starting deployment script...');

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('✅ Script detected as main module, starting deployment...');
  deployToVPS();
} else {
  console.log('ℹ️  Script imported as module, deployment not started automatically');
}

// Always run deployment when executed directly
if (process.argv[1].endsWith('deploy-to-vps.js')) {
  console.log('✅ File name matches, forcing deployment start...');
  deployToVPS();
}

export { deployToVPS };
