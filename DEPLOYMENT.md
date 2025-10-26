# Production Deployment Guide - Ubuntu Server

Complete step-by-step guide to deploy Fushuma Governance Hub to a production Ubuntu server.

## Prerequisites

### Server Requirements
- **OS:** Ubuntu 20.04 LTS or 22.04 LTS
- **RAM:** Minimum 2GB (4GB recommended)
- **CPU:** 2+ cores recommended
- **Storage:** 20GB+ free space
- **Network:** Public IP address with open ports 80, 443

### Required Software
- Node.js 22+
- pnpm 10+
- MySQL 8.0+ or compatible database
- Nginx (for reverse proxy)
- Git

---

## Part 1: Server Preparation

### Step 1: Update System

```bash
# Update package lists
sudo apt-get update

# Upgrade installed packages
sudo apt-get upgrade -y

# Install essential tools
sudo apt-get install -y curl wget git build-essential
```

### Step 2: Install Node.js 22

```bash
# Install Node.js 22 using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version
```

### Step 3: Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm@10.4.1

# Verify installation
pnpm --version  # Should show 10.4.1
```

### Step 4: Install MySQL

```bash
# Install MySQL Server
sudo apt-get install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation
# Follow prompts:
# - Set root password
# - Remove anonymous users: Yes
# - Disallow root login remotely: Yes
# - Remove test database: Yes
# - Reload privilege tables: Yes

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Verify MySQL is running
sudo systemctl status mysql
```

### Step 5: Create Database and User

```bash
# Login to MySQL as root
sudo mysql -u root -p

# In MySQL prompt, run:
```

```sql
-- Create database
CREATE DATABASE fushuma_governance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'your_password' with a strong password)
CREATE USER 'fushuma'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON fushuma_governance.* TO 'fushuma'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

```bash
# Test the new user
mysql -u fushuma -p fushuma_governance
# Enter password when prompted
# Type 'exit' to quit
```

### Step 6: Install Nginx

```bash
# Install Nginx
sudo apt-get install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx

# Test by visiting your server's IP in a browser
# You should see the Nginx welcome page
```

### Step 7: Configure Firewall

```bash
# Install UFW if not already installed
sudo apt-get install -y ufw

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Part 2: Application Deployment

### Step 8: Clone Repository

```bash
# Navigate to web root
cd /var/www

# Clone the repository
sudo git clone https://github.com/Fushuma/fushuma-governance-hub.git

# Change ownership to your user
sudo chown -R $USER:$USER fushuma-governance-hub

# Navigate to project directory
cd fushuma-governance-hub
```

### Step 9: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit the .env file
nano .env
```

**Configure these required variables:**

```env
# Database Configuration
DATABASE_URL=mysql://fushuma:your_password@localhost:3306/fushuma_governance

# Authentication (generate a secure random string for JWT_SECRET)
JWT_SECRET=your-very-long-secure-random-string-at-least-32-characters-long
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application Settings
NODE_ENV=production
PORT=3000
VITE_APP_ID=your-app-id
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://your-domain.com/logo.png

# Owner Configuration
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Owner Name

# Blockchain Configuration
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Storage Configuration (if using S3)
BUILT_IN_FORGE_API_URL=https://forge-api-url
BUILT_IN_FORGE_API_KEY=your-api-key

# Redis Configuration (optional but recommended)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 10: Generate Secure JWT Secret

```bash
# Generate a secure random string for JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and update JWT_SECRET in .env file
nano .env
```

### Step 11: Install Dependencies

```bash
# Install all dependencies
pnpm install --frozen-lockfile

# This may take a few minutes
```

### Step 12: Initialize Database

```bash
# Run the database initialization script
./scripts/init-db.sh

# This will:
# - Test database connection
# - Create tables using Drizzle ORM
# - Optionally seed initial data
```

### Step 13: Build Application

```bash
# Build the application for production
pnpm build

