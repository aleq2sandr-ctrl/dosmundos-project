#!/bin/bash

# Deploy script for updating the site on VPS
# Run this script on your VPS after uploading it to the project directory

set -e  # Exit on any error

echo "Starting deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Are you in the project directory?"
    exit 1
fi

# Pull latest changes from git
echo "Pulling latest changes from git..."
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "Error: Build failed - dist directory not found"
    exit 1
fi

# Restart the server (assuming PM2 is used; adjust if using another process manager)
echo "Checking if PM2 process exists..."
if pm2 list | grep -q "dosmundos-server"; then
    echo "Restarting the server..."
    pm2 restart dosmundos-server
else
    echo "Starting the server with PM2..."
    pm2 start server.js --name dosmundos-server
fi

# Wait a moment for server to start
sleep 3

# Test health endpoint
echo "Testing server health..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Server is running and healthy"
else
    echo "❌ Server health check failed"
    exit 1
fi

echo "✅ Deployment completed successfully!"