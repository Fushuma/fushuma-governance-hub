# Fushuma Governance Hub - Cloudflare Tunnel Deployment Guide

**Version:** 1.0.0  
**Date:** October 25, 2025  
**Author:** Fushuma Team

## Why Cloudflare Tunnels?

Cloudflare Tunnels provides several advantages:

✅ **No port forwarding required** - No need to open ports 80/443  
✅ **Automatic SSL/TLS** - Free SSL certificates managed by Cloudflare  
✅ **DDoS protection** - Built-in Cloudflare security  
✅ **No firewall configuration** - Only SSH port (22) needs to be open  
✅ **Easy setup** - Simpler than traditional reverse proxy  
✅ **Zero-trust security** - Enhanced security model  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Server Setup](#part-1-server-setup)
3. [Part 2: Cloudflare Setup](#part-2-cloudflare-setup)
4. [Part 3: Smart Contract Deployment](#part-3-smart-contract-deployment)
5. [Part 4: Web Application Deployment](#part-4-web-application-deployment)
6. [Part 5: Cloudflare Tunnel Configuration](#part-5-cloudflare-tunnel-configuration)
7. [Part 6: Post-Deployment](#part-6-post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need

1. **Ubuntu Server** (22.04 LTS or newer)
   - Minimum 4GB RAM, 2 CPU cores
   - SSH access (only port 22 needs to be open)
   - No need for public IP exposure

2. **Cloudflare Account** (Free tier is sufficient)
   - Domain added to Cloudflare
   - DNS managed by Cloudflare

3. **Blockchain Requirements**
   - Wallet with FUMA tokens for gas fees
   - VotingEscrow contract address
   - Clock contract address
   - DAO or multisig address

4. **Optional**
   - WalletConnect Project ID

---

## Part 1: Server Setup

### Step 1.1: Connect to Your Server

```bash
ssh ubuntu@your-server-ip
```

### Step 1.2: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 1.3: Install Essential Tools

```bash
sudo apt install -y git curl wget unzip build-essential
```

### Step 1.4: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 1.5: Install Node.js & pnpm

```bash
# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm@10.4.1

# Verify
node --version
pnpm --version
```

### Step 1.6: Install Foundry (For Smart Contracts)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Reload shell
source ~/.bashrc

# Install Foundry tools
foundryup

# Verify
forge --version
cast --version
```

### Step 1.7: Configure Firewall (Minimal)

With Cloudflare Tunnels, you only need SSH access:

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH only
sudo ufw allow 22/tcp

# Check status
sudo ufw status
```

**Note:** No need to open ports 80 or 443!

---

## Part 2: Cloudflare Setup

### Step 2.1: Add Domain to Cloudflare

If you haven't already:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Add a Site**
3. Enter your domain (e.g., `fushuma.com`)
4. Select the Free plan
5. Update your domain's nameservers to Cloudflare's nameservers
6. Wait for DNS propagation (usually a few minutes)

### Step 2.2: Install Cloudflared on Your Server

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

### Step 2.3: Authenticate Cloudflared

```bash
# Login to Cloudflare
cloudflared tunnel login
```

This will:
1. Open a browser window (or give you a URL to open)
2. Ask you to select your domain
3. Authorize the tunnel

After authorization, a certificate will be saved to `~/.cloudflared/cert.pem`

### Step 2.4: Create a Tunnel

```bash
# Create a new tunnel named "fushuma-governance"
cloudflared tunnel create fushuma-governance

# This will output a Tunnel ID - save this!
# Example output:
# Tunnel credentials written to /home/ubuntu/.cloudflared/TUNNEL_ID.json
# Created tunnel fushuma-governance with id TUNNEL_ID
```

**Important:** Save the Tunnel ID shown in the output!

### Step 2.5: Create Tunnel Configuration

Create the configuration file:

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add the following content (replace `TUNNEL_ID` with your actual tunnel ID):

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/ubuntu/.cloudflared/TUNNEL_ID.json

ingress:
  # Route for your governance hub
  - hostname: governance.fushuma.com
    service: http://localhost:3000
  
  # Catch-all rule (required)
  - service: http_status:404
```

**Replace:**
- `TUNNEL_ID` with your actual tunnel ID
- `governance.fushuma.com` with your actual domain

### Step 2.6: Configure DNS

Route your domain through the tunnel:

```bash
# Create DNS record for your tunnel
cloudflared tunnel route dns fushuma-governance governance.fushuma.com
```

This creates a CNAME record in Cloudflare DNS pointing to your tunnel.

---

## Part 3: Smart Contract Deployment

### Step 3.1: Clone Repository

```bash
cd /var/www
sudo mkdir -p fushuma && sudo chown $USER:$USER fushuma
cd fushuma
git clone https://github.com/Fushuma/fushuma-governance-hub.git
cd fushuma-governance-hub/governance-contracts
```

### Step 3.2: Install Dependencies

```bash
forge install
```

### Step 3.3: Configure Environment

```bash
cp .env.example .env
nano .env
```

Fill in:

```env
PRIVATE_KEY=your_private_key_here
RPC_URL=https://rpc.fushuma.com
CHAIN_ID=121224
DAO_ADDRESS=0x...
ESCROW_ADDRESS=0x...
CLOCK_ADDRESS=0x...
ETHERSCAN_API_KEY=your_api_key
```

### Step 3.4: Deploy Contracts

```bash
source .env

forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### Step 3.5: Save Contract Addresses

The deployed addresses will be in `deployments/governance.json`. Save the `governor` address for the next step.

---

## Part 4: Web Application Deployment

### Step 4.1: Navigate to Project Root

```bash
cd /var/www/fushuma/fushuma-governance-hub
```

### Step 4.2: Configure Environment

```bash
cp .env.example .env
nano .env
```

Configure all variables:

```env
# Database
DATABASE_URL=mysql://fushuma:SECURE_PASSWORD_HERE@mysql:3306/fushuma_governance

# Authentication
JWT_SECRET=GENERATE_A_LONG_RANDOM_STRING_HERE_AT_LEAST_32_CHARS

# Application
NODE_ENV=production
PORT=3000
VITE_APP_ID=fushuma-governance-hub
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://fushuma.com/logo.png

# Owner
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Admin Name

# Blockchain
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com

# Smart Contracts (from Part 3)
VITE_GOVERNOR_CONTRACT_ADDRESS=0x...  # Your deployed governor
VITE_TOKEN_CONTRACT_ADDRESS=0x...
VITE_TREASURY_CONTRACT_ADDRESS=0x...

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your-project-id

# Redis
REDIS_URL=redis://:SECURE_PASSWORD_HERE@redis:6379
REDIS_PASSWORD=SECURE_PASSWORD_HERE

# Storage (Optional)
BUILT_IN_FORGE_API_URL=https://forge-api-url
BUILT_IN_FORGE_API_KEY=your-api-key
```

### Step 4.3: Update Docker Compose (Optional)

Edit `docker-compose.yml` to match your Redis and MySQL passwords:

```bash
nano docker-compose.yml
```

### Step 4.4: Start Application

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 4.5: Initialize Database

```bash
# Push database schema
docker compose exec app pnpm db:push
```

### Step 4.6: Verify Application

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Expected: {"status":"ok","timestamp":"..."}
```

---

## Part 5: Cloudflare Tunnel Configuration

### Step 5.1: Test Tunnel

```bash
# Test the tunnel configuration
cloudflared tunnel --config ~/.cloudflared/config.yml run fushuma-governance
```

If everything works, you should see:
```
INF Connection established
INF Registered tunnel connection
```

Press `Ctrl+C` to stop the test.

### Step 5.2: Install Tunnel as a Service

```bash
# Install cloudflared as a system service
sudo cloudflared service install

# Copy your config to the system location
sudo cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/*.json /etc/cloudflared/

# Start the service
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

### Step 5.3: Verify Tunnel is Running

```bash
# Check tunnel status
cloudflared tunnel list

# Check service status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f
```

### Step 5.4: Test Your Domain

Open your browser and navigate to:

```
https://governance.fushuma.com
```

You should see your Fushuma Governance Hub! 🎉

**Note:** SSL/TLS is automatically handled by Cloudflare - no certificate configuration needed!

---

## Part 6: Post-Deployment

### Step 6.1: Configure Cloudflare Settings (Optional)

In Cloudflare Dashboard:

1. **SSL/TLS Settings**
   - Go to SSL/TLS → Overview
   - Set encryption mode to **Full** or **Full (strict)**

2. **Security Settings**
   - Go to Security → Settings
   - Enable **Browser Integrity Check**
   - Set Security Level to **Medium** or **High**

3. **Speed Settings**
   - Go to Speed → Optimization
   - Enable **Auto Minify** for HTML, CSS, JS
   - Enable **Brotli** compression

4. **Firewall Rules** (Optional)
   - Create rules to block suspicious traffic
   - Rate limiting for API endpoints

### Step 6.2: Grant Smart Contract Roles

```bash
cd /var/www/fushuma/fushuma-governance-hub/governance-contracts
source .env

# Grant council member role
cast send <COUNCIL_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "COUNCIL_MEMBER_ROLE") \
  <MEMBER_ADDRESS> \
  --rpc-url https://rpc.fushuma.com \
  --private-key $PRIVATE_KEY

# Grant executor role
cast send <GOVERNOR_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "EXECUTOR") \
  <EXECUTOR_ADDRESS> \
  --rpc-url https://rpc.fushuma.com \
  --private-key $PRIVATE_KEY
```

### Step 6.3: Set Up Automated Backups

```bash
sudo nano /usr/local/bin/backup-fushuma.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
docker compose exec -T mysql mysqldump -u fushuma -p'your_password' fushuma_governance | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

Make executable and schedule:

```bash
sudo chmod +x /usr/local/bin/backup-fushuma.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-fushuma.sh") | crontab -
```

---

## Troubleshooting

### Issue: Tunnel not connecting

**Solution:**

```bash
# Check cloudflared service
sudo systemctl status cloudflared

# View detailed logs
sudo journalctl -u cloudflared -n 50

# Restart service
sudo systemctl restart cloudflared

# Test manually
cloudflared tunnel --config ~/.cloudflared/config.yml run fushuma-governance
```

### Issue: 502 Bad Gateway

**Solution:**

```bash
# Check if application is running
docker compose ps

# Check application logs
docker compose logs app

# Verify application is listening on port 3000
curl http://localhost:3000/api/health

# Restart application
docker compose restart app
```

### Issue: DNS not resolving

**Solution:**

```bash
# Check DNS record in Cloudflare
cloudflared tunnel route dns fushuma-governance governance.fushuma.com

# Verify in Cloudflare Dashboard:
# - Go to DNS settings
# - Look for CNAME record pointing to your tunnel
```

### Issue: Cloudflared service won't start

**Solution:**

```bash
# Check configuration
sudo cloudflared tunnel --config /etc/cloudflared/config.yml validate

# Check if credentials file exists
ls -la /etc/cloudflared/

# Reinstall service
sudo cloudflared service uninstall
sudo cloudflared service install
```

---

## Maintenance

### Updating the Application

```bash
cd /var/www/fushuma/fushuma-governance-hub

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build

# Run migrations if needed
docker compose exec app pnpm db:push
```

### Managing Cloudflare Tunnel

```bash
# View tunnel status
cloudflared tunnel list

# View tunnel info
cloudflared tunnel info fushuma-governance

# Restart tunnel
sudo systemctl restart cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -f
```

### Monitoring

```bash
# Application logs
docker compose logs -f

# Tunnel logs
sudo journalctl -u cloudflared -f

# System resources
docker stats
```

---

## Advantages of This Setup

✅ **Simplified Security**
- No need to manage SSL certificates
- No exposed ports except SSH
- Cloudflare handles DDoS protection

✅ **Easy Maintenance**
- Automatic SSL renewal
- Simple tunnel configuration
- No reverse proxy to manage

✅ **Better Performance**
- Cloudflare CDN caching
- Global edge network
- Automatic optimization

✅ **Cost Effective**
- Free Cloudflare tier sufficient
- No need for load balancers
- Reduced infrastructure costs

---

## Summary

You've successfully deployed Fushuma Governance Hub with Cloudflare Tunnels! 🎉

**What you have:**
- ✅ Smart contracts deployed on Fushuma Network
- ✅ Web application running with Docker
- ✅ Cloudflare Tunnel providing secure access
- ✅ Automatic SSL/TLS encryption
- ✅ DDoS protection and CDN
- ✅ No exposed ports (except SSH)

**Your application is now live at:**
```
https://governance.fushuma.com
```

## Quick Reference Commands

```bash
# Check application status
docker compose ps

# View application logs
docker compose logs -f

# Check tunnel status
sudo systemctl status cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -f

# Restart application
docker compose restart app

# Restart tunnel
sudo systemctl restart cloudflared

# Update application
git pull && docker compose up -d --build
```

---

**Need help?** Check the [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) for more details or open an issue on GitHub.