# This will create optimized production files in dist/
# Build should complete successfully (takes ~20 seconds)
```

---

## Part 3: Process Management with PM2

### Step 14: Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### Step 15: Start Application with PM2

```bash
# Start all services (API, indexer, rates)
pnpm start:all

# Check status
pnpm status

# You should see:
# ┌─────┬────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name           │ status  │ restart │ uptime   │
# ├─────┼────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ fushuma-api    │ online  │ 0       │ 0s       │
# │ 1   │ fushuma-indexer│ online  │ 0       │ 0s       │
# │ 2   │ fushuma-rates  │ online  │ 0       │ 0s       │
# └─────┴────────────────┴─────────┴─────────┴──────────┘
```

### Step 16: Configure PM2 Startup

```bash
# Generate startup script
pm2 startup

# Copy and run the command that PM2 outputs
# It will look something like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user

# Save current PM2 process list
pm2 save

# Now PM2 will automatically start your application on server reboot
```

### Step 17: Test Application

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-25T..."}

# View application logs
pm2 logs fushuma-api --lines 50
```

---

## Part 4: Nginx Reverse Proxy Configuration

### Step 18: Configure Nginx

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/fushuma
```

**Paste this configuration (replace `your-domain.com` with your actual domain):**

```nginx
# Upstream backend
upstream fushuma_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Max upload size
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/fushuma-access.log;
    error_log /var/log/nginx/fushuma-error.log;

    # Proxy settings
    location / {
        proxy_pass http://fushuma_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://fushuma_backend/health;
        access_log off;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://fushuma_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 19: Enable Nginx Site

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/fushuma /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Should output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
sudo systemctl reload nginx
```

---

## Part 5: SSL Certificate with Let's Encrypt

### Step 20: Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 21: Obtain SSL Certificate

```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose whether to share email with EFF
# - Certbot will automatically configure Nginx

# Test automatic renewal
sudo certbot renew --dry-run
```

### Step 22: Configure Auto-Renewal

```bash
# Certbot automatically installs a renewal timer
# Verify it's active
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

---

## Part 6: Optional - Redis Installation

### Step 23: Install Redis (Recommended for Rate Limiting)

```bash
# Install Redis
sudo apt-get install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Find and modify these lines:**

```conf
# Set a password (uncomment and set a strong password)
requirepass your-strong-redis-password

# Bind to localhost only
bind 127.0.0.1

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

**Save and exit**

```bash
# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should output: (error) NOAUTH Authentication required.

# Test with password
redis-cli -a your-strong-redis-password ping
# Should output: PONG
```

### Step 24: Update Application Environment

```bash
# Update .env file with Redis configuration
nano .env
```

**Add/update these lines:**

```env
REDIS_URL=redis://:your-strong-redis-password@localhost:6379
REDIS_PASSWORD=your-strong-redis-password
REDIS_DB=0
```

**Save and restart application:**

```bash
pm2 restart all
```

---

## Part 7: Verification and Testing

### Step 25: Verify Deployment

```bash
# 1. Check PM2 processes
pm2 status

# All should show "online"

# 2. Check application logs
pm2 logs fushuma-api --lines 20

# Should show "Server started" message

# 3. Test local health endpoint
curl http://localhost:3000/health

# Should return: {"status":"ok","timestamp":"..."}

# 4. Test through Nginx (replace with your domain)
curl https://your-domain.com/health

# Should return: {"status":"ok","timestamp":"..."}

# 5. Check Nginx status
sudo systemctl status nginx

# Should show "active (running)"

# 6. Check Nginx logs
sudo tail -f /var/log/nginx/fushuma-access.log

# 7. Test in browser
# Visit: https://your-domain.com
# You should see the Fushuma Governance Hub interface
```

### Step 26: Monitor Resources

```bash
# Check system resources
htop

# Check disk space
df -h

# Check memory usage
free -h

# Check network connections
sudo netstat -tlnp | grep -E '(3000|80|443)'
```

---

## Part 8: Maintenance and Monitoring

### Daily Operations

**View Logs:**
```bash
# Application logs
pm2 logs

# Nginx access logs
sudo tail -f /var/log/nginx/fushuma-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/fushuma-error.log

# System logs
sudo journalctl -u nginx -f
```

**Monitor Processes:**
```bash
# PM2 monitoring
pm2 monit

# System monitoring
htop
```

**Restart Services:**
```bash
# Restart application
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx

# Restart MySQL
sudo systemctl restart mysql
```

### Backup Strategy

**Database Backup:**
```bash
# Create backup script
sudo nano /usr/local/bin/backup-fushuma-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u fushuma -p'your_password' fushuma_governance | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-fushuma-db.sh

# Add to crontab for daily backups at 2 AM
crontab -e
```

Add this line:
```
0 2 * * * /usr/local/bin/backup-fushuma-db.sh >> /var/log/fushuma-backup.log 2>&1
```

### Update Application

```bash
# Navigate to project directory
cd /var/www/fushuma-governance-hub

# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install

# Build application
pnpm build

# Restart application
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 50
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs fushuma-api --lines 100

# Common issues:
# 1. Database connection - verify DATABASE_URL in .env
# 2. Port in use - check with: sudo lsof -i :3000
# 3. Missing dependencies - run: pnpm install
```

### 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/fushuma-error.log

# Restart application
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx
```

### Database Connection Errors

```bash
# Test MySQL connection
mysql -u fushuma -p fushuma_governance

# Check MySQL status
sudo systemctl status mysql

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### High Memory Usage

```bash
# Check memory
free -h

# Restart PM2 with memory limit
pm2 restart all --max-memory-restart 500M
```

---

## Security Checklist

- [ ] Strong passwords for database and Redis
- [ ] JWT_SECRET is a secure random string (32+ characters)
- [ ] Firewall (UFW) is enabled and configured
- [ ] SSL certificate is installed and auto-renewal is working
- [ ] Nginx security headers are configured
- [ ] Database user has minimal required privileges
- [ ] Regular backups are scheduled
- [ ] Server is kept up to date (`sudo apt-get update && sudo apt-get upgrade`)
- [ ] SSH key authentication is enabled (password auth disabled)
- [ ] Fail2ban is installed for brute-force protection (optional)

---

## Performance Optimization

### Enable Gzip Compression in Nginx

```bash
sudo nano /etc/nginx/nginx.conf
```

Add in `http` block:
```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

### Configure MySQL for Better Performance

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add/modify:
```ini
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
max_connections = 200
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

---

## Quick Reference Commands

```bash
# Application Management
pm2 status                    # Check status
pm2 logs                      # View logs
pm2 restart all              # Restart all processes
pm2 stop all                 # Stop all processes
pm2 start all                # Start all processes

# Nginx Management
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart Nginx
sudo nginx -t                # Test configuration
sudo tail -f /var/log/nginx/fushuma-error.log  # View errors

# Database Management
mysql -u fushuma -p fushuma_governance  # Connect to database
sudo systemctl status mysql             # Check MySQL status

# System Monitoring
htop                         # CPU/Memory monitor
df -h                        # Disk space
free -h                      # Memory usage
sudo netstat -tlnp          # Network connections

# Updates
cd /var/www/fushuma-governance-hub
git pull origin main
pnpm install
pnpm build
pm2 restart all
```

---

## Support

If you encounter issues:

1. Check logs: `pm2 logs` and `/var/log/nginx/fushuma-error.log`
2. Refer to `DEPLOYMENT_TROUBLESHOOTING.md` in the repository
3. GitHub Issues: https://github.com/Fushuma/fushuma-governance-hub/issues
4. Email: governance@fushuma.com

---

## Congratulations! 🎉

Your Fushuma Governance Hub is now deployed and running in production!

**Access your application at:** `https://your-domain.com`

**Next steps:**
- Configure your domain's DNS to point to your server
- Test all features thoroughly
- Set up monitoring and alerts
- Configure regular backups
- Review security settings

---

**Last Updated:** October 25, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅

