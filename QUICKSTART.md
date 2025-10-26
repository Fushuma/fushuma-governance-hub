# Fushuma Governance Hub - Quick Start Guide

This is a condensed guide for experienced developers. For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Prerequisites

- Ubuntu 22.04+ server with 4GB RAM, 2 CPU cores
- Domain name with DNS configured
- Wallet with FUMA tokens for contract deployment

## 1. Server Setup (5 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Node.js 22 and pnpm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 2. Deploy Smart Contracts (10 minutes)

```bash
# Clone repository
cd /var/www
sudo mkdir -p fushuma && sudo chown $USER:$USER fushuma
cd fushuma
git clone https://github.com/Fushuma/fushuma-governance-hub.git
cd fushuma-governance-hub/governance-contracts

# Install dependencies
forge install

# Configure environment
cp .env.example .env
nano .env  # Fill in PRIVATE_KEY, DAO_ADDRESS, ESCROW_ADDRESS, CLOCK_ADDRESS

# Deploy contracts
source .env
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Save the deployed governor address from deployments/governance.json
```

## 3. Deploy Web Application (10 minutes)

```bash
# Navigate to project root
cd /var/www/fushuma/fushuma-governance-hub

# Configure environment
cp .env.example .env
nano .env  # Fill in all required variables, especially VITE_GOVERNOR_CONTRACT_ADDRESS

# Start with Docker
docker compose up -d --build

# Initialize database
docker compose exec app pnpm db:push

# Verify
curl http://localhost:3000/api/health
```

## 4. Configure SSL (5 minutes)

```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
sudo cp nginx/nginx.conf /etc/nginx/sites-available/fushuma-governance-hub
sudo nano /etc/nginx/sites-available/fushuma-governance-hub  # Update server_name
sudo ln -s /etc/nginx/sites-available/fushuma-governance-hub /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d governance.fushuma.com
```

## 5. Post-Deployment

```bash
# Grant contract roles
cd /var/www/fushuma/fushuma-governance-hub/governance-contracts
source .env

# Grant council member role
cast send <COUNCIL_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "COUNCIL_MEMBER_ROLE") \
  <MEMBER_ADDRESS> \
  --rpc-url https://rpc.fushuma.com \
  --private-key $PRIVATE_KEY

# Set up automated backups
sudo nano /usr/local/bin/backup-fushuma.sh  # See PRODUCTION_DEPLOYMENT_GUIDE.md
sudo chmod +x /usr/local/bin/backup-fushuma.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-fushuma.sh") | crontab -
```

## Done! 🎉

Your Fushuma Governance Hub is now live at `https://governance.fushuma.com`

## Common Commands

```bash
# View logs
docker compose logs -f

# Restart application
docker compose restart app

# Update application
git pull origin main
docker compose up -d --build
docker compose exec app pnpm db:push

# Check health
curl https://governance.fushuma.com/api/health
```

## Troubleshooting

- **502 Bad Gateway**: Check `docker compose ps` and `docker compose logs`
- **Database connection failed**: Verify `DATABASE_URL` in `.env`
- **SSL not working**: Run `sudo certbot renew` and check `sudo nginx -t`

For detailed troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

