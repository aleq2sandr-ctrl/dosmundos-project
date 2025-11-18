#!/bin/bash

# Deployment status check script
# Run this script to verify deployment health

echo "🔍 Checking DosMundos deployment status..."

# Check if website is accessible
echo "🌐 Checking website accessibility..."
if curl -f -s https://dosmundos.pe > /dev/null; then
    echo "✅ Website is accessible at https://dosmundos.pe"
else
    echo "❌ Website is not accessible"
fi

# Check DNS resolution
echo "🔍 Checking DNS resolution..."
if nslookup dosmundos.pe > /dev/null 2>&1; then
    echo "✅ DNS resolution is working"
    nslookup dosmundos.pe | grep "Address:" | tail -n +2
else
    echo "❌ DNS resolution failed"
fi

# Check SSL certificate
echo "🔒 Checking SSL certificate..."
if echo | openssl s_client -servername dosmundos.pe -connect dosmundos.pe:443 2>/dev/null | openssl x509 -noout -dates > /dev/null; then
    echo "✅ SSL certificate is valid"
    echo | openssl s_client -servername dosmundos.pe -connect dosmundos.pe:443 2>/dev/null | openssl x509 -noout -dates
else
    echo "❌ SSL certificate check failed"
fi

# Check VPS services (if running locally)
echo "🖥️ Checking VPS services (if accessible)..."
VPS_IP="72.61.186.175"

# Check if port 22 (SSH) is accessible
if nc -z -w5 $VPS_IP 22 > /dev/null 2>&1; then
    echo "✅ SSH port 22 is accessible on $VPS_IP"
else
    echo "❌ SSH port 22 is not accessible on $VPS_IP"
fi

# Check if port 80 (HTTP) is accessible
if nc -z -w5 $VPS_IP 80 > /dev/null 2>&1; then
    echo "✅ HTTP port 80 is accessible on $VPS_IP"
else
    echo "❌ HTTP port 80 is not accessible on $VPS_IP"
fi

# Check if port 443 (HTTPS) is accessible
if nc -z -w5 $VPS_IP 443 > /dev/null 2>&1; then
    echo "✅ HTTPS port 443 is accessible on $VPS_IP"
else
    echo "❌ HTTPS port 443 is not accessible on $VPS_IP"
fi

# Check GitHub repository
echo "📂 Checking GitHub repository..."
if [ -n "$GITHUB_REPOSITORY" ]; then
    echo "Current repository: $GITHUB_REPOSITORY"
    echo "Latest commit: $(git rev-parse HEAD 2>/dev/null || echo 'Not in git repository')"
else
    echo "GitHub repository not detected in environment"
fi

# Check environment variables
echo "🔧 Checking environment variables..."
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "VITE_API_URL: ${VITE_API_URL:-not set}"

echo ""
echo "📋 Summary:"
echo "1. Ensure DNS records point to $VPS_IP"
echo "2. Verify GitHub Actions workflow is enabled"
echo "3. Check that all secrets are configured in GitHub"
echo "4. Test deployment by pushing to main branch"

echo ""
echo "🆘 If issues found:"
echo "- Check VPS setup: /var/log/dosmundos/"
echo "- Check GitHub Actions logs"
echo "- Verify Nginx configuration: nginx -t"
echo "- Check SSL: certbot certificates"
