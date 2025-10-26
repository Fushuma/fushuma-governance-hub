# Web3 Authentication System - Deployment Guide

## Overview

This guide will help you deploy the complete Web3 authentication system to replace Manus OAuth. The system includes:

- ✅ Web3 wallet authentication (SIWE)
- ✅ Email/password authentication
- ✅ Google OAuth integration
- ✅ Account linking (wallet ↔ email ↔ Google)
- ✅ JWT token management
- ✅ Email verification and password reset

## Prerequisites

### Required
- Node.js 22+ and pnpm installed
- MySQL database running
- SSH access to Azure server
- Domain configured (governance.fushuma.com)

### Optional (for full features)
- Google OAuth credentials (Client ID + Secret)
- SMTP email service (Gmail, SendGrid, etc.)

## Step 1: Install Dependencies

```bash
# SSH into server
ssh -i fushuma-governance-key.pem azureuser@40.124.72.151

# Navigate to project
cd /home/azureuser/fushuma-governance-hub

# Install new dependencies
pnpm add bcryptjs siwe ethers@^6.9.0 passport passport-google-oauth20 nodemailer jsonwebtoken
pnpm add -D @types/bcryptjs @types/passport @types/passport-google-oauth20 @types/nodemailer @types/jsonwebtoken
```

## Step 2: Run Database Migration

### Option A: Using MySQL Command Line

```bash
# Connect to MySQL
mysql -u fushuma -p fushuma_governance

# Run migration
source /home/azureuser/fushuma-governance-hub/drizzle/migrations/add_web3_auth.sql

# Verify tables created
SHOW TABLES;
DESC users;
DESC email_verification_tokens;
DESC password_reset_tokens;
DESC web3_nonces;

# Exit MySQL
exit;
```

### Option B: Using Drizzle Kit

```bash
cd /home/azureuser/fushuma-governance-hub

# Generate migration
pnpm drizzle-kit generate:mysql

# Push to database
pnpm drizzle-kit push:mysql
```

## Step 3: Configure Environment Variables

```bash
# Edit .env file
nano /home/azureuser/fushuma-governance-hub/.env
```

### Add these variables:

```env
# JWT Configuration
JWT_SECRET=0120f9cba44ed5492a8819991a5dd493ea04a39fd7f1f1dfc79f11b3f1a60f44
JWT_EXPIRATION=7d

# Google OAuth (Optional - get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://governance.fushuma.com/api/auth/google/callback

# Email/SMTP Configuration (Optional - for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@fushuma.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=Fushuma Governance <noreply@fushuma.com>

# Application URL
APP_URL=https://governance.fushuma.com

# Existing variables (keep these)
DATABASE_URL=mysql://fushuma:FushumaDB2025!@127.0.0.1:3306/fushuma_governance
GITHUB_TOKEN=your-github-token-here
```

### Secure the .env file:

```bash
chmod 600 /home/azureuser/fushuma-governance-hub/.env
```

## Step 4: Update Server Index to Include Auth Routes

```bash
# Edit server index file
nano /home/azureuser/fushuma-governance-hub/server/_core/index.ts
```

### Add these imports at the top:

```typescript
import passport from "passport";
import authRoutes from "../routes/auth";
import { initializeGoogleAuth } from "../auth/google";
```

### Add before other routes:

```typescript
// Initialize Passport
app.use(passport.initialize());

// Initialize Google OAuth (if configured)
initializeGoogleAuth();

// Auth routes
app.use("/api/auth", authRoutes);
```

## Step 5: Build and Deploy

```bash
cd /home/azureuser/fushuma-governance-hub

# Build the application
pnpm build

# Restart PM2
pm2 restart fushuma-governance-hub

# Check logs
pm2 logs fushuma-governance-hub --lines 50
```

## Step 6: Verify Deployment

### Test API Endpoints

```bash
# Test nonce generation
curl -X POST https://governance.fushuma.com/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# Test health check
curl https://governance.fushuma.com/api/auth/me

# Should return 401 Unauthorized (expected - no token)
```

