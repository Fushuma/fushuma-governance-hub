#!/bin/bash

# Fushuma Governance Hub - Azure Deployment Script
# This script deploys the improved governance hub to Azure server

set -e  # Exit on error

# Configuration
AZURE_USER="azureuser"
AZURE_HOST="40.124.72.151"
AZURE_DOMAIN="governance.fushuma.com"
REMOTE_DIR="/home/azureuser/fushuma-governance-hub"
SSH_KEY="./fushuma-governance-key.pem"

echo "========================================="
echo "Fushuma Governance Hub - Azure Deployment"
echo "========================================="
echo ""

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ Error: SSH key not found at $SSH_KEY"
    echo "Please ensure fushuma-governance-key.pem is in the current directory"
    exit 1
fi

# Set correct permissions for SSH key
chmod 600 "$SSH_KEY"

echo "✓ SSH key found and permissions set"
echo ""

# Test SSH connection
echo "Testing SSH connection to $AZURE_HOST..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$AZURE_USER@$AZURE_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
    echo "✓ SSH connection successful"
else
    echo "❌ Error: Cannot connect to Azure server"
    echo "Please check:"
    echo "  - Server is running"
    echo "  - SSH key is correct"
    echo "  - Firewall allows SSH (port 22)"
    exit 1
fi
echo ""

# Build the project
echo "Building the project..."
if pnpm build; then
    echo "✓ Build completed successfully"
else
    echo "❌ Error: Build failed"
    exit 1
fi
echo ""

# Create deployment package
echo "Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_PACKAGE="fushuma-deploy-$TIMESTAMP.tar.gz"

tar -czf "$DEPLOY_PACKAGE" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='coverage' \
    --exclude='*.tar.gz' \
    dist/ \
    server/ \
    drizzle/ \
    package.json \
    pnpm-lock.yaml \
    .env.example \
    IMPROVEMENTS.md \
    README.md

echo "✓ Deployment package created: $DEPLOY_PACKAGE"
echo ""

# Upload to Azure server
echo "Uploading to Azure server..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$DEPLOY_PACKAGE" "$AZURE_USER@$AZURE_HOST:/tmp/"
echo "✓ Upload complete"
echo ""

# Deploy on server
echo "Deploying on Azure server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$AZURE_USER@$AZURE_HOST" << 'ENDSSH'
set -e

REMOTE_DIR="/home/azureuser/fushuma-governance-hub"
DEPLOY_PACKAGE=$(ls -t /tmp/fushuma-deploy-*.tar.gz | head -1)
BACKUP_DIR="/home/azureuser/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting deployment on server..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup current deployment if it exists
if [ -d "$REMOTE_DIR" ]; then
    echo "Creating backup of current deployment..."
    tar -czf "$BACKUP_DIR/fushuma-backup-$TIMESTAMP.tar.gz" -C "$REMOTE_DIR" . 2>/dev/null || true
    echo "✓ Backup created"
fi

# Create or clean deployment directory
mkdir -p "$REMOTE_DIR"
cd "$REMOTE_DIR"

# Extract new deployment
echo "Extracting deployment package..."
tar -xzf "$DEPLOY_PACKAGE"
rm "$DEPLOY_PACKAGE"
echo "✓ Extraction complete"

# Install dependencies
echo "Installing dependencies..."
if command -v pnpm &> /dev/null; then
    pnpm install --prod
else
    echo "⚠ Warning: pnpm not found, using npm"
    npm install --production
fi
echo "✓ Dependencies installed"

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    echo "⚠ Warning: .env not found, creating from .env.example"
    cp .env.example .env
    echo "⚠ Please update .env with your configuration"
fi

# Restart the application with PM2
echo "Restarting application..."
if command -v pm2 &> /dev/null; then
    # Check if app is already running
    if pm2 list | grep -q "fushuma-governance-hub"; then
        pm2 restart fushuma-governance-hub
        echo "✓ Application restarted"
    else
        # Start new instance
        pm2 start dist/server/index.js --name fushuma-governance-hub
        pm2 save
        echo "✓ Application started"
    fi
    
    # Show status
    pm2 list | grep fushuma-governance-hub
else
    echo "⚠ Warning: PM2 not found"
    echo "Please start the application manually:"
    echo "  cd $REMOTE_DIR && node dist/server/index.js"
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "Server: $AZURE_DOMAIN"
echo "Time: $TIMESTAMP"
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Set up GitHub token for grants sync"
echo "3. Configure database connection"
echo "4. Test the application"
echo ""
echo "View logs: pm2 logs fushuma-governance-hub"
echo "Check status: pm2 status"
echo "========================================="

ENDSSH

echo ""
echo "✓ Deployment completed successfully!"
echo ""
echo "Application URL: https://$AZURE_DOMAIN"
echo ""
echo "To check application status:"
echo "  ssh -i $SSH_KEY $AZURE_USER@$AZURE_HOST 'pm2 status'"
echo ""
echo "To view logs:"
echo "  ssh -i $SSH_KEY $AZURE_USER@$AZURE_HOST 'pm2 logs fushuma-governance-hub'"
echo ""

# Clean up local deployment package
rm "$DEPLOY_PACKAGE"
echo "✓ Cleaned up local deployment package"
echo ""
echo "Deployment complete! 🎉"

