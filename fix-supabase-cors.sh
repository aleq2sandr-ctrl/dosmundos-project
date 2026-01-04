#!/bin/bash

# Script to fix Supabase CORS issues
# Run this on your VPS server

echo "🔧 Fixing Supabase CORS issues..."

# Navigate to Supabase directory
cd /opt/supabase/supabase/docker || {
    echo "❌ Error: Cannot find Supabase directory at /opt/supabase/supabase/docker"
    echo "Please check your Supabase installation path"
    exit 1
}

echo "📍 Current directory: $(pwd)"

# Backup Kong configuration
echo "📋 Creating backup of Kong configuration..."
cp volumes/api/kong.yml volumes/api/kong.yml.backup.$(date +%Y%m%d_%H%M%S)

echo "🔍 Checking current CORS configuration..."

# Check if CORS plugin exists and is properly configured
if grep -q "name: cors" volumes/api/kong.yml; then
    echo "✅ CORS plugin found in configuration"
    grep -A 20 "name: cors" volumes/api/kong.yml
else
    echo "❌ CORS plugin not found in Kong configuration"
fi

echo ""
echo "🔧 Updating Kong CORS configuration..."

# Update the Kong configuration to ensure proper CORS headers
# We'll modify the CORS plugin configuration to be more permissive
cat > volumes/api/kong.yml.tmp << 'EOF'
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

# Replace the original file
mv volumes/api/kong.yml.tmp volumes/api/kong.yml

echo "✅ Kong configuration updated with improved CORS settings"

# Stop and restart Kong
echo "🛑 Stopping Kong container..."
docker-compose stop kong

echo "🗑️ Removing old Kong container..."
docker-compose rm -f kong

echo "🚀 Starting Kong with updated CORS configuration..."
docker-compose up -d kong

# Wait for Kong to start
sleep 10

# Test Kong health
if docker-compose ps kong | grep -q "Up"; then
    echo "✅ Kong is running successfully!"

    # Test CORS headers
    echo ""
    echo "🧪 Testing CORS configuration..."
    response=$(curl -s -I -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" -X OPTIONS https://supabase.dosmundos.pe/rest/v1/ 2>/dev/null || echo "curl failed")

    if echo "$response" | grep -q "access-control-allow-origin"; then
        echo "✅ CORS headers are being sent correctly"
    else
        echo "⚠️ CORS headers not detected in test response"
        echo "Response headers:"
        echo "$response"
    fi

else
    echo "❌ Kong failed to start. Checking logs..."
    docker-compose logs kong | tail -20
fi

echo ""
echo "🎉 CORS fix completed!"
echo "💡 Your app should now work without CORS errors"
echo "🔍 Test by refreshing your browser app"
