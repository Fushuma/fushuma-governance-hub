# Fushuma Governance Hub: Production Deployment Guide

**Version:** 1.0.0  
**Date:** October 25, 2025  
**Author:** Fushuma Team

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Part 1: Server Setup](#part-1-server-setup)
4. [Part 2: Smart Contract Deployment](#part-2-smart-contract-deployment)
5. [Part 3: Web Application Deployment](#part-3-web-application-deployment)
6. [Part 4: SSL/TLS Configuration](#part-4-ssltls-configuration)
7. [Part 5: Post-Deployment](#part-5-post-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## Introduction

This guide provides complete step-by-step instructions for deploying the Fushuma Governance Hub to production on an Ubuntu server. The deployment includes both on-chain smart contracts and the off-chain web application.

### Architecture Overview

The Fushuma Governance Hub consists of:

- **Smart Contracts**: Solidity contracts for on-chain governance with veNFT voting
- **Web Application**: React + TypeScript frontend with Express backend
- **Database**: MySQL for off-chain data storage
- **Cache**: Redis for performance optimization

### Deployment Methods

This guide covers two deployment approaches:

1. **Docker Deployment** (Recommended): Containerized deployment with Docker Compose
2. **PM2 Deployment**: Direct deployment using PM2 process manager

---

## Prerequisites

Before starting, ensure you have:

### Server Requirements

- **Operating System**: Ubuntu 22.04 LTS or newer
- **CPU**: Minimum 2 cores (4+ recommended)
- **RAM**: Minimum 4GB (8GB+ recommended)
- **Storage**: Minimum 50GB SSD
- **Network**: Public IP address with ports 80, 443, and 22 accessible

### Domain & DNS

- A registered domain name (e.g., `governance.fushuma.com`)
- DNS A record pointing to your server's IP address

### Accounts & Access

- GitHub account with access to the repository
- SSH access to your Ubuntu server
- Wallet with FUMA tokens for smart contract deployment
- (Optional) WalletConnect Project ID for wallet integration

---

## Part 1: Server Setup

### Step 1.1: Connect to Your Server

```bash
ssh ubuntu@your-server-ip
```

### Step 1.2: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 1.3: Install Essential Tools

```bash
sudo apt install -y git curl wget unzip build-essential
```

### Step 1.4: Install Docker & Docker Compose

For Docker-based deployment:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 1.5: Install Node.js & pnpm

For PM2-based deployment or local development:

```bash
# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm globally
sudo npm install -g pnpm@10.4.1

# Verify installation
node --version
pnpm --version
```

### Step 1.6: Install PM2 (For PM2 Deployment)

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Step 1.7: Install Foundry (For Smart Contracts)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Reload shell configuration
source ~/.bashrc

# Install Foundry tools
foundryup

# Verify installation
forge --version
cast --version
```

### Step 1.8: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

---

## Part 2: Smart Contract Deployment

### Step 2.1: Clone the Repository

```bash
cd /var/www
sudo mkdir -p fushuma
sudo chown $USER:$USER fushuma
cd fushuma

git clone https://github.com/Fushuma/fushuma-governance-hub.git
cd fushuma-governance-hub/governance-contracts
```

### Step 2.2: Install Contract Dependencies

```bash
# Install Foundry dependencies
forge install
```

### Step 2.3: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file
nano .env
```

Fill in the following values:

```env
# Your deployer wallet private key (KEEP THIS SECRET!)
PRIVATE_KEY=your_private_key_here

# Fushuma Network RPC
RPC_URL=https://rpc.fushuma.com

# Chain ID
CHAIN_ID=121224

# Contract addresses (you need to deploy these first or get existing addresses)
DAO_ADDRESS=0x0000000000000000000000000000000000000000
ESCROW_ADDRESS=0x0000000000000000000000000000000000000000
CLOCK_ADDRESS=0x0000000000000000000000000000000000000000

# Fumascan API key for contract verification
ETHERSCAN_API_KEY=your_fumascan_api_key
```

**Important Notes:**

- You need to deploy or obtain the `VotingEscrowIncreasing`, `Clock`, and DAO contracts before deploying the governance contracts
- Keep your `PRIVATE_KEY` secure and never commit it to version control
- Ensure your wallet has sufficient FUMA tokens for gas fees

### Step 2.4: Test Contracts (Optional but Recommended)

```bash
# Run tests
forge test

# Run tests with verbosity
forge test -vvv

# Check gas usage
forge test --gas-report
```

### Step 2.5: Deploy Smart Contracts

```bash
# Load environment variables
source .env

# Deploy contracts to Fushuma Network
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Alternative: Deploy without verification (verify later)
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Step 2.6: Save Deployment Addresses

After successful deployment, the contract addresses will be saved in `deployments/governance.json`:

```json
{
  "council": "0x...",
  "governor": "0x...",
  "network": "fushuma",
  "chainId": 121224,
  "timestamp": 1234567890
}
```

**Save these addresses!** You'll need the `governor` address for the web application configuration.

### Step 2.7: Verify Contracts on Fumascan (If Not Done Automatically)

```bash
# Verify FushumaGovernor
forge verify-contract \
  --chain-id 121224 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.22 \
  <GOVERNOR_ADDRESS> \
  src/FushumaGovernor.sol:FushumaGovernor \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Verify GovernanceCouncil
forge verify-contract \
  --chain-id 121224 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.22 \
  <COUNCIL_ADDRESS> \
  src/GovernanceCouncil.sol:GovernanceCouncil \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## Part 3: Web Application Deployment

### Option A: Docker Deployment (Recommended)

#### Step 3A.1: Navigate to Project Directory

```bash
cd /var/www/fushuma/fushuma-governance-hub
```

#### Step 3A.2: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

Configure all required variables:

```env
# Database Configuration
DATABASE_URL=mysql://fushuma:CHANGE_THIS_PASSWORD@mysql:3306/fushuma_governance

# Authentication
JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARACTERS

# Application
NODE_ENV=production
PORT=3000
VITE_APP_ID=fushuma-governance-hub
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://fushuma.com/logo.png

# Owner (Admin User)
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Admin Name

# Blockchain Configuration
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com

# Smart Contract Addresses (from Part 2)
VITE_GOVERNOR_CONTRACT_ADDRESS=0x... # Your deployed governor address
VITE_TOKEN_CONTRACT_ADDRESS=0x... # Your FUMA token address
VITE_TREASURY_CONTRACT_ADDRESS=0x... # Your treasury address

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Redis Configuration
REDIS_URL=redis://:CHANGE_THIS_PASSWORD@redis:6379
REDIS_PASSWORD=CHANGE_THIS_PASSWORD

# Storage (Optional)
BUILT_IN_FORGE_API_URL=https://forge-api-url
BUILT_IN_FORGE_API_KEY=your-api-key

# Analytics (Optional)
VITE_ANALYTICS_ENDPOINT=https://analytics-endpoint
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

#### Step 3A.3: Configure Docker Compose

Edit `docker-compose.yml` if needed to customize database passwords:

```bash
nano docker-compose.yml
```

Update the MySQL and Redis passwords to match your `.env` file.

#### Step 3A.4: Build and Start Containers

```bash
# Build and start all services
docker compose up -d --build

# Check container status
docker compose ps

# View logs
docker compose logs -f
```

#### Step 3A.5: Initialize Database

```bash
# Push database schema
docker compose exec app pnpm db:push

# (Optional) Seed initial data if you have a seed script
# docker compose exec app npx tsx seed-data.ts
```

#### Step 3A.6: Verify Application is Running

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Expected response: {"status":"ok","timestamp":"..."}
```

### Option B: PM2 Deployment

#### Step 3B.1: Navigate to Project Directory

```bash
cd /var/www/fushuma/fushuma-governance-hub
```

#### Step 3B.2: Install Dependencies

```bash
pnpm install --frozen-lockfile
```

#### Step 3B.3: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

Configure the same variables as in Option A, but adjust the database and Redis URLs for your local setup:

```env
# For local MySQL
DATABASE_URL=mysql://fushuma:password@localhost:3306/fushuma_governance

# For local Redis
REDIS_URL=redis://localhost:6379
```

#### Step 3B.4: Set Up MySQL Database

```bash
# Install MySQL if not already installed
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

In MySQL prompt:

```sql
CREATE DATABASE fushuma_governance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fushuma'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON fushuma_governance.* TO 'fushuma'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Step 3B.5: Set Up Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis (optional: set password)
sudo nano /etc/redis/redis.conf

# Find and uncomment/set:
# requirepass your_secure_password

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

#### Step 3B.6: Build Application

```bash
pnpm build
```

#### Step 3B.7: Initialize Database

```bash
pnpm db:push
```

#### Step 3B.8: Start Application with PM2

```bash
# Start all services
pnpm start:all

# Check status
pm2 status

# View logs
pm2 logs

# Save PM2 configuration
pm2 save

# Configure PM2 to start on boot
pm2 startup
# Follow the instructions from the output
```

---

## Part 4: SSL/TLS Configuration

### Step 4.1: Install Nginx

```bash
sudo apt install -y nginx
```

### Step 4.2: Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Step 4.3: Configure Nginx

```bash
# Copy the provided Nginx configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/fushuma-governance-hub

# Update the server_name in the configuration
sudo nano /etc/nginx/sites-available/fushuma-governance-hub
```

Change `governance.fushuma.com` to your actual domain.

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/fushuma-governance-hub /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 4.4: Obtain SSL Certificate

```bash
# Obtain certificate from Let's Encrypt
sudo certbot --nginx -d governance.fushuma.com

# Follow the prompts:
# - Enter your email
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)
```

### Step 4.5: Test Auto-Renewal

```bash
# Test certificate renewal
sudo certbot renew --dry-run
```

The certificate will automatically renew before expiration.

---

## Part 5: Post-Deployment

### Step 5.1: Verify Deployment

```bash
# Check application health
curl https://governance.fushuma.com/api/health

# Check if the frontend loads
curl -I https://governance.fushuma.com
```

### Step 5.2: Configure Smart Contract Roles

After deployment, grant necessary roles to addresses:

```bash
# Using cast (Foundry)
cd /var/www/fushuma/fushuma-governance-hub/governance-contracts

# Grant COUNCIL_MEMBER_ROLE to council members
cast send <COUNCIL_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "COUNCIL_MEMBER_ROLE") \
  <MEMBER_ADDRESS> \
  --rpc-url https://rpc.fushuma.com \
  --private-key $PRIVATE_KEY

# Grant EXECUTOR_ROLE
cast send <GOVERNOR_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "EXECUTOR") \
  <EXECUTOR_ADDRESS> \
  --rpc-url https://rpc.fushuma.com \
  --private-key $PRIVATE_KEY

# Transfer admin to DAO (for decentralization)
cast send <GOVERNOR_ADDRESS> \
  "grantRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  <DAO_ADDRESS> \
  --rpc-url https://rpc.fushuma.com \
  --private-key $PRIVATE_KEY
```

### Step 5.3: Set Up Monitoring

#### For Docker Deployment:

```bash
# View container logs
docker compose logs -f

# Check container resource usage
docker stats
```

#### For PM2 Deployment:

```bash
# View PM2 logs
pm2 logs

# Monitor PM2 processes
pm2 monit

# View PM2 dashboard
pm2 plus
```

### Step 5.4: Configure Automated Backups

Create a backup script:

```bash
sudo nano /usr/local/bin/backup-fushuma.sh
```

Add the following content:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
docker compose exec -T mysql mysqldump -u fushuma -p'your_password' fushuma_governance | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Or for PM2 deployment:
# mysqldump -u fushuma -p'your_password' fushuma_governance | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

Make it executable and schedule:

```bash
sudo chmod +x /usr/local/bin/backup-fushuma.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-fushuma.sh") | crontab -
```

---

## Troubleshooting

### Issue: Docker containers won't start

**Solution:**

```bash
# Check logs
docker compose logs

# Rebuild containers
docker compose down
docker compose up -d --build
```

### Issue: Database connection failed

**Solution:**

```bash
# For Docker: Check if MySQL container is running
docker compose ps

# For PM2: Check if MySQL service is running
sudo systemctl status mysql

# Verify DATABASE_URL in .env file
```

### Issue: Application shows "502 Bad Gateway"

**Solution:**

```bash
# Check if application is running
docker compose ps  # For Docker
pm2 status         # For PM2

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify Nginx configuration
sudo nginx -t
```

### Issue: Smart contract deployment fails

**Solution:**

```bash
# Check wallet balance
cast balance <YOUR_WALLET_ADDRESS> --rpc-url https://rpc.fushuma.com

# Verify RPC connection
cast block-number --rpc-url https://rpc.fushuma.com

# Check if environment variables are loaded
source .env
echo $PRIVATE_KEY  # Should not be empty
```

### Issue: SSL certificate not working

**Solution:**

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx configuration
sudo nginx -t
```

---

## Maintenance

### Updating the Application

#### For Docker Deployment:

```bash
cd /var/www/fushuma/fushuma-governance-hub

# Pull latest code
git pull origin main

# Rebuild and restart containers
docker compose down
docker compose up -d --build

# Run database migrations if needed
docker compose exec app pnpm db:push
```

#### For PM2 Deployment:

```bash
cd /var/www/fushuma/fushuma-governance-hub

# Pull latest code
git pull origin main

# Install new dependencies
pnpm install --frozen-lockfile

# Build application
pnpm build

# Run database migrations if needed
pnpm db:push

# Reload PM2 processes (zero downtime)
pm2 reload ecosystem.config.js
```

### Monitoring Logs

```bash
# Docker logs
docker compose logs -f app

# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/fushuma-access.log
sudo tail -f /var/log/nginx/fushuma-error.log
```

### Security Updates

```bash
# Update system packages regularly
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d

# Update Node.js packages
pnpm update
```

---

## Summary

You have successfully deployed the Fushuma Governance Hub! Your deployment includes:

✅ Smart contracts deployed on Fushuma Network  
✅ Web application running with Docker or PM2  
✅ SSL/TLS encryption with Let's Encrypt  
✅ Nginx reverse proxy configured  
✅ Database and Redis set up  
✅ Automated backups configured  

### Next Steps

1. Test the governance features thoroughly
2. Set up monitoring and alerting
3. Configure additional security measures
4. Announce the launch to your community

### Support

- **GitHub**: https://github.com/Fushuma/fushuma-governance-hub
- **Documentation**: See README.md for detailed information
- **Email**: governance@fushuma.com

---

**Congratulations on your deployment! 🎉**

