# Complete Deployment Guide with Cloudflare Tunnel

This guide will help you deploy Fushuma Governance Hub using Cloudflare Tunnel - the easiest and most secure deployment method.

## 🎯 What You'll Get

- ✅ **No exposed ports** - No need to open 80/443
- ✅ **Automatic SSL** - Cloudflare handles certificates
- ✅ **DDoS protection** - Built-in Cloudflare security
- ✅ **Easy setup** - No Nginx configuration needed
- ✅ **Zero-trust security** - Traffic goes through Cloudflare

---

## Part 1: Server Preparation (10 minutes)

### Step 1: Connect to Your Server

```bash
# SSH into your Ubuntu server
ssh your-user@your-server-ip
```

### Step 2: Update System and Install Prerequisites

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install essential tools
sudo apt-get install -y curl wget git build-essential
```

### Step 3: Install Node.js 22

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version
```

### Step 4: Install pnpm

```bash
# Install pnpm
npm install -g pnpm@10.4.1

# Verify
pnpm --version  # Should show 10.4.1
```

### Step 5: Install MySQL

```bash
# Install MySQL
sudo apt-get install -y mysql-server

# Secure MySQL (set root password when prompted)
sudo mysql_secure_installation
# Answer:
# - Set root password: Yes (choose a strong password)
# - Remove anonymous users: Yes
# - Disallow root login remotely: Yes
# - Remove test database: Yes
# - Reload privilege tables: Yes

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Step 6: Create Database

```bash
# Login to MySQL
sudo mysql -u root -p
# Enter the root password you just set
```

```sql
-- Create database
CREATE DATABASE fushuma_governance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'YOUR_STRONG_PASSWORD' with a secure password)
CREATE USER 'fushuma'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON fushuma_governance.* TO 'fushuma'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;

-- Exit
EXIT;
```

### Step 7: Test Database Connection

```bash
# Test the new user can connect
mysql -u fushuma -p fushuma_governance
# Enter the password you set above
# Type 'exit' to quit
```

---

## Part 2: Install Cloudflare Tunnel (5 minutes)

### Step 8: Install cloudflared

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

### Step 9: Install Cloudflare Tunnel Service

**You already have the token! Run this command:**

```bash
sudo cloudflared service install eyJhIjoiMmFkNWZhMzhjMGMwY2M0ZmIzNzY0MjY0OWM2MzcxMzQiLCJ0IjoiZDA2YTJlZmMtM2MxNy00NjEwLWI1NTQtYzQ4NDQ3MGEzMTdjIiwicyI6Ik0yWmxNV013WVRBdE9EUXlZeTAwWVRNd0xUbGxaamN0WmpWak1XWTBaREU1TkdNNCJ9
```

This will:
- Install cloudflared as a system service
- Configure it to start automatically on boot
- Connect to your Cloudflare account

### Step 10: Verify Cloudflare Tunnel

```bash
# Check if service is running
sudo systemctl status cloudflared

# Should show "active (running)"
```

---

## Part 3: Deploy Application (15 minutes)

### Step 11: Clone Repository

```bash
# Create directory for web applications
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone https://github.com/Fushuma/fushuma-governance-hub.git

# Change ownership to your user
sudo chown -R $USER:$USER fushuma-governance-hub

# Navigate to project
cd fushuma-governance-hub
```

### Step 12: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Configure these variables (minimum required):**

```env
# Database Configuration
DATABASE_URL=mysql://fushuma:YOUR_STRONG_PASSWORD@localhost:3306/fushuma_governance

# Authentication
# Generate JWT secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-generated-jwt-secret-here
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application Settings
NODE_ENV=production
PORT=3000
VITE_APP_ID=fushuma-governance-hub
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://your-domain.com/logo.png

# Owner Configuration
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Owner Name

# Blockchain Configuration
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com
VITE_GOVERNOR_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_TOKEN_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_TREASURY_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Storage Configuration (optional)
BUILT_IN_FORGE_API_URL=https://forge-api-url
BUILT_IN_FORGE_API_KEY=your-api-key

# Redis Configuration (optional but recommended)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 13: Generate JWT Secret

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and update JWT_SECRET in .env
nano .env
# Update JWT_SECRET with the generated value
```

### Step 14: Install Dependencies

```bash
# Install all dependencies
pnpm install

# This may take 2-3 minutes
```

### Step 15: Initialize Database

```bash
# Run database initialization script
./scripts/init-db.sh

# This will:
# - Test database connection
# - Push database schema
# - Optionally seed initial data
```

### Step 16: Build Application

```bash
# Build for production
pnpm build

