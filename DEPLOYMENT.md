# Fushuma Governance Hub - Production Deployment Guide

This guide provides step-by-step instructions for deploying the Fushuma Governance Hub to a production environment.

## Prerequisites

- Ubuntu 22.04 LTS server
- Docker and Docker Compose installed
- Domain name configured with DNS pointing to your server
- SSL certificate (Let's Encrypt recommended)
- At least 4GB RAM and 2 CPU cores
- MySQL/TiDB database (or use Docker Compose)
- Redis instance (or use Docker Compose)

## Quick Start with Docker Compose

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/fushuma-governance-hub.git
cd fushuma-governance-hub
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Update all required environment variables:

```env
# Database
DATABASE_URL=mysql://fushuma:your_secure_password@mysql:3306/fushuma_governance

# Authentication
JWT_SECRET=your-very-long-and-secure-random-secret-key-here

# Application
NODE_ENV=production
PORT=3000
VITE_APP_ID=fushuma-governance-hub
VITE_APP_TITLE=Fushuma Governance Hub

# Owner
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Admin Name

# Blockchain
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com

# Redis
REDIS_URL=redis://:your_redis_password@redis:6379
REDIS_PASSWORD=your_redis_password
```

### 3. Start the Application

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Initialize the Database

```bash
# Run database migrations
docker-compose exec app pnpm db:push

# Optional: Seed initial data
docker-compose exec app npx tsx seed-data.ts
```

### 5. Configure Nginx (Optional but Recommended)

If using the Nginx reverse proxy:

```bash
# Start with Nginx profile
docker-compose --profile production up -d

# Or configure Nginx on the host
sudo cp nginx/nginx.conf /etc/nginx/sites-available/fushuma-governance-hub
sudo ln -s /etc/nginx/sites-available/fushuma-governance-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Production Deployment with PM2 (Without Docker)

### 1. Install Dependencies

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@10.4.1

# Install PM2
npm install -g pm2
```

### 2. Install Application Dependencies

```bash
cd /var/www/fushuma-governance-hub
pnpm install --frozen-lockfile
```

### 3. Build the Application

```bash
pnpm build
```

### 4. Configure Environment

```bash
cp .env.example .env
nano .env
# Update all production values
```

### 5. Start with PM2

```bash
# Start all services
pnpm start:all

# Check status
pm2 status

# View logs
pm2 logs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d governance.fushuma.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Database Setup

### MySQL/TiDB Configuration

```bash
# Create database and user
mysql -u root -p

CREATE DATABASE fushuma_governance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fushuma'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON fushuma_governance.* TO 'fushuma'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Run Migrations

```bash
pnpm db:push
```

## Redis Configuration

### Install Redis (if not using Docker)

```bash
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password
requirepass your_secure_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

## Monitoring Setup

### Prometheus and Grafana

```bash
# Create monitoring directory
mkdir -p monitoring

# Create prometheus.yml
cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fushuma-governance-hub'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
EOF

# Start Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

## Backup Configuration

### Automated Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-fushuma.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/fushuma"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u fushuma -p'your_password' fushuma_governance | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-fushuma.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-fushuma.sh") | crontab -
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Configure firewall (UFW)
- [ ] Enable SSL/TLS
- [ ] Set up fail2ban
- [ ] Configure proper file permissions
- [ ] Enable automatic security updates
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review and update CSP headers
- [ ] Enable rate limiting
- [ ] Configure CORS properly

## Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## Health Checks

### Application Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-24T12:00:00.000Z"
}
```

### Metrics

```bash
curl http://localhost:3000/metrics
```

## Troubleshooting

### Check Logs

```bash
# Docker Compose
docker-compose logs -f app

# PM2
pm2 logs fushuma-api

# System logs
sudo journalctl -u nginx -f
```

### Common Issues

**Database Connection Failed**
- Check DATABASE_URL is correct
- Verify database is running
- Check network connectivity

**Redis Connection Failed**
- Verify REDIS_URL is correct
- Check Redis is running
- Application will fall back to in-memory cache

**Port Already in Use**
- Check if another service is using port 3000
- Application will automatically find next available port

## Scaling

### Horizontal Scaling

To run multiple instances:

```bash
# Update ecosystem.config.js
instances: 'max'  # Use all CPU cores

# Or specify number
instances: 4
```

### Load Balancing

Configure Nginx upstream with multiple backend servers:

```nginx
upstream fushuma_backend {
    least_conn;
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Build
pnpm build

# Restart with zero downtime
pm2 reload ecosystem.config.js
```

### Database Migrations

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/fushuma-governance-hub/issues
- Email: governance@fushuma.com
- Discord: [Join our Discord]

## License

MIT License - see LICENSE file for details

