#!/bin/bash

# Installation script for DosMundos VPS setup
# Run this script as root on your VPS

set -e

echo "🚀 Starting DosMundos VPS setup..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
apt install -y nginx nodejs npm git ufw fail2ban

# Install PM2 globally for process management
echo "🌲 Installing PM2..."
npm install -g pm2

# Install Node.js 20 (LTS) for better performance
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Nginx
echo "🌐 Setting up Nginx..."
systemctl start nginx
systemctl enable nginx

# Configure firewall
echo "🛡️ Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Create application directory
echo "📁 Creating application directories..."
mkdir -p /var/www/dosmundos
mkdir -p /var/log/dosmundos
mkdir -p /etc/dosmundos

# Create application user
echo "👤 Creating application user..."
useradd -r -s /bin/bash -d /var/www/dosmundos -m dosmundos || true
usermod -aG www-data dosmundos

# Set permissions
echo "🔐 Setting permissions..."
chown -R dosmundos:www-data /var/www/dosmundos
chmod -R 755 /var/www/dosmundos

# Install SSL certificate with Let's Encrypt
echo "🔒 Setting up SSL with Let's Encrypt..."
apt install -y certbot python3-certbot-nginx

# Create Nginx configuration
echo "⚙️ Creating Nginx configuration..."
cat > /etc/nginx/sites-available/dosmundos.pe << EOF
server {
    listen 80;
    server_name dosmundos.pe www.dosmundos.pe;

    root /var/www/dosmundos/dist;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Handle client-side routing (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/dosmundos.pe /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Setup log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/dosmundos << EOF
/var/log/dosmundos/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Create PM2 ecosystem file
echo "🌊 Creating PM2 ecosystem file..."
cat > /etc/dosmundos/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'dosmundos-web',
    cwd: '/var/www/dosmundos',
    script: 'npx',
    args: 'serve -s dist -l 3000',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/dosmundos/error.log',
    out_file: '/var/log/dosmundos/output.log',
    log_file: '/var/log/dosmundos/combined.log',
    time: true
  }]
};
EOF

# Create health check script
echo "🏥 Creating health check script..."
cat > /var/www/dosmundos/health-check.sh << 'EOF'
#!/bin/bash
curl -f http://localhost:3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application is down, restarting..."
    pm2 restart dosmundos-web
    exit 1
fi
EOF

chmod +x /var/www/dosmundos/health-check.sh

# Setup monitoring
echo "📊 Setting up monitoring..."
cat > /etc/cron.d/dosmundos-health-check << EOF
*/5 * * * * root /var/www/dosmundos/health-check.sh >> /var/log/dosmundos/health-check.log 2>&1
EOF

# Setup automatic security updates
echo "🔐 Setting up automatic security updates..."
apt install -y unattended-upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESM:\${distro_codename}";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo "🎉 VPS setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Get SSL certificate: certbot --nginx -d dosmundos.pe -d www.dosmundos.pe"
echo "2. Deploy your application via GitHub Actions"
echo "3. Monitor logs: pm2 logs dosmundos-web"
echo "4. Check status: pm2 status"
echo ""
echo "Make sure to add these secrets to your GitHub repository:"
echo "- VPS_HOST: your-server-ip"
echo "- VPS_USER: root" 
echo "- VPS_SSH_KEY: your-ssh-private-key"
echo "- VPS_PORT: 22"
echo "- VPS_PATH: /var/www/dosmundos/dist"
