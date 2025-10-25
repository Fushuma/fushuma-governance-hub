#!/bin/bash

# Improved Deployment Script for Fushuma Governance Hub
# This script handles the complete deployment process with proper error checking

set -e  # Exit on error

echo "========================================="
echo "Fushuma Governance Hub - Deployment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Creating .env from .env.example..."
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before continuing"
    exit 1
fi

print_success ".env file found"

# Check required environment variables
print_info "Checking required environment variables..."

required_vars=("DATABASE_URL" "JWT_SECRET" "OAUTH_SERVER_URL" "VITE_OAUTH_PORTAL_URL" "OWNER_OPEN_ID" "OWNER_NAME")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env || grep -q "^${var}=your-" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing or invalid required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_warning "Please configure these variables in .env file"
    exit 1
fi

print_success "All required environment variables are set"

# Check Node.js version
print_info "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    print_error "Node.js version 22 or higher is required (current: $(node -v))"
    exit 1
fi
print_success "Node.js version: $(node -v)"

# Check pnpm
print_info "Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed"
    print_info "Installing pnpm..."
    npm install -g pnpm
fi
print_success "pnpm version: $(pnpm -v)"

# Install dependencies
print_info "Installing dependencies..."
if ! pnpm install --frozen-lockfile; then
    print_error "Failed to install dependencies"
    exit 1
fi
print_success "Dependencies installed"

# Build the application
print_info "Building application..."
if ! pnpm build; then
    print_error "Build failed"
    exit 1
fi
print_success "Build completed"

# Check if database is accessible
print_info "Checking database connection..."
source .env
if ! timeout 5 bash -c "echo > /dev/tcp/\$(echo \$DATABASE_URL | sed -E 's|.*@([^:]+):.*|\1|')/\$(echo \$DATABASE_URL | sed -E 's|.*:([0-9]+)/.*|\1|')" 2>/dev/null; then
    print_warning "Cannot connect to database. Make sure database is running."
    print_info "If using Docker Compose, the database will be started automatically."
fi

# Push database schema
print_info "Pushing database schema..."
if ! pnpm db:push; then
    print_warning "Database schema push failed. This may be normal if database is not yet running."
fi

echo ""
echo "========================================="
echo "Deployment Options"
echo "========================================="
echo ""
echo "Choose deployment method:"
echo "1) Docker Compose (Recommended)"
echo "2) PM2 (Process Manager)"
echo "3) Direct Node.js"
echo "4) Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        print_info "Starting with Docker Compose..."
        if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
            print_error "Docker is not installed"
            exit 1
        fi
        
        print_info "Building Docker images..."
        docker-compose build
        
        print_info "Starting services..."
        docker-compose up -d
        
        print_success "Services started successfully"
        print_info "Waiting for services to be healthy..."
        sleep 10
        
        print_info "Checking service status..."
        docker-compose ps
        
        print_info "Checking health endpoint..."
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            print_success "Application is healthy!"
        else
            print_warning "Health check failed. Check logs with: docker-compose logs app"
        fi
        ;;
        
    2)
        print_info "Starting with PM2..."
        if ! command -v pm2 &> /dev/null; then
            print_info "Installing PM2..."
            npm install -g pm2
        fi
        
        print_info "Starting application with PM2..."
        pnpm start:all
        
        print_success "Application started with PM2"
        print_info "View status: pnpm status"
        print_info "View logs: pnpm logs"
        ;;
        
    3)
        print_info "Starting with Node.js..."
        print_warning "This will run in foreground. Press Ctrl+C to stop."
        pnpm start
        ;;
        
    4)
        print_info "Exiting..."
        exit 0
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
print_success "Application is running"
print_info "Access the application at: http://localhost:3000"
print_info "Health check endpoint: http://localhost:3000/health"
echo ""
print_info "Next steps:"
echo "  - Configure nginx reverse proxy (see nginx/nginx.conf.template)"
echo "  - Setup SSL with Let's Encrypt"
echo "  - Configure firewall rules"
echo "  - Setup monitoring and backups"
echo ""

