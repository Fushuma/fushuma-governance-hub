#!/bin/bash

# Database Initialization Script for Fushuma Governance Hub
# This script ensures the database is properly initialized before deployment

set -e

echo "========================================="
echo "Database Initialization"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Load environment variables
if [ ! -f .env ]; then
    print_error ".env file not found!"
    exit 1
fi

source .env

# Extract database connection details from DATABASE_URL
# Format: mysql://username:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -E 's|mysql://([^:]+):.*|\1|')
DB_PASS=$(echo $DATABASE_URL | sed -E 's|mysql://[^:]+:([^@]+)@.*|\1|')
DB_HOST=$(echo $DATABASE_URL | sed -E 's|.*@([^:]+):.*|\1|')
DB_PORT=$(echo $DATABASE_URL | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(echo $DATABASE_URL | sed -E 's|.*/([^?]+).*|\1|')

print_info "Database configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if database server is accessible
print_info "Checking database server connection..."
if ! timeout 5 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
    print_error "Cannot connect to database server at $DB_HOST:$DB_PORT"
    print_info "Make sure the database server is running"
    exit 1
fi
print_success "Database server is accessible"

# Check if mysql client is available
if ! command -v mysql &> /dev/null; then
    print_error "mysql client is not installed"
    print_info "Install it with: sudo apt-get install mysql-client"
    exit 1
fi

# Test database connection
print_info "Testing database connection..."
if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" > /dev/null 2>&1; then
    print_error "Failed to connect to database"
    print_info "Please check your database credentials in .env file"
    exit 1
fi
print_success "Database connection successful"

# Check if database exists
print_info "Checking if database '$DB_NAME' exists..."
if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME;" > /dev/null 2>&1; then
    print_info "Database '$DB_NAME' does not exist. Creating..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    print_success "Database created"
else
    print_success "Database exists"
fi

# Push database schema using Drizzle
print_info "Pushing database schema..."
if ! pnpm db:push; then
    print_error "Failed to push database schema"
    exit 1
fi
print_success "Database schema pushed successfully"

# Optional: Seed initial data
if [ -f "scripts/seed-data.ts" ]; then
    read -p "Do you want to seed initial data? (y/N): " seed_choice
    if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
        print_info "Seeding initial data..."
        npx tsx scripts/seed-data.ts
        print_success "Initial data seeded"
    fi
fi

echo ""
print_success "Database initialization complete!"
echo ""

