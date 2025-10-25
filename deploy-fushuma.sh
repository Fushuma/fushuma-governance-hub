#!/bin/bash

#############################################################################
# Fushuma Governance Hub - Automated Deployment Script
# Version: 1.0.0
# 
# This script automates the complete deployment of:
# - Smart contracts (Foundry)
# - Web application (Docker)
# - Cloudflare Tunnel
#
# Usage: sudo bash deploy-fushuma.sh
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
║     Fushuma Governance Hub - Automated Deployment        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use: sudo bash deploy-fushuma.sh)"
    exit 1
fi

log_info "Starting deployment process..."

#############################################################################
# STEP 1: Collect Required Information
#############################################################################

echo ""
log_info "=== STEP 1: Configuration ==="
echo ""

# Domain configuration
read -p "Enter your domain for the governance hub (e.g., governance.fushuma.com): " DOMAIN
read -p "Enter your Cloudflare email: " CF_EMAIL

# Smart contract configuration
echo ""
log_info "Smart Contract Configuration"
echo "You will need:"
echo "  - Deployer wallet private key (with FUMA for gas)"
echo "  - DAO address"
echo "  - VotingEscrow contract address"
echo "  - Clock contract address"
echo ""
read -p "Do you have all these addresses ready? (yes/no): " HAS_CONTRACTS

if [ "$HAS_CONTRACTS" != "yes" ]; then
    log_warning "Please prepare the required contract addresses before continuing."
    log_info "You can run this script again when ready."
    exit 0
fi

read -sp "Enter your wallet private key (hidden): " PRIVATE_KEY
echo ""
read -p "Enter DAO address: " DAO_ADDRESS
read -p "Enter VotingEscrow contract address: " ESCROW_ADDRESS
read -p "Enter Clock contract address: " CLOCK_ADDRESS
read -p "Enter Fumascan API key (optional, press Enter to skip): " ETHERSCAN_API_KEY

# Application configuration
echo ""
log_info "Application Configuration"
read -p "Enter database password (will be created): " DB_PASSWORD
read -p "Enter Redis password (will be created): " REDIS_PASSWORD
read -p "Enter JWT secret (min 32 chars, or press Enter to auto-generate): " JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    log_info "Generated JWT secret: $JWT_SECRET"
fi

read -p "Enter WalletConnect Project ID (get from https://cloud.walletconnect.com): " WALLETCONNECT_ID
read -p "Enter admin/owner name: " OWNER_NAME
read -p "Enter admin/owner OpenID: " OWNER_OPEN_ID

# Optional services
read -p "Enter storage API URL (optional, press Enter to skip): " STORAGE_API_URL
read -p "Enter storage API key (optional, press Enter to skip): " STORAGE_API_KEY

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
    # Install as root
    curl -L https://foundry.paradigm.xyz | bash
    export PATH="$HOME/.foundry/bin:$PATH"
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
# STEP 8: Deploy Smart Contracts
#############################################################################

echo ""
log_info "=== STEP 4: Deploying Smart Contracts ==="
echo ""

cd governance-contracts

log_info "Installing contract dependencies..."
forge install --no-commit

log_info "Creating .env file for contracts..."
cat > .env << EOF
PRIVATE_KEY=$PRIVATE_KEY
RPC_URL=https://rpc.fushuma.com
CHAIN_ID=121224
DAO_ADDRESS=$DAO_ADDRESS
ESCROW_ADDRESS=$ESCROW_ADDRESS
CLOCK_ADDRESS=$CLOCK_ADDRESS
ETHERSCAN_API_KEY=$ETHERSCAN_API_KEY
EOF

log_info "Deploying governance contracts..."
source .env