### Check Logs

```bash
pm2 logs fushuma-governance-hub | grep -i "auth\|google\|email"
```

Expected output:
```
[Google Auth] Google OAuth initialized
[Email Service] Email transporter initialized
```

## Step 7: Set Up Google OAuth (Optional)

### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `https://governance.fushuma.com/api/auth/google/callback`
7. Copy Client ID and Client Secret
8. Add to `.env` file
9. Restart application

### Test Google OAuth

Visit: `https://governance.fushuma.com/api/auth/google`

Should redirect to Google sign-in page.

## Step 8: Set Up SMTP Email (Optional)

### Option A: Gmail

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
3. Add to `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   EMAIL_FROM=Fushuma Governance <your-email@gmail.com>
   ```

### Option B: SendGrid

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create API key
3. Add to `.env`:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=Fushuma Governance <noreply@fushuma.com>
   ```

### Test Email

```bash
# Register a test user
curl -X POST https://governance.fushuma.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "username": "testuser"
  }'
```

Check if verification email is sent.

## Step 9: Update Frontend (Client)

The frontend needs to be updated to use the new auth system. Key changes:

### Remove Manus OAuth

```bash
# Find and remove Manus SDK usage
cd /home/azureuser/fushuma-governance-hub/client
grep -r "manus" src/
```

### Update Auth Flow

1. Replace `getLoginUrl()` with wallet connect button
2. Add email/password login forms
3. Add Google OAuth button
4. Update auth context/hooks

### Frontend Implementation (Simplified)

Since full frontend implementation would take significant time, here's a minimal working version:

**Create `/client/src/lib/auth.ts`:**

```typescript
const API_URL = import.meta.env.VITE_API_URL || '';

export async function getNonce(walletAddress: string) {
  const res = await fetch(`${API_URL}/api/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
  });
  return res.json();
}

export async function verifyWallet(walletAddress: string, message: string, signature: string) {
  const res = await fetch(`${API_URL}/api/auth/wallet/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, message, signature }),
  });
  return res.json();
}

export async function loginWithEmail(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerWithEmail(email: string, password: string, username?: string) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });
  return res.json();
}

export async function getCurrentUser(token: string) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.json();
}
```

**Update Sign-In Component:**

Replace Manus OAuth button with:

```tsx
// Wallet sign-in (using RainbowKit - already integrated)
<ConnectButton />

// Or add email/password form
<form onSubmit={handleEmailLogin}>
  <input type="email" name="email" required />
  <input type="password" name="password" required />
  <button type="submit">Sign In with Email</button>
</form>

// Google OAuth
<a href="/api/auth/google">
  <button>Sign In with Google</button>
</a>
```

## Step 10: Testing Checklist

### Backend API Tests

- [ ] POST /api/auth/nonce - Get nonce
- [ ] POST /api/auth/wallet/verify - Verify wallet signature
- [ ] POST /api/auth/register - Register with email
- [ ] POST /api/auth/login - Login with email
- [ ] GET /api/auth/verify-email?token=xxx - Verify email
- [ ] POST /api/auth/forgot-password - Request password reset
- [ ] POST /api/auth/reset-password - Reset password
- [ ] GET /api/auth/google - Google OAuth
- [ ] GET /api/auth/me - Get current user (with token)
- [ ] POST /api/auth/link/email - Link email to account
- [ ] POST /api/auth/link/wallet - Link wallet to account

### Integration Tests

- [ ] Register new user with email
- [ ] Receive verification email
- [ ] Verify email with token
- [ ] Login with email/password
- [ ] Request password reset
- [ ] Reset password with token
- [ ] Sign in with Google OAuth
- [ ] Sign in with wallet (SIWE)
- [ ] Link wallet to email account
- [ ] Link email to wallet account
- [ ] Unlink authentication methods

### Security Tests

- [ ] Invalid token returns 401
- [ ] Expired token returns 401
- [ ] Rate limiting works (10 requests/15min)
- [ ] Password strength validation works
- [ ] Email format validation works
- [ ] Nonce expires after 10 minutes
- [ ] Nonce is one-time use
- [ ] Cannot unlink last auth method

## Step 11: Monitoring

### Check Application Logs

```bash
# Real-time logs
pm2 logs fushuma-governance-hub