# Should complete successfully in ~20 seconds
```

---

## Part 4: Setup PM2 Process Manager (5 minutes)

### Step 17: Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### Step 18: Start Application

```bash
# Start all services (API, indexer, rates)
pnpm start:all

# Check status
pm2 status

# You should see:
# ┌─────┬────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name           │ status  │ restart │ uptime   │
# ├─────┼────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ fushuma-api    │ online  │ 0       │ 0s       │
# │ 1   │ fushuma-indexer│ online  │ 0       │ 0s       │
# │ 2   │ fushuma-rates  │ online  │ 0       │ 0s       │
# └─────┴────────────────┴─────────┴─────────┴──────────┘
```

### Step 19: Configure PM2 Auto-Start

```bash
# Generate startup script
pm2 startup

# PM2 will output a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user

# Copy and run that command
# Then save the PM2 process list
pm2 save
```

### Step 20: Test Application

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-25T..."}

# View logs
pm2 logs --lines 20

# Should show "Server started" message
```

---

## Part 5: Configure Cloudflare Tunnel (10 minutes)

### Step 21: Configure Tunnel Routing

Now you need to configure your Cloudflare Tunnel to route traffic to your application.

**Go to Cloudflare Dashboard:**
1. Visit https://one.dash.cloudflare.com/
2. Select your account
3. Go to **Networks** → **Tunnels**
4. Find your tunnel (it should be connected now)
5. Click **Configure**

### Step 22: Add Public Hostname

In the Cloudflare Tunnel configuration:

1. Click **Public Hostname** tab
2. Click **Add a public hostname**
3. Configure:
   - **Subdomain:** `governance` (or your preferred subdomain)
   - **Domain:** Select your domain (e.g., `fushuma.com`)
   - **Path:** Leave empty
   - **Type:** `HTTP`
   - **URL:** `localhost:3000`

4. Click **Save hostname**

**Your application will now be accessible at:** `https://governance.fushuma.com` (or your chosen subdomain)

### Step 23: Configure Additional Settings (Optional)

In the Cloudflare Tunnel configuration, you can also:

**HTTP Settings:**
- Enable **HTTP/2**
- Set **Connection timeout** to 60 seconds
- Enable **No TLS Verify** if needed

**Access Control (Recommended):**
- Go to **Access** tab
- Set up authentication rules if needed
- Configure allowed email domains or specific users

---

## Part 6: Optional - Install Redis (5 minutes)

Redis improves performance for rate limiting and caching.

### Step 24: Install Redis

```bash
# Install Redis
sudo apt-get install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should output: PONG
```

### Step 25: Configure Redis (Optional - for production)

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf
```

**Find and modify:**
```conf
# Set a password (uncomment and set)
requirepass YOUR_REDIS_PASSWORD

# Bind to localhost only
bind 127.0.0.1
```

**Save and restart:**
```bash
sudo systemctl restart redis-server

# Test with password
redis-cli -a YOUR_REDIS_PASSWORD ping
# Should output: PONG
```

### Step 26: Update Application for Redis

```bash
# Edit .env
nano .env
```

**Update Redis settings:**
```env
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@localhost:6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_DB=0
```

**Restart application:**
```bash
pm2 restart all
```

---

## Part 7: Verification and Testing (5 minutes)

### Step 27: Verify Everything is Working

```bash
# 1. Check PM2 processes
pm2 status
# All should show "online"

# 2. Check application logs
pm2 logs --lines 50
# Should show no errors

# 3. Test local health endpoint
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}

# 4. Check Cloudflare Tunnel status
sudo systemctl status cloudflared
# Should show "active (running)"

# 5. Check system resources
free -h
df -h
```

### Step 28: Test Public Access

**Open your browser and visit:**
- `https://governance.fushuma.com` (or your configured domain)

**You should see:**
- ✅ Fushuma Governance Hub interface
- ✅ HTTPS (green padlock)
- ✅ Fast loading times
- ✅ No certificate warnings

**Test the health endpoint:**
- Visit: `https://governance.fushuma.com/health`
- Should show: `{"status":"ok","timestamp":"..."}`

---

## Part 8: Post-Deployment Configuration

### Step 29: Configure Firewall (Optional but Recommended)

Since you're using Cloudflare Tunnel, you don't need to open ports 80/443, but you should still secure your server:

```bash
# Install UFW
sudo apt-get install -y ufw

# Allow SSH only
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 30: Setup Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-fushuma.sh
```

