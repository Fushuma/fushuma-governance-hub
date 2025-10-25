#!/bin/bash

#############################################################################
# Fushuma Governance Hub - Simplified Deployment Script
# Version: 1.0.0
# 
# This script deploys the governance hub WITHOUT requiring:
# - DAO contract (uses your wallet address)
# - VotingEscrow contract (uses placeholder)
# - Clock contract (uses placeholder)
# - OAuth/OpenID (skipped)
#
# Perfect for quick testing and getting started!
#
# Usage: sudo bash deploy-simple.sh
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Fushuma Governance Hub - Simplified Deployment         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use: sudo bash deploy-simple.sh)"
    exit 1
fi

log_info "Starting simplified deployment process..."

#############################################################################
# STEP 1: Collect Required Information
#############################################################################

echo ""
log_info "=== STEP 1: Configuration ==="
echo ""

# Pre-configured values
DAO_ADDRESS="0xC09ae6b9dcC5d5F66b4e3E30804677B224f2436F"
log_info "Using multisig address as DAO: $DAO_ADDRESS"

# Domain configuration
read -p "Enter your domain for the governance hub (e.g., governance.fushuma.com): " DOMAIN

# Wallet private key
echo ""
log_info "Wallet Configuration"
echo "You need your wallet private key to deploy the smart contracts."
echo "This will be stored securely in .env files (not committed to git)."
echo ""
read -sp "Enter your wallet private key (hidden): " PRIVATE_KEY
echo ""

# Application configuration
echo ""
log_info "Application Configuration"
echo ""
read -p "Enter database password (will be created): " DB_PASSWORD
read -p "Enter Redis password (will be created): " REDIS_PASSWORD

# Auto-generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
log_info "Auto-generated JWT secret"

# WalletConnect (optional)
echo ""
log_info "WalletConnect Configuration (Optional)"
echo "Get a free Project ID from: https://cloud.walletconnect.com"
read -p "Enter WalletConnect Project ID (or press Enter to skip): " WALLETCONNECT_ID

if [ -z "$WALLETCONNECT_ID" ]; then
    WALLETCONNECT_ID="placeholder-walletconnect-id"
    log_warning "Using placeholder WalletConnect ID. Wallet connection may not work until you add a real one."
fi

#############################################################################
# STEP 2: System Update and Prerequisites
#############################################################################

echo ""
log_info "=== STEP 2: Installing Prerequisites ==="
echo ""

log_info "Updating system packages..."
apt update -qq && apt upgrade -y -qq

log_info "Installing essential tools..."
apt install -y -qq git curl wget unzip build-essential jq

#############################################################################
# STEP 3: Install Docker
#############################################################################

log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    log_success "Docker installed"
else
    log_success "Docker already installed"
fi

# Install Docker Compose
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
    log_success "Docker Compose installed"
else
    log_success "Docker Compose already installed"
fi

#############################################################################
# STEP 4: Install Node.js and pnpm
#############################################################################

log_info "Installing Node.js 22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    log_success "Node.js installed"
else
    log_success "Node.js already installed"
fi

log_info "Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm@10.4.1
    log_success "pnpm installed"
else
    log_success "pnpm already installed"
fi

#############################################################################
# STEP 5: Install Foundry
#############################################################################

log_info "Installing Foundry..."
if ! command -v forge &> /dev/null; then
    curl -L https://foundry.paradigm.xyz | bash
    export PATH="$HOME/.foundry/bin:$PATH"
    
    # Add to bashrc for persistence
    if ! grep -q "foundry/bin" ~/.bashrc; then
        echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> ~/.bashrc
    fi
    
    source ~/.bashrc
    foundryup
    log_success "Foundry installed"
else
    log_success "Foundry already installed"
fi

#############################################################################
# STEP 6: Install Cloudflared
#############################################################################

log_info "Installing Cloudflared..."
if ! command -v cloudflared &> /dev/null; then
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
    log_success "Cloudflared installed"
else
    log_success "Cloudflared already installed"
fi

#############################################################################
# STEP 7: Clone Repository
#############################################################################

echo ""
log_info "=== STEP 3: Cloning Repository ==="
echo ""

INSTALL_DIR="/var/www/fushuma"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

if [ -d "fushuma-governance-hub" ]; then
    log_warning "Repository already exists, pulling latest changes..."
    cd fushuma-governance-hub
    git pull origin main
else
    log_info "Cloning repository..."
    git clone https://github.com/Fushuma/fushuma-governance-hub.git
    cd fushuma-governance-hub
fi

log_success "Repository ready at $INSTALL_DIR/fushuma-governance-hub"

#############################################################################
# STEP 8: Deploy Smart Contracts (Simplified)
#############################################################################

echo ""
log_info "=== STEP 4: Deploying Smart Contracts ==="
echo ""