# Filter auth logs
pm2 logs fushuma-governance-hub | grep -i "auth"

# Check for errors
pm2 logs fushuma-governance-hub --err
```

### Monitor Database

```bash
mysql -u fushuma -p fushuma_governance

# Check user registrations
SELECT id, email, walletAddress, googleId, emailVerified, createdAt 
FROM users 
ORDER BY createdAt DESC 
LIMIT 10;

# Check nonces
SELECT * FROM web3_nonces ORDER BY createdAt DESC LIMIT 10;

# Check verification tokens
SELECT * FROM email_verification_tokens ORDER BY createdAt DESC LIMIT 10;
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check memory usage
pm2 show fushuma-governance-hub
```

## Troubleshooting

### Issue: "Database not available"

**Solution:**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Check DATABASE_URL in .env
cat /home/azureuser/fushuma-governance-hub/.env | grep DATABASE_URL

# Test connection
mysql -u fushuma -p -e "SELECT 1"
```

### Issue: "Google OAuth not configured"

**Solution:**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Verify redirect URI in Google Cloud Console matches exactly
- Restart application after adding credentials

### Issue: "Failed to send email"

**Solution:**
```bash
# Check SMTP configuration
cat /home/azureuser/fushuma-governance-hub/.env | grep SMTP

# Test SMTP connection
telnet smtp.gmail.com 587

# Check application logs
pm2 logs fushuma-governance-hub | grep -i "email"
```

### Issue: "Invalid signature"

**Solution:**
- Ensure nonce is fresh (< 10 minutes old)
- Verify wallet address matches signed message
- Check SIWE message format is correct
- Ensure ethers.js version is 6.x

### Issue: Rate limiting too strict

**Solution:**
Edit `/server/routes/auth.ts` and adjust rate limits:

```typescript
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Increase from 10 to 20
});
```

## Rollback Plan

If issues occur, rollback to Manus OAuth:

```bash
cd /home/azureuser/fushuma-governance-hub

# Checkout previous version
git stash
git checkout HEAD~1

# Rebuild and restart
pnpm build
pm2 restart fushuma-governance-hub
```

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use strong JWT_SECRET** - Already generated
3. **Enable HTTPS** - Already configured via Cloudflare
4. **Rate limit auth endpoints** - Already implemented
5. **Validate all inputs** - Already implemented
6. **Hash passwords with bcrypt** - Already implemented (12 rounds)
7. **Use secure session cookies** - JWT tokens are stateless
8. **Implement CSRF protection** - Consider adding for production

## Performance Optimization

### Database Indexes

Already created in migration:
- `idx_wallet` on `walletAddress`
- `idx_email` on `email`
- `idx_username` on `username`
- `idx_google` on `googleId`

### Caching (Future Enhancement)

Consider adding Redis for:
- Rate limiting (instead of in-memory)
- Session storage
- Nonce storage

## Next Steps

1. **Complete frontend implementation** - Add auth UI components
2. **Add 2FA/MFA** - Time-based OTP for enhanced security
3. **Implement refresh tokens** - For longer sessions
4. **Add social recovery** - Recover account via email if wallet lost
5. **Analytics** - Track auth method usage
6. **A/B testing** - Test different auth flows

## Support

For issues or questions:
- Check logs: `pm2 logs fushuma-governance-hub`
- Review documentation: `NEW_AUTH_ARCHITECTURE.md`
- Test API endpoints with curl or Postman

---

**Deployment Status**: Backend Complete ✅ | Frontend Pending ⏳
**Estimated Deployment Time**: 2-3 hours (with testing)
**Production Ready**: Yes (backend) | Partial (frontend)

