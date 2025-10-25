# Deployment Fixes Applied

This document describes the fixes applied to resolve deployment issues in the Fushuma Governance Hub.

## Summary of Changes

### 🔧 Critical Fixes

#### 1. **Dockerfile Health Check**
**Problem:** Alpine Linux doesn't include `wget` by default, causing health checks to fail.

**Fix Applied:**
- Added `wget` installation to the Dockerfile
- Fixed health check endpoint from `/api/health` to `/health`

```dockerfile
# Install pnpm, tsx, and wget for healthcheck
RUN apk add --no-cache wget && \
    npm install -g pnpm@10.4.1 tsx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

#### 2. **Docker Compose Health Check**
**Problem:** Health check was using `curl` (not available) and wrong endpoint path.

**Fix Applied:**
- Changed from `curl` to `wget`
- Fixed endpoint path from `/api/health` to `/health`

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
```

#### 3. **Nginx Configuration**
**Problem:** Health check endpoint path mismatch.

**Fix Applied:**
- Updated health check location from `/api/health` to `/health`
- Created template file `nginx.conf.template` for easy domain configuration
- Added setup script `scripts/setup-nginx.sh` for automated configuration

### 📦 Important Improvements

#### 4. **Environment Variables in Docker Compose**
**Problem:** Missing VITE_ prefixed environment variables needed for frontend.

**Fix Applied:**
Added all missing environment variables with sensible defaults:
```yaml
VITE_APP_ID: ${VITE_APP_ID}
VITE_APP_TITLE: ${VITE_APP_TITLE:-Fushuma Governance Hub}
VITE_APP_LOGO: ${VITE_APP_LOGO}
VITE_ANALYTICS_ENDPOINT: ${VITE_ANALYTICS_ENDPOINT:-}
VITE_ANALYTICS_WEBSITE_ID: ${VITE_ANALYTICS_WEBSITE_ID:-}
VITE_GOVERNOR_CONTRACT_ADDRESS: ${VITE_GOVERNOR_CONTRACT_ADDRESS:-0x0000000000000000000000000000000000000000}
VITE_TOKEN_CONTRACT_ADDRESS: ${VITE_TOKEN_CONTRACT_ADDRESS:-0x0000000000000000000000000000000000000000}
VITE_TREASURY_CONTRACT_ADDRESS: ${VITE_TREASURY_CONTRACT_ADDRESS:-0x0000000000000000000000000000000000000000}
REDIS_PASSWORD: ${REDIS_PASSWORD:-}
REDIS_DB: ${REDIS_DB:-0}
OPENAI_API_URL: ${OPENAI_API_URL:-}
OPENAI_API_KEY: ${OPENAI_API_KEY:-}
```

#### 5. **Nginx Configuration Template**
**Problem:** Hardcoded domain name made deployment difficult.

**Fix Applied:**
- Created `nginx/nginx.conf.template` with `${DOMAIN}` placeholder
- Created `scripts/setup-nginx.sh` script to generate configuration
- Keeps original `nginx.conf` as example

**Usage:**
```bash
./scripts/setup-nginx.sh your-domain.com
```

## Files Modified

1. ✅ `Dockerfile` - Added wget, fixed health check
2. ✅ `docker-compose.yml` - Fixed health check, added environment variables
3. ✅ `nginx/nginx.conf` - Fixed health check endpoint path
4. ✅ `nginx/nginx.conf.template` - NEW: Template for domain configuration
5. ✅ `scripts/setup-nginx.sh` - NEW: Automated nginx setup script

## Deployment Instructions

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Fushuma/fushuma-governance-hub.git
   cd fushuma-governance-hub
   ```

2. **Create .env file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   nano .env
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Check health:**
   ```bash
   curl http://localhost:3000/health
   ```

### Option 2: Docker + Nginx

1. **Follow Docker deployment steps above**

2. **Setup Nginx configuration:**
   ```bash
   ./scripts/setup-nginx.sh your-domain.com
   ```

3. **Copy configuration to Nginx:**
   ```bash
   sudo cp nginx/nginx.conf /etc/nginx/sites-available/fushuma-governance-hub
   sudo ln -s /etc/nginx/sites-available/fushuma-governance-hub /etc/nginx/sites-enabled/
   ```

4. **Test and reload:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Option 3: PM2 Deployment

1. **Clone and install:**
   ```bash
   git clone https://github.com/Fushuma/fushuma-governance-hub.git
   cd fushuma-governance-hub
   pnpm install
   ```

2. **Build application:**
   ```bash
   pnpm build
   ```

3. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   nano .env
   ```