cd governance-contracts

log_info "Installing contract dependencies..."
forge install --no-commit

# Create placeholder addresses for VotingEscrow and Clock
ESCROW_ADDRESS="0x0000000000000000000000000000000000000001"
CLOCK_ADDRESS="0x0000000000000000000000000000000000000002"

log_info "Creating .env file for contracts..."
cat > .env << EOF
PRIVATE_KEY=$PRIVATE_KEY
RPC_URL=https://rpc.fushuma.com
CHAIN_ID=121224
DAO_ADDRESS=$DAO_ADDRESS
ESCROW_ADDRESS=$ESCROW_ADDRESS
CLOCK_ADDRESS=$CLOCK_ADDRESS
ETHERSCAN_API_KEY=
EOF

log_info "Deploying governance contracts..."
log_warning "Note: Using placeholder addresses for VotingEscrow and Clock"
log_warning "You can update these later when you deploy the real contracts"

source .env

if forge script script/DeployGovernance.s.sol:DeployGovernance \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast; then
    log_success "Smart contracts deployed successfully!"
    
    # Extract governor address
    if [ -f "deployments/governance.json" ]; then
        GOVERNOR_ADDRESS=$(jq -r '.governor' deployments/governance.json)
        COUNCIL_ADDRESS=$(jq -r '.council' deployments/governance.json)
        log_success "Governor deployed at: $GOVERNOR_ADDRESS"
        log_success "Council deployed at: $COUNCIL_ADDRESS"
    else
        log_warning "Could not find deployment file. Checking broadcast logs..."
        # Try to find the address in broadcast logs
        BROADCAST_FILE=$(find broadcast -name "*.json" -type f | head -1)
        if [ -f "$BROADCAST_FILE" ]; then
            GOVERNOR_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "FushumaGovernor") | .contractAddress' "$BROADCAST_FILE" | head -1)
            COUNCIL_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "GovernanceCouncil") | .contractAddress' "$BROADCAST_FILE" | head -1)
            
            if [ -n "$GOVERNOR_ADDRESS" ] && [ "$GOVERNOR_ADDRESS" != "null" ]; then
                log_success "Governor deployed at: $GOVERNOR_ADDRESS"
                log_success "Council deployed at: $COUNCIL_ADDRESS"
            else
                log_warning "Could not extract addresses automatically"
                read -p "Enter the deployed Governor address: " GOVERNOR_ADDRESS
                read -p "Enter the deployed Council address: " COUNCIL_ADDRESS
            fi
        else
            read -p "Enter the deployed Governor address: " GOVERNOR_ADDRESS
            read -p "Enter the deployed Council address: " COUNCIL_ADDRESS
        fi
    fi
else
    log_error "Smart contract deployment failed!"
    log_info "This might be because:"
    log_info "  - Insufficient FUMA for gas fees"
    log_info "  - Network connectivity issues"
    log_info "  - Incorrect private key"
    echo ""
    read -p "Do you want to continue without smart contracts? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        log_error "Deployment aborted"
        exit 1
    fi
    GOVERNOR_ADDRESS="0x0000000000000000000000000000000000000000"
    COUNCIL_ADDRESS="0x0000000000000000000000000000000000000000"
    log_warning "Using placeholder contract addresses"
fi

#############################################################################
# STEP 9: Configure Web Application
#############################################################################

echo ""
log_info "=== STEP 5: Configuring Web Application ==="
echo ""

cd $INSTALL_DIR/fushuma-governance-hub

log_info "Creating .env file for web application..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=mysql://fushuma:${DB_PASSWORD}@mysql:3306/fushuma_governance

# Authentication
JWT_SECRET=${JWT_SECRET}

# Application Settings
NODE_ENV=production
PORT=3000
VITE_APP_ID=fushuma-governance-hub
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://fushuma.com/logo.png

# Owner Configuration (Simplified)
OWNER_OPEN_ID=admin-001
OWNER_NAME=Fushuma Admin

# Blockchain Configuration
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com

# Smart Contract Addresses
VITE_GOVERNOR_CONTRACT_ADDRESS=${GOVERNOR_ADDRESS}
VITE_TOKEN_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_TREASURY_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=${WALLETCONNECT_ID}

# Redis Configuration
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

log_success "Environment configured"

#############################################################################
# STEP 10: Start Application with Docker
#############################################################################

echo ""
log_info "=== STEP 6: Starting Application ==="
echo ""

log_info "Building and starting Docker containers..."
docker compose up -d --build

log_info "Waiting for services to start..."
sleep 15

log_info "Initializing database..."
docker compose exec -T app pnpm db:push

log_info "Checking application health..."
sleep 5
if curl -f http://localhost:3000/api/health &> /dev/null; then
    log_success "Application is running!"
