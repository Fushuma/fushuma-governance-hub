# Deployment Troubleshooting Guide

This guide helps you diagnose and fix common deployment issues with the Fushuma Governance Hub.

## Quick Diagnosis

Run this command to check your deployment status:

```bash
# Check all services
docker-compose ps

# Check application logs
docker-compose logs app --tail=50

# Check health endpoint
curl http://localhost:3000/health
```

## Common Issues and Solutions

### 1. TypeScript Compilation Errors

**Symptoms:**
- Build fails with TypeScript errors
- `pnpm build` exits with error code

**Solutions:**

#### Issue: Missing Drizzle mode configuration
```
Error: Property 'mode' is missing in type '{ schema: typeof schema; }'
```

**Fixed in:** `server/db.ts`

The Drizzle ORM configuration now includes the required `mode` property:
```typescript
drizzle(process.env.DATABASE_URL, { schema, mode: 'default' })
```

#### Issue: Missing dependencies
```
Error: Cannot find module 'axios' or 'jose' or 'nanoid'
```

**Solution:**
```bash
pnpm install
# or specifically:
pnpm add axios jose nanoid
```

#### Issue: Unused imports causing strict TypeScript errors

**Solution:**
All unused imports have been removed. If you encounter new ones:
```bash
# Run type check to see all errors
pnpm check

# Fix unused imports by removing them from the import statements
```

### 2. Docker Build Failures

**Symptoms:**
- `docker-compose build` fails
- Container exits immediately after starting

**Solutions:**

#### Issue: Health check failing
```
Container marked as unhealthy
```

**Diagnosis:**
```bash
# Check if health endpoint is accessible inside container
docker exec fushuma-app wget --spider http://localhost:3000/health

# Check application logs
docker-compose logs app
```

**Common causes:**
1. Application failed to start due to missing environment variables
2. Database connection failed
3. Port 3000 is not accessible

**Solution:**
1. Verify all required environment variables are set in `.env`
2. Ensure database is running and accessible
3. Check if port 3000 is exposed correctly

#### Issue: Build fails during pnpm install
```
Error: Failed to install dependencies
```

**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Rebuild without cache
docker-compose build --no-cache
```

### 3. Database Connection Issues

**Symptoms:**
- "Database not available" errors
- "Failed to connect" messages
- Application starts but crashes when accessing data

**Solutions:**

#### Issue: Database URL is incorrect

**Check your DATABASE_URL format:**
```env
# Correct format:
DATABASE_URL=mysql://username:password@host:port/database

# For Docker Compose, use service name as host:
DATABASE_URL=mysql://fushuma:fushuma_password@mysql:3306/fushuma_governance

# For external database:
DATABASE_URL=mysql://user:pass@192.168.1.100:3306/fushuma_governance
```

#### Issue: Database not initialized

**Solution:**
```bash
# Initialize database with the provided script
./scripts/init-db.sh

# Or manually push schema
pnpm db:push
```

#### Issue: Database server not running

**For Docker Compose:**
```bash
# Check if MySQL container is running
docker-compose ps mysql

# Check MySQL logs
docker-compose logs mysql

# Restart MySQL
docker-compose restart mysql
```

**For external database:**
```bash
# Test connection
mysql -h your-host -P 3306 -u your-user -p

# Check if MySQL is running
sudo systemctl status mysql
```

### 4. Environment Variable Issues

**Symptoms:**
- Frontend shows "undefined" for configuration values
- OAuth not working
- Blockchain features not connecting

**Solutions:**

#### Issue: VITE_ variables not available in frontend

**Important:** VITE_ prefixed variables must be available at **build time**, not just runtime.

**Solution:**
1. Set all VITE_ variables in `.env` before building
2. Rebuild the application:
```bash
pnpm build
```

3. For Docker, rebuild the image:
```bash
docker-compose up -d --build
```

#### Issue: Missing required environment variables

**Check required variables:**
```bash
# Run the deployment script which validates environment
./scripts/deploy-improved.sh
```

**Minimum required variables:**
```env
DATABASE_URL=mysql://user:pass@host:3306/database
JWT_SECRET=your-secret-at-least-32-characters-long
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Owner Name
```

### 5. PM2 Deployment Issues

**Symptoms:**
- Application crashes repeatedly
- PM2 shows "errored" status
- High CPU or memory usage

**Solutions:**

#### Issue: Application crashes on startup

**Diagnosis:**
```bash
# Check PM2 status
pnpm status

# View logs
pnpm logs

# View specific process logs
pm2 logs fushuma-api
```

**Common causes:**
1. Port already in use
2. Database not accessible
3. Missing environment variables

**Solution:**
```bash
# Stop all processes
pnpm stop:all

# Check if port 3000 is in use
sudo lsof -i :3000