if forge script script/DeployGovernance.s.sol:DeployGovernance \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify; then
    log_success "Smart contracts deployed successfully!"
    
    # Extract governor address
    if [ -f "deployments/governance.json" ]; then
        GOVERNOR_ADDRESS=$(jq -r '.governor' deployments/governance.json)
        COUNCIL_ADDRESS=$(jq -r '.council' deployments/governance.json)
        log_success "Governor deployed at: $GOVERNOR_ADDRESS"
        log_success "Council deployed at: $COUNCIL_ADDRESS"
    else
        log_warning "Could not find deployment file. Please note the contract addresses from the output above."
        read -p "Enter the deployed Governor address: " GOVERNOR_ADDRESS
        read -p "Enter the deployed Council address: " COUNCIL_ADDRESS
    fi
else
    log_error "Smart contract deployment failed!"
    log_info "Please check the error messages above and try again."
    exit 1
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
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application Settings
NODE_ENV=production
PORT=3000
VITE_APP_ID=fushuma-governance-hub
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://fushuma.com/logo.png

# Owner Configuration
OWNER_OPEN_ID=${OWNER_OPEN_ID}
OWNER_NAME=${OWNER_NAME}

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

# Storage Configuration (Optional)
BUILT_IN_FORGE_API_URL=${STORAGE_API_URL}
BUILT_IN_FORGE_API_KEY=${STORAGE_API_KEY}

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
sleep 10

log_info "Initializing database..."
docker compose exec -T app pnpm db:push

log_info "Checking application health..."
if curl -f http://localhost:3000/api/health &> /dev/null; then
    log_success "Application is running!"
else
    log_warning "Application may not be fully started yet. Check with: docker compose logs -f"
fi

#############################################################################
# STEP 11: Configure Cloudflare Tunnel
#############################################################################

echo ""
log_info "=== STEP 7: Setting Up Cloudflare Tunnel ==="
echo ""

log_info "Please follow these steps to complete Cloudflare Tunnel setup:"
echo ""
echo "1. Authenticate with Cloudflare:"
echo "   cloudflared tunnel login"
echo ""
echo "2. Create a tunnel:"
echo "   cloudflared tunnel create fushuma-governance"
echo ""
echo "3. Note the Tunnel ID from the output"
echo ""
echo "4. Create config file at ~/.cloudflared/config.yml:"
cat << 'CONFIGEOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: governance.fushuma.com
    service: http://localhost:3000
  - service: http_status:404
CONFIGEOF
echo ""
echo "5. Route DNS:"
echo "   cloudflared tunnel route dns fushuma-governance governance.fushuma.com"
echo ""
echo "6. Install and start as service:"
echo "   cloudflared service install"
echo "   cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml"
echo "   cp ~/.cloudflared/*.json /etc/cloudflared/"
echo "   systemctl start cloudflared"
echo "   systemctl enable cloudflared"
echo ""

read -p "Press Enter when you've completed the Cloudflare Tunnel setup..."

#############################################################################
# STEP 12: Setup Automated Backups
#############################################################################

echo ""
log_info "=== STEP 8: Setting Up Automated Backups ==="
echo ""

log_info "Creating backup script..."
cat > /usr/local/bin/backup-fushuma.sh << 'BACKUPEOF'
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
cd /var/www/fushuma/fushuma-governance-hub
docker compose exec -T mysql mysqldump -u fushuma -p'DB_PASSWORD_PLACEHOLDER' fushuma_governance | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
BACKUPEOF

# Replace password placeholder
sed -i "s/DB_PASSWORD_PLACEHOLDER/$DB_PASSWORD/g" /usr/local/bin/backup-fushuma.sh

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
echo "🔗 Application URL: https://$DOMAIN"
echo "📜 Governor Contract: $GOVERNOR_ADDRESS"
echo "👥 Council Contract: $COUNCIL_ADDRESS"
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
echo "1. Visit https://$DOMAIN to access your governance hub"
echo "2. Grant roles to council members and executors (see documentation)"
echo "3. Configure additional settings as needed"
echo "4. Test the governance features"
echo ""
log_success "Deployment script completed!"
echo ""