**Paste this script:**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u fushuma -p'YOUR_DB_PASSWORD' fushuma_governance | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads directory
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/fushuma-governance-hub/uploads

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable and schedule:**
```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-fushuma.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-fushuma.sh >> /var/log/fushuma-backup.log 2>&1
```

---

## Maintenance and Updates

### Update Application

```bash
# Navigate to project directory
cd /var/www/fushuma-governance-hub

# Pull latest changes
git pull origin main

# Install new dependencies
pnpm install

# Build
pnpm build

# Restart
pm2 restart all

# Verify
pm2 status
pm2 logs --lines 50
```

### View Logs

```bash
# Application logs
pm2 logs

# Specific service
pm2 logs fushuma-api

# Cloudflare Tunnel logs
sudo journalctl -u cloudflared -f

# System logs
sudo journalctl -xe
```

### Restart Services

```bash
# Restart application
pm2 restart all

# Restart Cloudflare Tunnel
sudo systemctl restart cloudflared

# Restart MySQL
sudo systemctl restart mysql

# Restart Redis
sudo systemctl restart redis-server
```

### Monitor Resources

```bash
# Real-time monitoring
htop

# Disk space
df -h

# Memory usage
free -h

# Check ports
sudo netstat -tlnp
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs fushuma-api --lines 100

# Common issues:
# 1. Database connection - verify DATABASE_URL in .env
# 2. Port in use - check: sudo lsof -i :3000
# 3. Missing dependencies - run: pnpm install
```

### Cloudflare Tunnel Not Connected

```bash
# Check tunnel status
sudo systemctl status cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -n 50

# Restart tunnel
sudo systemctl restart cloudflared

# Reinstall tunnel (if needed)
sudo cloudflared service uninstall
sudo cloudflared service install YOUR_TOKEN
```

### Database Connection Errors

```bash
# Test database connection
mysql -u fushuma -p fushuma_governance

# Check MySQL status
sudo systemctl status mysql

# View MySQL logs
sudo tail -f /var/log/mysql/error.log

# Restart MySQL
sudo systemctl restart mysql
```

### Can't Access Website

**Check these:**
1. Is PM2 running? `pm2 status`
2. Is Cloudflare Tunnel connected? `sudo systemctl status cloudflared`
3. Is the public hostname configured in Cloudflare dashboard?
4. Check application logs: `pm2 logs`
5. Check tunnel logs: `sudo journalctl -u cloudflared -n 50`

---

## Security Checklist

- [ ] Strong passwords for database and Redis
- [ ] JWT_SECRET is a secure random string (32+ characters)
- [ ] Firewall is configured (only SSH port open)
- [ ] MySQL root login is secured
- [ ] Redis is password-protected
- [ ] Regular backups are scheduled
- [ ] PM2 auto-start is configured
- [ ] Cloudflare Tunnel is running as a service
- [ ] Application is running in production mode (NODE_ENV=production)

---

## Quick Reference Commands

```bash
# Application Management
pm2 status                    # Check status
pm2 logs                      # View logs
pm2 restart all              # Restart all
pm2 stop all                 # Stop all
pm2 start all                # Start all

# Cloudflare Tunnel
sudo systemctl status cloudflared    # Check status
sudo systemctl restart cloudflared   # Restart
sudo journalctl -u cloudflared -f    # View logs

# Database
mysql -u fushuma -p fushuma_governance  # Connect
sudo systemctl status mysql             # Check status
sudo systemctl restart mysql            # Restart

# System Monitoring
htop                         # CPU/Memory
df -h                        # Disk space
free -h                      # Memory
sudo netstat -tlnp          # Ports

# Updates
cd /var/www/fushuma-governance-hub
git pull origin main
pnpm install
pnpm build
pm2 restart all
```

---

## Success! 🎉

Your Fushuma Governance Hub is now deployed with Cloudflare Tunnel!

**Access your application at:** `https://governance.fushuma.com` (or your configured domain)

**Benefits you now have:**
- ✅ Automatic HTTPS with Cloudflare SSL
- ✅ DDoS protection from Cloudflare
- ✅ No exposed ports on your server
- ✅ Automatic failover and load balancing
- ✅ Easy to manage from Cloudflare dashboard
- ✅ Zero-trust security model

**Next steps:**
1. Test all features thoroughly
2. Configure Cloudflare Access rules (optional)
3. Set up monitoring and alerts
4. Configure custom domain settings in Cloudflare
5. Enable Cloudflare features (caching, WAF, etc.)

---

**Deployment Time:** ~45 minutes  
**Difficulty:** Easy  
**Status:** Production Ready with Cloudflare Tunnel ✅

