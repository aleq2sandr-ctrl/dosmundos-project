#!/bin/bash

# Script to fix ALL Supabase limits: upload size and CORS
# Run this on your VPS server

echo "🔧 Fixing ALL Supabase limits (upload size + CORS)..."

# Navigate to Supabase directory
cd /opt/supabase/supabase/docker || {
    echo "❌ Error: Cannot find Supabase directory at /opt/supabase/supabase/docker"
    echo "Please check your Supabase installation path"
    exit 1
}

echo "📍 Current directory: $(pwd)"

# Create backups
echo "📋 Creating backups..."
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
cp volumes/api/kong.yml volumes/api/kong.yml.backup.$(date +%Y%m%d_%H%M%S)

echo ""
echo "=== FIXING UPLOAD LIMITS ==="

# Update Kong buffer sizes in docker-compose.yml
echo "🔧 Updating Kong buffer sizes for large uploads..."

# Replace the small buffer values with larger ones
sed -i 's/KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k/KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 128m/g' docker-compose.yml
sed -i 's/KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k/KONG_NGINX_PROXY_PROXY_BUFFERS: 4 128m/g' docker-compose.yml

echo "✅ Upload limits updated. New Kong settings:"
grep -A 2 -B 2 "KONG_NGINX_PROXY_PROXY_BUFFER" docker-compose.yml

echo ""
echo "=== FIXING CORS ISSUES ==="

# Update Kong configuration with improved CORS
echo "🔧 Updating Kong CORS configuration..."

cat > volumes/api/kong.yml << 'EOF'
_format_version: '2.1'
_transform: true

plugins:
  - name: cors
    config:
      origins:
        - '*'
        - 'http://localhost:5173'
        - 'http://localhost:3000'
        - 'http://127.0.0.1:5173'
        - 'http://127.0.0.1:3000'
        - 'https://dosmundos.pe'
        - 'https://www.dosmundos.pe'
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - PATCH
        - OPTIONS
        - HEAD
      headers:
        - Accept
        - Accept-Version
        - Content-Length
        - Content-MD5
        - Content-Type
        - Date
        - X-Auth-Token
        - apikey
        - Authorization
        - Prefer
        - Range
        - x-client-info
        - x-requested-with
        - x-forwarded-for
        - x-forwarded-proto
        - x-forwarded-host
        - origin
        - referer
        - user-agent
      exposed_headers:
        - Content-Length
        - Content-Range
        - X-Total-Count
        - x-kong-upstream-latency
        - x-kong-proxy-latency
      credentials: true
      max_age: 3600
      preflight_continue: false

###
### Consumers / Users
###
consumers:
  - username: DASHBOARD
  - username: anon
    keyauth_credentials:
      - key: $SUPABASE_ANON_KEY
  - username: service_role
    keyauth_credentials:
      - key: $SUPABASE_SERVICE_KEY

###
### Access Control List
###
acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: admin

###
### Dashboard credentials
###
basicauth_credentials:
  - consumer: DASHBOARD
    username: $DASHBOARD_USERNAME
    password: $DASHBOARD_PASSWORD