else
    log_warning "Application may not be fully started yet."
    log_info "Check status with: docker compose logs -f"
fi

#############################################################################
# STEP 11: Configure Cloudflare Tunnel
#############################################################################

echo ""
log_info "=== STEP 7: Setting Up Cloudflare Tunnel ==="
echo ""

echo ""
log_info "To complete the deployment, set up Cloudflare Tunnel:"
echo ""
echo -e "${YELLOW}Run these commands:${NC}"
echo ""
echo "1. Login to Cloudflare:"
echo "   ${GREEN}cloudflared tunnel login${NC}"
echo ""
echo "2. Create a tunnel:"
echo "   ${GREEN}cloudflared tunnel create fushuma-governance${NC}"
echo ""
echo "3. Note the Tunnel ID, then create config file:"
echo "   ${GREEN}mkdir -p ~/.cloudflared${NC}"
echo "   ${GREEN}nano ~/.cloudflared/config.yml${NC}"
echo ""
echo "   Add this content (replace YOUR_TUNNEL_ID):"
echo ""
cat << 'CONFIGEOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: YOUR_DOMAIN
    service: http://localhost:3000
  - service: http_status:404
CONFIGEOF
echo ""
echo "   Replace YOUR_DOMAIN with: ${GREEN}$DOMAIN${NC}"
echo ""
echo "4. Route DNS:"
echo "   ${GREEN}cloudflared tunnel route dns fushuma-governance $DOMAIN${NC}"
echo ""
echo "5. Install and start as service:"
echo "   ${GREEN}cloudflared service install${NC}"
echo "   ${GREEN}cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml${NC}"
echo "   ${GREEN}cp ~/.cloudflared/*.json /etc/cloudflared/${NC}"
echo "   ${GREEN}systemctl start cloudflared${NC}"
echo "   ${GREEN}systemctl enable cloudflared${NC}"
echo ""

#############################################################################
# STEP 12: Setup Automated Backups
#############################################################################

echo ""
log_info "=== STEP 8: Setting Up Automated Backups ==="
echo ""

log_info "Creating backup script..."
cat > /usr/local/bin/backup-fushuma.sh << BACKUPEOF
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR

# Database backup
cd /var/www/fushuma/fushuma-governance-hub
docker compose exec -T mysql mysqldump -u fushuma -p'$DB_PASSWORD' fushuma_governance | gzip > \$BACKUP_DIR/db_\$DATE.sql.gz

# Keep only last 7 days
find \$BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: \$BACKUP_DIR/db_\$DATE.sql.gz"
BACKUPEOF

chmod +x /usr/local/bin/backup-fushuma.sh

log_info "Scheduling daily backups at 2 AM..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-fushuma.sh") | crontab -

log_success "Automated backups configured"

#############################################################################
# DEPLOYMENT COMPLETE
#############################################################################

echo ""
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🎉  DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
log_success "Fushuma Governance Hub is now deployed!"
echo ""
log_info "=== Deployment Summary ==="
echo ""
echo "📍 Installation Directory: $INSTALL_DIR/fushuma-governance-hub"
echo "🔗 Application URL (after Cloudflare setup): https://$DOMAIN"
echo "📜 Governor Contract: $GOVERNOR_ADDRESS"
echo "👥 Council Contract: $COUNCIL_ADDRESS"
echo "👤 DAO Address (Multisig): $DAO_ADDRESS"
echo ""
log_info "=== Important Notes ==="
echo ""
log_warning "This is a simplified deployment using:"
echo "  - Your multisig address as DAO"
echo "  - Placeholder VotingEscrow contract"
echo "  - Placeholder Clock contract"
echo ""
echo "To enable full governance features, you'll need to:"
echo "  1. Deploy VotingEscrow contract for token locking"
echo "  2. Deploy Clock contract for time tracking"
echo "  3. Update the contract addresses in .env"
echo "  4. Redeploy the governance contracts with real addresses"
echo ""
log_info "=== Useful Commands ==="
echo ""
echo "Check application status:"
echo "  cd $INSTALL_DIR/fushuma-governance-hub"
echo "  docker compose ps"
echo ""
echo "View application logs:"
echo "  docker compose logs -f"
echo ""
echo "Check Cloudflare Tunnel:"
echo "  systemctl status cloudflared"
echo ""
echo "Restart application:"
echo "  docker compose restart app"
echo ""
echo "Run manual backup:"
echo "  /usr/local/bin/backup-fushuma.sh"
echo ""
log_info "=== Next Steps ==="
echo ""
echo "1. Complete Cloudflare Tunnel setup (see instructions above)"
echo "2. Visit https://$DOMAIN to access your governance hub"
echo "3. Test the application"
echo "4. (Optional) Deploy real VotingEscrow and Clock contracts"
echo ""
log_success "Deployment script completed!"
echo ""

