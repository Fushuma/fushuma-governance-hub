# Cloudflare Tunnel Quick Start

**Fastest deployment method - No SSL, firewall, or Nginx configuration needed!**

## Prerequisites

- Ubuntu server with SSH access
- Cloudflare account (free tier)
- Domain added to Cloudflare
- Wallet with FUMA tokens

## Step-by-Step (20 minutes)

### 1. Server Setup (5 min)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Node.js and pnpm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Firewall (SSH only!)
sudo ufw enable
sudo ufw allow 22/tcp
```

### 2. Install Cloudflared (2 min)

```bash
# Download and install
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login to Cloudflare
cloudflared tunnel login
# Opens browser - select your domain and authorize

# Create tunnel
cloudflared tunnel create fushuma-governance
# Save the Tunnel ID from output!
```

### 3. Configure Tunnel (2 min)

```bash
# Create config
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add (replace `TUNNEL_ID` with your actual ID):

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/ubuntu/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: governance.fushuma.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
# Route DNS
cloudflared tunnel route dns fushuma-governance governance.fushuma.com
```

### 4. Deploy Smart Contracts (5 min)

```bash
# Clone repo
cd /var/www
sudo mkdir -p fushuma && sudo chown $USER:$USER fushuma
cd fushuma
git clone https://github.com/Fushuma/fushuma-governance-hub.git
cd fushuma-governance-hub/governance-contracts

# Install and configure
forge install
cp .env.example .env
nano .env  # Fill: PRIVATE_KEY, DAO_ADDRESS, ESCROW_ADDRESS, CLOCK_ADDRESS

# Deploy
source .env
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Save the governor address from deployments/governance.json
```

### 5. Deploy Web App (5 min)

```bash
# Configure
cd /var/www/fushuma/fushuma-governance-hub
cp .env.example .env
nano .env  # Fill all required variables, especially VITE_GOVERNOR_CONTRACT_ADDRESS

# Start
docker compose up -d --build

# Initialize database
docker compose exec app pnpm db:push

# Verify
curl http://localhost:3000/api/health
```

### 6. Start Tunnel (1 min)

```bash
# Install as service
sudo cloudflared service install
sudo cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/*.json /etc/cloudflared/

# Start
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

## Done! 🎉

Visit: **https://governance.fushuma.com**

## Key Advantages

✅ No port forwarding  
✅ No SSL certificate management  
✅ No Nginx configuration  
✅ Automatic DDoS protection  
✅ Free Cloudflare CDN  
✅ Only SSH port needs to be open  

## Common Commands

```bash
# Check application
docker compose ps
docker compose logs -f

# Check tunnel
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f

# Restart
docker compose restart app
sudo systemctl restart cloudflared

# Update
cd /var/www/fushuma/fushuma-governance-hub
git pull
docker compose up -d --build
```

## Troubleshooting

**502 Error?**
```bash
docker compose ps  # Check if app is running
curl http://localhost:3000/api/health  # Test locally
```

**Tunnel not connecting?**
```bash
sudo journalctl -u cloudflared -n 50  # Check logs
sudo systemctl restart cloudflared  # Restart
```

**DNS not resolving?**
```bash
cloudflared tunnel route dns fushuma-governance governance.fushuma.com
# Check Cloudflare Dashboard → DNS for CNAME record
```

---

For detailed instructions, see [CLOUDFLARE_TUNNEL_DEPLOYMENT.md](CLOUDFLARE_TUNNEL_DEPLOYMENT.md)

