#!/bin/bash

# Manual deployment script for VPS
# Run this on your VPS after connecting via SSH

set -e

echo "=== Manual VPS Deployment ==="
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
echo "Date: $(date)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: package.json not found. Please run this script from the project directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Pulling latest changes from git...${NC}"
git pull origin main

echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}Step 3: Building the project...${NC}"
npm run build

echo -e "${YELLOW}Step 4: Checking build output...${NC}"
if [ ! -d "dist" ]; then
    echo -e "${RED}ERROR: Build failed - dist directory not found${NC}"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}ERROR: index.html not found in dist/${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Check if PM2 is available and restart server
echo -e "${YELLOW}Step 5: Checking server status...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "dosmundos-server"; then
        echo -e "${YELLOW}Restarting server with PM2...${NC}"
        pm2 restart dosmundos-server
        echo -e "${GREEN}Server restarted successfully!${NC}"
    else
        echo -e "${YELLOW}Starting server with PM2...${NC}"
        pm2 start server.js --name dosmundos-server
        echo -e "${GREEN}Server started successfully!${NC}"
    fi

    # Wait a moment and check status
    sleep 3
    pm2 status dosmundos-server || echo "Could not check PM2 status"
else
    echo -e "${YELLOW}PM2 not found. Please start the server manually:${NC}"
    echo "node server.js &"
fi

# Test health endpoint
echo -e "${YELLOW}Step 6: Testing server health...${NC}"
if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running and healthy!${NC}"
    echo "Deployment completed successfully!"
else
    echo -e "${RED}❌ Server health check failed${NC}"
    echo "Please check server logs and configuration"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "Your site should now be updated with the latest changes."