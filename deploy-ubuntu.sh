#!/bin/bash
set -e

# Configuration
VPS_USER="root"
VPS_HOST="72.61.186.175"
VPS_PORT="22"
VPS_PATH="/root/dosmundos-app"
DEPLOY_ARCHIVE="deploy.tar.gz"

echo "=== Starting deployment ==="

# Clean existing deployment files
rm -rf deployment
rm -f $DEPLOY_ARCHIVE

# Check if build exists
if [ ! -d "dist" ]; then
    echo "Build directory not found, running build..."
    npm run build
fi

# Create deployment directory
mkdir -p deployment

# Copy files
cp -a dist/. deployment/
cp server.js deployment/
cp package.json deployment/
cp -r api deployment/

# Create deployment info
cat > deployment/.deployment-info <<EOF
Deployment timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Git commit: $(git rev-parse --short HEAD)
Git branch: $(git rev-parse --abbrev-ref HEAD)
EOF

# Create archive
cd deployment && tar -czf ../$DEPLOY_ARCHIVE .
cd ..

echo "Created deployment archive: $DEPLOY_ARCHIVE"
ls -lh $DEPLOY_ARCHIVE

# Deploy to VPS
echo "Deploying to VPS..."
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "
    set -e
    DEPLOY_PATH='$VPS_PATH'
    mkdir -p \$DEPLOY_PATH
    mkdir -p /tmp/deployment
"

scp -P $VPS_PORT $DEPLOY_ARCHIVE $VPS_USER@$VPS_HOST:/tmp/

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "
    set -e
    DEPLOY_PATH='$VPS_PATH'
    
    if [ ! -f '/tmp/$DEPLOY_ARCHIVE' ]; then
        echo 'ERROR: Archive not found on remote'
        exit 1
    fi

    if [ -d '\$DEPLOY_PATH' ] && [ \"\$(ls -A \$DEPLOY_PATH)\" ]; then
        BACKUP_DIR=\"\$DEPLOY_PATH/backup-$(date +%Y%m%d-%H%M%S)\"
        mkdir -p \$BACKUP_DIR
        cp -r \$DEPLOY_PATH/* \$BACKUP_DIR/ 2>/dev/null || true
        echo 'Backup created at: \$BACKUP_DIR'
    fi

    cd \$DEPLOY_PATH
    rm -rf ./*
    tar -xzf /tmp/$DEPLOY_ARCHIVE
    
    rm -f /tmp/$DEPLOY_ARCHIVE
    
    if [ ! -f 'index.html' ]; then
        echo 'ERROR: index.html not found after extraction'
        exit 1
    fi
    
    npm ci --production
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart dosmundos-api || pm2 start server.js --name dosmundos-api
    fi
    
    chmod -R 755 \$DEPLOY_PATH
    chown -R www-data:www-data \$DEPLOY_PATH || true
    
    sudo nginx -t && sudo systemctl reload nginx
    
    if curl -s http://localhost:3000 >/dev/null; then
        echo '✅ Server is running'
    else
        echo '⚠️  Server might not be running'
    fi
    
    echo '=== Deployment completed! ==='
"

rm -f $DEPLOY_ARCHIVE
rm -rf deployment