#!/bin/bash
# Setup Nginx configuration for Fushuma Governance Hub
# Usage: ./setup-nginx.sh your-domain.com

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 governance.fushuma.com"
    exit 1
fi

DOMAIN=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NGINX_TEMPLATE="$PROJECT_DIR/nginx/nginx.conf.template"
NGINX_OUTPUT="$PROJECT_DIR/nginx/nginx.conf"

echo "Setting up Nginx configuration for domain: $DOMAIN"

# Check if template exists
if [ ! -f "$NGINX_TEMPLATE" ]; then
    echo "Error: Template file not found at $NGINX_TEMPLATE"
    exit 1
fi

# Replace ${DOMAIN} with actual domain
sed "s/\${DOMAIN}/$DOMAIN/g" "$NGINX_TEMPLATE" > "$NGINX_OUTPUT"

echo "✓ Nginx configuration created at: $NGINX_OUTPUT"
echo ""
echo "Next steps:"
echo "1. Copy the configuration to Nginx:"
echo "   sudo cp $NGINX_OUTPUT /etc/nginx/sites-available/fushuma-governance-hub"
echo ""
echo "2. Create symbolic link:"
echo "   sudo ln -s /etc/nginx/sites-available/fushuma-governance-hub /etc/nginx/sites-enabled/"
echo ""
echo "3. Test Nginx configuration:"
echo "   sudo nginx -t"
echo ""
echo "4. Obtain SSL certificate (if not already done):"
echo "   sudo certbot --nginx -d $DOMAIN"
echo ""
echo "5. Reload Nginx:"
echo "   sudo systemctl reload nginx"

