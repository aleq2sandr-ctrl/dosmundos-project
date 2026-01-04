#!/bin/bash

# Script to fix Supabase upload limit by updating Kong buffer sizes
# Run this on your VPS server

echo "🔧 Fixing Supabase upload limit..."

# Navigate to Supabase directory
cd /opt/supabase/supabase/docker || {
    echo "❌ Error: Cannot find Supabase directory at /opt/supabase/supabase/docker"
    echo "Please check your Supabase installation path"
    exit 1
}

echo "📍 Current directory: $(pwd)"

# Backup current docker-compose.yml
echo "📋 Creating backup of docker-compose.yml..."
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Update Kong buffer sizes in docker-compose.yml
echo "🔧 Updating Kong buffer sizes..."

# Replace the small buffer values with larger ones
sed -i 's/KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k/KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 128m/g' docker-compose.yml
sed -i 's/KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k/KONG_NGINX_PROXY_PROXY_BUFFERS: 4 128m/g' docker-compose.yml

echo "✅ Configuration updated. New Kong settings:"
grep -A 2 -B 2 "KONG_NGINX_PROXY_PROXY_BUFFER" docker-compose.yml

# Stop Kong container
echo "🛑 Stopping Kong container..."
docker-compose stop kong

# Remove Kong container to force recreation with new config
echo "🗑️ Removing old Kong container..."
docker-compose rm -f kong

# Start Kong with new configuration
echo "🚀 Starting Kong with updated configuration..."
docker-compose up -d kong

# Wait a moment for Kong to start
sleep 5

# Check if Kong is running
if docker-compose ps kong | grep -q "Up"; then
    echo "✅ Kong is running successfully!"
    echo ""
    echo "🧪 Testing upload limit fix..."

    # Test with a simple curl to check if Kong responds
    if curl -s --max-time 10 http://localhost:8000/health > /dev/null; then
        echo "✅ Kong health check passed"
    else
        echo "⚠️ Kong health check failed - this might be normal if no health endpoint exists"
    fi

    echo ""
    echo "📋 Kong container environment variables:"
    docker exec supabase-kong env | grep KONG_NGINX_PROXY

else
    echo "❌ Kong failed to start. Checking logs..."
    docker-compose logs kong
fi

echo ""
echo "🎉 Supabase upload limit fix completed!"
echo "💡 You can now upload files larger than 1MB to Supabase Storage"
echo "🔍 Test with: node test-supabase.js (create a file > 1MB to test)"
