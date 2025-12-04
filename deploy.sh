#!/bin/bash

# Deploy script for updating the site on VPS
# Run this script on your VPS after uploading it to the project directory

echo "Starting deployment..."

# Pull latest changes from git
echo "Pulling latest changes from git..."
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building the project..."
npm run build

# Restart the server (assuming PM2 is used; adjust if using another process manager)
echo "Restarting the server..."
pm2 restart dosmundos-server  # Replace 'dosmundos-server' with your PM2 app name

echo "Deployment completed successfully!"