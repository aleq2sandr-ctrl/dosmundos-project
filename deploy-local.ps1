$ErrorActionPreference = "Stop"

Write-Host "=== Local Deployment Test ===" -ForegroundColor Green

# Configuration
$VPS_HOST = "72.61.186.175"
$VPS_USER = "root"
$VPS_PORT = 22
$VPS_PATH = "/root/dosmundos-app"
$DEPLOY_ARCHIVE = "deploy.tar.gz"

try {
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        throw "package.json not found. Please run from project root directory."
    }

    # Check if deployment directory exists and clean it
    if (Test-Path "deployment") {
        Write-Host "Cleaning existing deployment directory..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "deployment"
    }

    # Check if build exists
    if (-not (Test-Path "dist")) {
        Write-Host "Build directory not found, running build..." -ForegroundColor Yellow
        npm run build
    }

    Write-Host "Creating deployment directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force "deployment"

    Write-Host "Copying files..." -ForegroundColor Cyan
    Copy-Item -Recurse "dist\*" "deployment" -Force
    Copy-Item "server.js" "deployment" -Force
    Copy-Item "package.json" "deployment" -Force
    if (Test-Path "api") {
        Copy-Item -Recurse "api" "deployment" -Force
    }

    # Create temporary .deployment-info file (for testing)
    $deploymentInfo = @"
Deployment timestamp: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ" -UFormat %s)
Git commit: local-test
Git branch: main
"@
    $deploymentInfo | Out-File -FilePath "deployment\.deployment-info" -Encoding utf8

    # Create archive (using Git Bash tar if available, fallback to PowerShell compression)
    Write-Host "Creating deployment archive..." -ForegroundColor Cyan
    if (Get-Command "bash" -ErrorAction SilentlyContinue) {
        bash -c "cd deployment && tar -czf ../$DEPLOY_ARCHIVE ."
        if (-not $?) { throw "Failed to create archive with tar" }
    } else {
        Write-Warning "tar not available, using PowerShell Compress-Archive"
        Compress-Archive -Path "deployment\*" -DestinationPath "deploy.zip" -Force
        $DEPLOY_ARCHIVE = "deploy.zip"
    }

    Write-Host "Archive created successfully: $(Get-Item $DEPLOY_ARCHIVE | Format-Table -Property Name, Length | Out-String)" -ForegroundColor Green

    # Test upload
    Write-Host "Testing SSH connectivity and upload..." -ForegroundColor Cyan
    
    # First check if we can connect
    $testResult = ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "echo 'Connection test successful'"
    if ($LASTEXITCODE -ne 0) {
        throw "SSH connection test failed: $testResult"
    }
    Write-Host "SSH connection test: PASSED" -ForegroundColor Green

    # Create remote directories
    ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"

    # Upload using scp
    if (Get-Command "scp" -ErrorAction SilentlyContinue) {
        Write-Host "Uploading archive using scp..." -ForegroundColor Cyan
        $scpCommand = "scp -P $VPS_PORT $DEPLOY_ARCHIVE ${VPS_USER}@${VPS_HOST}:/tmp/"
        Invoke-Expression $scpCommand
        if ($LASTEXITCODE -ne 0) { throw "SCP upload failed" }
    } else {
        Write-Warning "scp not available, attempting to use PowerShell Copy-Item (requires PSRemoting)"
        throw "scp not available. Please install Git for Windows or enable PSRemoting on VPS."
    }

    Write-Host "Archive uploaded successfully" -ForegroundColor Green

    # Verify file exists on remote
    Write-Host "Checking if file exists on remote..." -ForegroundColor Cyan
    $remoteCheck = ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "[ -f /tmp/$DEPLOY_ARCHIVE ] && echo 'File exists' || echo 'File not found'"
    if ($remoteCheck -notmatch 'File exists') {
        throw "Archive not found on remote server"
    }

    Write-Host "=== Deployment Ready! ===" -ForegroundColor Green
    Write-Host "Archive uploaded to /tmp/$DEPLOY_ARCHIVE on remote server"
    Write-Host "Run this command to complete deployment:"
    Write-Host "  ssh -p $VPS_PORT $VPS_USER@$VPS_HOST 'cd $VPS_PATH && rm -rf ./* && tar -xzf /tmp/$DEPLOY_ARCHIVE && rm /tmp/$DEPLOY_ARCHIVE && npm ci --production && pm2 restart dosmundos-api || pm2 start server.js --name dosmundos-api'"

} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host "Stacktrace: $($_.ScriptStackTrace)" -ForegroundColor DarkRed
    exit 1
}