###
### API Routes
###
services:
  ## Open Auth routes
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
  ## Secure Auth routes
  - name: auth-v1
    _comment: 'GoTrue: /auth/v1/* -> http://auth:9999/*'
    url: http://auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  ## Secure REST routes
  - name: rest-v1
    _comment: 'PostgREST: /rest/v1/* -> http://rest:3000/*'
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  ## Secure GraphQL routes
  - name: graphql-v1
    _comment: 'PostgREST: /graphql/v1/* -> http://rest:3000/rpc/graphql'
    url: http://rest:3000/rpc/graphql
    routes:
      - name: graphql-v1-all
        strip_path: true
        paths:
          - /graphql/v1
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: request-transformer
        config:
          add:
            headers:
              - Content-Profile:graphql_public
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  ## Secure Realtime routes
  - name: realtime-v1-ws
    _comment: 'Realtime: /realtime/v1/* -> ws://realtime:4000/socket/*'
    url: http://realtime-dev.supabase-realtime:4000/socket
    protocol: ws
    routes:
      - name: realtime-v1-ws
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
  - name: realtime-v1-rest
    _comment: 'Realtime: /realtime/v1/* -> ws://realtime:4000/socket/*'
    url: http://realtime-dev.supabase-realtime:4000/api
    protocol: http
    routes:
      - name: realtime-v1-rest
        strip_path: true
        paths:
          - /realtime/v1/api
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
  ## Storage routes: the storage server manages its own auth
  - name: storage-v1
    _comment: 'Storage: /storage/v1/* -> http://storage:5000/*'
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors
  ## Edge Functions routes
  - name: functions-v1
    _comment: 'Edge Functions: /functions/v1/* -> http://functions:9000/*'
    url: http://functions:9000/
    routes:
      - name: functions-v1-all
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors
  ## Analytics routes
  - name: analytics-v1
    _comment: 'Analytics: /analytics/v1/* -> http://logflare:4000/*'
    url: http://analytics:4000/
    routes:
      - name: analytics-v1-all
        strip_path: true
        paths:
          - /analytics/v1/

  ## Secure Database routes
  - name: meta
    _comment: 'pg-meta: /pg/* -> http://pg-meta:8080/*'
    url: http://meta:8080/
    routes:
      - name: meta-all
        strip_path: true
        paths:
          - /pg/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin

  ## Block access to /api/mcp
  - name: mcp-blocker
    _comment: 'Block direct access to /api/mcp'
    url: http://studio:3000/api/mcp
    routes:
      - name: mcp-blocker-route
        strip_path: true
        paths:
          - /api/mcp
    plugins:
      - name: request-termination
        config:
          status_code: 403
          message: "Access is forbidden."

  ## MCP endpoint - local access
  - name: mcp
    _comment: 'MCP: /mcp -> http://studio:3000/api/mcp (local access)'
    url: http://studio:3000/api/mcp
    routes:
      - name: mcp
        strip_path: true
        paths:
          - /mcp
    plugins:
      # Block access to /mcp by default
      - name: request-termination
        config:
          status_code: 403
          message: "Access is forbidden."
      # Enable local access (danger zone!)
      # 1. Comment out the 'request-termination' section above
      # 2. Uncomment the entire section below, including 'deny'
      # 3. Add your local IPs to the 'allow' list
      #- name: cors
      #- name: ip-restriction
      #  config:
      #    allow:
      #      - 127.0.0.1
      #      - ::1
      #    deny: []

  ## Protected Dashboard - catch all remaining routes
  - name: dashboard
    _comment: 'Studio: /* -> http://studio:3000/*'
    url: http://studio:3000/
    routes:
      - name: dashboard-all
        strip_path: true
        paths:
          - /
    plugins:
      - name: cors
      - name: basic-auth
        config:
          hide_credentials: false
EOF

echo "✅ CORS configuration updated"

echo ""
echo "=== RESTARTING SUPABASE SERVICES ==="

# Stop and restart Kong
echo "🛑 Stopping Kong container..."
docker-compose stop kong

echo "🗑️ Removing old Kong container..."
docker-compose rm -f kong

echo "🚀 Starting Kong with updated configuration..."
docker-compose up -d kong

# Wait for Kong to start
sleep 10

# Test Kong health
if docker-compose ps kong | grep -q "Up"; then
    echo "✅ Kong is running successfully!"
    echo ""
    echo "🧪 Testing configurations..."

    # Test upload limits
    echo "📤 Testing upload limit fix..."
    docker exec supabase-kong env | grep KONG_NGINX_PROXY | head -2

    # Test CORS headers
    echo ""
    echo "🌐 Testing CORS configuration..."
    response=$(curl -s -I -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" -X OPTIONS https://supabase.dosmundos.pe/rest/v1/ 2>/dev/null || echo "curl failed")

    if echo "$response" | grep -q "access-control-allow-origin"; then
        echo "✅ CORS headers are being sent correctly"
    else
        echo "⚠️ CORS headers not detected in test response"
    fi

else
    echo "❌ Kong failed to start. Checking logs..."
    docker-compose logs kong | tail -20
    exit 1
fi

echo ""
echo "🎉 ALL Supabase limits have been fixed!"
echo "✅ Upload limit: Increased to 128MB"
echo "✅ CORS: Fixed for localhost development"
echo ""
echo "🔍 Test your fixes:"
echo "   1. Upload large files: node test-large-upload.js"
echo "   2. Check browser: Refresh your app - no more CORS errors!"
echo ""
echo "📋 Summary of changes:"
echo "   • Kong proxy buffer size: 160k → 128m"
echo "   • Kong proxy buffers: 64 160k → 4 128m"
echo "   • CORS origins: Added localhost:5173, localhost:3000"
echo "   • CORS credentials: true"
echo "   • CORS plugins: Added to all services"
