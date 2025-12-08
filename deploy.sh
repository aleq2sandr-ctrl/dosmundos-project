#!/bin/bash
set -e

# Configuration
VPS_USER="root"
VPS_HOST="72.61.186.175"
VPS_PASS="Qazsxdc@1234"
VPS_PATH="/root/dosmundos-app"
DEPLOY_ARCHIVE="deploy.tar.gz"

echo "=== Starting Manual Deployment ==="

# 1. Build
echo "--> Building project..."
npm run build

# 2. Create Archive
echo "--> Creating deployment archive..."
rm -rf deployment
mkdir -p deployment
cp -a dist/. deployment/
cp server.js deployment/
cp package.json deployment/
cp -r api deployment/

# Create tarball
tar -czf $DEPLOY_ARCHIVE -C deployment .
rm -rf deployment

echo "--> Archive created: $DEPLOY_ARCHIVE"

# 3. Upload to VPS
echo "--> Uploading to VPS..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no $DEPLOY_ARCHIVE $VPS_USER@$VPS_HOST:/tmp/

# 4. Deploy on VPS
echo "--> Deploying on VPS..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << EOF
  set -e
  
  echo "Connected to VPS."
  
  # Backup
  if [ -d "$VPS_PATH" ]; then
    BACKUP_DIR="${VPS_PATH}_backup_$(date +%Y%m%d_%H%M%S)"
    echo "Backing up to \$BACKUP_DIR..."
    cp -r "$VPS_PATH" "\$BACKUP_DIR"
  else
    mkdir -p "$VPS_PATH"
  fi
  
  # Extract
  echo "Extracting files..."
  # Ensure directory exists and is clean (optional: remove old files, but keep node_modules if possible to speed up)
  # We'll overwrite files.
  mkdir -p "$VPS_PATH"
  tar -xzf /tmp/$DEPLOY_ARCHIVE -C "$VPS_PATH"
  rm /tmp/$DEPLOY_ARCHIVE
  
  # Install dependencies
  echo "Installing dependencies..."
  cd "$VPS_PATH"
  npm install --production
  
  # Restart PM2
  echo "Restarting application..."
  pm2 restart dosmundos-api || pm2 start server.js --name dosmundos-api
  
  echo "Deployment completed successfully on VPS."
EOF

# Cleanup local archive
rm $DEPLOY_ARCHIVE

echo "=== Deployment Finished Successfully! ==="
