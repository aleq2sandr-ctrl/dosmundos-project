
# PowerShell script to deploy to VPS
$VPS_IP = "72.61.186.175"
$VPS_USER = "root"
$VPS_PASSWORD = "Qazsxdc@1234"
$VPS_PATH = "/var/www/dosmundos"
$LocalPath = "C:\Users\alexb\OneDrive\Desktop\App\_GitHub\dosmundos\dist"
$ArchiveName = "dosmundos-$(Get-Date -Format 'yyyyMMddHHmmss').zip"
$ArchivePath = Join-Path $env:TEMP $ArchiveName

Write-Host "Creating archive: $ArchiveName" -ForegroundColor Green

# Create zip archive
Compress-Archive -Path "$LocalPath\*" -DestinationPath $ArchivePath -Force

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