4. **Start with PM2:**
   ```bash
   pnpm start:all
   ```

5. **Check status:**
   ```bash
   pnpm status
   ```

## Verification Steps

### 1. Health Check
```bash
# Local
curl http://localhost:3000/health

# With domain
curl https://your-domain.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-10-25T..."}
```

### 2. Docker Container Health
```bash
docker ps
```

Look for "healthy" status in the HEALTH column.

### 3. Application Logs
```bash
# Docker
docker-compose logs -f app

# PM2
pm2 logs
```

### 4. Database Connection
Check logs for successful database connection:
```
Server started { port: 3000, nodeEnv: 'production' }
```

## Troubleshooting

### Issue: Container keeps restarting
**Solution:** Check logs for errors:
```bash
docker-compose logs app
```

Common causes:
- Missing required environment variables
- Database connection failure
- Port already in use

### Issue: Health check failing
**Solution:** Verify endpoint is accessible:
```bash
docker exec fushuma-app wget --spider http://localhost:3000/health
```

### Issue: Nginx 502 Bad Gateway
**Solution:** Ensure application is running:
```bash
# Check if app is listening
sudo netstat -tlnp | grep 3000

# Check Nginx error logs
sudo tail -f /var/log/nginx/fushuma-error.log
```

### Issue: Environment variables not working
**Solution:** Rebuild Docker image after .env changes:
```bash
docker-compose down
docker-compose up -d --build
```

## Required Environment Variables

### Minimum Required
```env
DATABASE_URL=mysql://user:pass@host:3306/database
JWT_SECRET=your-secret-at-least-32-characters
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OWNER_OPEN_ID=your-owner-id
OWNER_NAME=Owner Name
```

### Blockchain Configuration
```env
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
```

### Optional but Recommended
```env
VITE_APP_ID=your-app-id
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://your-logo-url.com/logo.png
REDIS_PASSWORD=secure-password
BUILT_IN_FORGE_API_URL=https://forge-api-url
BUILT_IN_FORGE_API_KEY=your-api-key
```

## Performance Optimization

### 1. Enable Redis for Rate Limiting
```env
REDIS_URL=redis://:password@localhost:6379
REDIS_PASSWORD=secure-password
```

### 2. PM2 Cluster Mode
The application automatically uses cluster mode in production:
```javascript
instances: process.env.NODE_ENV === 'production' ? 'max' : 1
```

### 3. Nginx Caching
Static assets are cached for 1 year by default in the nginx configuration.

## Security Checklist

- ✅ Change default JWT_SECRET
- ✅ Set strong REDIS_PASSWORD
- ✅ Use HTTPS (Let's Encrypt)
- ✅ Configure firewall (UFW)
- ✅ Keep dependencies updated
- ✅ Enable rate limiting
- ✅ Review security headers in Nginx

## Support

If you encounter issues after applying these fixes:

1. Check the logs first
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check firewall settings
5. Review the troubleshooting section above

For additional help:
- GitHub Issues: https://github.com/Fushuma/fushuma-governance-hub/issues
- Email: governance@fushuma.com

## Testing the Fixes

All fixes have been tested and verified:
- ✅ `pnpm install` - Success
- ✅ `pnpm build` - Success
- ✅ Health check endpoint accessible at `/health`
- ✅ Docker Compose configuration validated
- ✅ Nginx configuration syntax validated

## Next Steps

1. Pull the latest changes from the repository
2. Review and update your `.env` file
3. Rebuild Docker containers if using Docker
4. Test the health check endpoint
5. Monitor logs for any issues

---

**Last Updated:** October 25, 2025
**Version:** 1.0.0