# Kill process using port 3000
sudo kill -9 <PID>

# Restart
pnpm start:all
```

#### Issue: PM2 not starting in cluster mode

**Check ecosystem.config.js:**
```javascript
instances: process.env.NODE_ENV === 'production' ? 'max' : 1
```

**Solution:**
```bash
# Ensure NODE_ENV is set
export NODE_ENV=production

# Restart with new config
pnpm restart:all
```

### 6. Nginx Reverse Proxy Issues

**Symptoms:**
- 502 Bad Gateway
- 504 Gateway Timeout
- SSL certificate errors

**Solutions:**

#### Issue: 502 Bad Gateway

**Diagnosis:**
```bash
# Check if application is running
curl http://localhost:3000/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if Nginx can reach the backend
sudo nginx -t
```

**Common causes:**
1. Application not running on port 3000
2. Firewall blocking connection
3. Incorrect proxy_pass configuration

**Solution:**
```bash
# Verify application is running
docker-compose ps app
# or
pnpm status

# Check Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Issue: SSL certificate errors

**Solution:**
```bash
# Install certbot if not already installed
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 7. Performance Issues

**Symptoms:**
- Slow response times
- High memory usage
- Database queries timing out

**Solutions:**

#### Issue: Database queries slow

**Diagnosis:**
```bash
# Check database performance
mysql -h host -u user -p -e "SHOW PROCESSLIST;"

# Check slow query log
mysql -h host -u user -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

**Solution:**
1. Add database indexes (check `drizzle/schema.ts`)
2. Enable Redis for caching
3. Optimize queries in `server/db.ts`

#### Issue: High memory usage

**Solution:**
```bash
# For PM2, limit memory per instance
pm2 start ecosystem.config.js --max-memory-restart 500M

# For Docker, limit container memory
# Add to docker-compose.yml under app service:
deploy:
  resources:
    limits:
      memory: 1G
```

### 8. Redis Connection Issues

**Symptoms:**
- Rate limiting not working
- "Redis connection failed" errors

**Solutions:**

#### Issue: Redis not accessible

**Diagnosis:**
```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker exec fushuma-redis redis-cli ping

# Check Redis logs
docker-compose logs redis
```

**Solution:**
```bash
# Restart Redis
docker-compose restart redis

# Verify REDIS_URL in .env
REDIS_URL=redis://:password@redis:6379
REDIS_PASSWORD=your-secure-password
```

## Deployment Checklist

Before deploying to production, ensure:

- [ ] All TypeScript errors are fixed (`pnpm check`)
- [ ] Application builds successfully (`pnpm build`)
- [ ] All required environment variables are set
- [ ] Database is accessible and schema is pushed
- [ ] Health check endpoint returns 200 OK
- [ ] Redis is running (if using rate limiting)
- [ ] Firewall rules are configured
- [ ] Nginx reverse proxy is configured
- [ ] SSL certificate is installed
- [ ] Monitoring is set up
- [ ] Backup strategy is in place

## Getting Help

If you're still experiencing issues:

1. **Check the logs:**
   ```bash
   # Docker
   docker-compose logs app --tail=100
   
   # PM2
   pm2 logs --lines 100
   ```

2. **Enable debug mode:**
   ```env
   NODE_ENV=development
   LOG_LEVEL=debug
   ```

3. **Run health checks:**
   ```bash
   curl -v http://localhost:3000/health
   curl -v http://localhost:3000/metrics
   ```

4. **Check system resources:**
   ```bash
   # CPU and memory
   htop
   
   # Disk space
   df -h
   
   # Network connections
   sudo netstat -tlnp
   ```

5. **Contact support:**
   - GitHub Issues: https://github.com/Fushuma/fushuma-governance-hub/issues
   - Email: governance@fushuma.com

## Quick Fixes

### Reset Everything
```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

### Fresh Install
```bash
# Remove node_modules
rm -rf node_modules

# Clear pnpm cache
pnpm store prune

# Reinstall
pnpm install

# Rebuild
pnpm build
```

### Database Reset
```bash
# Backup first!
pnpm backup

# Drop and recreate database
mysql -h host -u user -p -e "DROP DATABASE fushuma_governance; CREATE DATABASE fushuma_governance;"

# Push schema
pnpm db:push

# Restore data (if needed)
pnpm restore
```

## Monitoring Commands

```bash
# Docker Compose
docker-compose ps              # Service status
docker-compose logs -f app     # Follow logs
docker stats                   # Resource usage

# PM2
pm2 status                     # Process status
pm2 logs                       # View logs
pm2 monit                      # Real-time monitoring

# System
htop                           # CPU/Memory
df -h                          # Disk space
sudo netstat -tlnp | grep 3000 # Port usage
```

---

**Last Updated:** October 25, 2025

