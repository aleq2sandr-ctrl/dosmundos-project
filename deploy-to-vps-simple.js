import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// VPS connection details
const VPS_IP = '72.61.186.175';
const VPS_USER = 'root';
const VPS_PASSWORD = 'Qazsxdc@1234';
const VPS_PATH = '/var/www/dosmundos';

/**
 * Deploy dosmundos project directly to VPS using Windows native tools
 */
async function deployToVPS() {
  console.log('🚀 Deploying DosMundos to VPS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Check dist folder
    console.log('📦 Step 1: Checking build files...');
    
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      console.error('❌ dist/ directory not found. Run "npm run build" first.');
      process.exit(1);
    }

    // Check if index.html exists
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error('❌ index.html not found in dist/. Build may have failed.');
      process.exit(1);
    }

    console.log('✅ Build files verified');

    // Step 2: Use PowerShell to create deployment script
    console.log('\n📤 Step 2: Creating PowerShell deployment script...');
    
    const psScript = `
# PowerShell script to deploy to VPS
$VPS_IP = "${VPS_IP}"
$VPS_USER = "${VPS_USER}"
$VPS_PASSWORD = "${VPS_PASSWORD}"
$VPS_PATH = "${VPS_PATH}"
$LocalPath = "${distPath}"
$ArchiveName = "dosmundos-$(Get-Date -Format 'yyyyMMddHHmmss').zip"
$ArchivePath = Join-Path $env:TEMP $ArchiveName

Write-Host "Creating archive: $ArchiveName" -ForegroundColor Green

# Create zip archive
Compress-Archive -Path "$LocalPath\\*" -DestinationPath $ArchivePath -Force

Write-Host "Archive created: $ArchivePath" -ForegroundColor Green

# Use SSH.NET for file transfer (if available) or show manual instructions
Write-Host "=== MANUAL DEPLOYMENT INSTRUCTIONS ===" -ForegroundColor Yellow
Write-Host "1. Upload the archive to VPS manually:" -ForegroundColor White
Write-Host "   - Use WinSCP or FileZilla" -ForegroundColor Gray
Write-Host "   - Host: $VPS_IP" -ForegroundColor Gray
Write-Host "   - User: $VPS_USER" -ForegroundColor Gray
Write-Host "   - Password: $VPS_PASSWORD" -ForegroundColor Gray
Write-Host "   - Upload: $ArchivePath" -ForegroundColor Gray
Write-Host "   - Destination: /tmp/" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "2. Execute these commands on VPS:" -ForegroundColor White
Write-Host "   mkdir -p $VPS_PATH" -ForegroundColor Gray
Write-Host "   cd $VPS_PATH && rm -rf *" -ForegroundColor Gray
Write-Host "   cd $VPS_PATH && unzip /tmp/$ArchiveName" -ForegroundColor Gray
Write-Host "   rm -f /tmp/$ArchiveName" -ForegroundColor Gray
Write-Host "   chown -R www-data:www-data $VPS_PATH || chown -R nginx:nginx $VPS_PATH" -ForegroundColor Gray
Write-Host "   chmod -R 755 $VPS_PATH" -ForegroundColor Gray
Write-Host "   systemctl reload nginx" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "3. Verify deployment:" -ForegroundColor White
Write-Host "   curl -I https://dosmundos.pe" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Yellow

# Keep archive for manual upload
Write-Host "Archive saved at: $ArchivePath" -ForegroundColor Green
Write-Host "Please upload it manually using WinSCP/FileZilla" -ForegroundColor Cyan
`;

    const scriptPath = path.join(process.cwd(), 'deploy-vps.ps1');
    fs.writeFileSync(scriptPath, psScript);
    
    // Execute PowerShell script
    try {
      execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ PowerShell script executed');
    } catch (error) {
      console.error('❌ PowerShell execution failed:', error.message);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Deployment package prepared!');
    console.log(`   Archive: Created in temp directory`);
    console.log(`   Next: Upload manually using WinSCP/FileZilla`);
    console.log(`   Website: https://dosmundos.pe`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Deployment preparation failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
console.log('🚀 Starting deployment script...');
deployToVPS();
