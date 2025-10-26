# Web3 Authentication System

## Overview

The Fushuma Governance Hub now features a complete Web3-first authentication system that replaces the previous Manus OAuth dependency. This system provides flexible, secure authentication with multiple methods.

## Features

### Authentication Methods

- **Web3 Wallet** - Sign-In with Ethereum (SIWE/EIP-4361) standard
- **Email/Password** - Traditional authentication with bcrypt hashing
- **Google OAuth** - Social login integration
- **Account Linking** - Link multiple authentication methods to a single account

### Security Features

- Password hashing with bcrypt (12 salt rounds)
- Password strength validation
- SIWE standard for wallet authentication
- Nonce-based replay protection (10-minute expiration)
- JWT tokens with configurable expiration
- Rate limiting (10 requests per 15 minutes)
- Email verification
- Secure password reset flow

## API Endpoints

### Wallet Authentication

```bash
# Get nonce for wallet signature
POST /api/auth/nonce
Body: { "walletAddress": "0x..." }
Response: { "nonce": "..." }

# Verify wallet signature
POST /api/auth/wallet/verify
Body: {
  "walletAddress": "0x...",
  "message": "...",
  "signature": "..."
}
Response: { "token": "...", "user": {...}, "isNewUser": false }
```

### Email/Password Authentication

```bash
# Register new user
POST /api/auth/register
Body: {
  "email": "user@example.com",
  "password": "StrongPass123$",
  "username": "username" (optional),
  "displayName": "Display Name" (optional)
}
Response: { "message": "...", "userId": 1 }

# Login
POST /api/auth/login
Body: { "email": "user@example.com", "password": "StrongPass123$" }
Response: { "token": "...", "user": {...} }

# Verify email
GET /api/auth/verify-email?token=...
Response: { "message": "Email verified successfully" }

# Forgot password
POST /api/auth/forgot-password
Body: { "email": "user@example.com" }
Response: { "message": "..." }

# Reset password
POST /api/auth/reset-password
Body: { "token": "...", "newPassword": "NewPass123$" }
Response: { "message": "Password reset successfully" }

# Change password (authenticated)
POST /api/auth/change-password
Headers: { "Authorization": "Bearer <token>" }
Body: { "currentPassword": "...", "newPassword": "..." }
Response: { "message": "Password changed successfully" }
```

### Google OAuth

```bash
# Initiate Google OAuth flow
GET /api/auth/google
# Redirects to Google sign-in

# Callback (handled automatically)
GET /api/auth/google/callback
# Redirects to frontend with token
```

### Account Linking

```bash
# Link email to account
POST /api/auth/link/email
Headers: { "Authorization": "Bearer <token>" }
Body: { "email": "...", "password": "..." }
Response: { "message": "..." }

# Link wallet to account
POST /api/auth/link/wallet
Headers: { "Authorization": "Bearer <token>" }
Body: { "walletAddress": "...", "message": "...", "signature": "..." }
Response: { "message": "Wallet linked successfully" }

# Unlink email
DELETE /api/auth/unlink/email
Headers: { "Authorization": "Bearer <token>" }
Response: { "message": "Email unlinked successfully" }

# Unlink wallet
DELETE /api/auth/unlink/wallet
Headers: { "Authorization": "Bearer <token>" }
Response: { "message": "Wallet unlinked successfully" }

# Unlink Google
DELETE /api/auth/unlink/google
Headers: { "Authorization": "Bearer <token>" }
Response: { "message": "Google account unlinked successfully" }
```

### User Info

```bash
# Get current user
GET /api/auth/me
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "user": {
    "id": 1,
    "walletAddress": "0x..." | null,
    "email": "..." | null,
    "username": "...",
    "displayName": "...",
    "avatar": "...",
    "role": "user",
    "emailVerified": true,
    "hasWallet": true,
    "hasEmail": true,
    "hasGoogle": false,
    "createdAt": "...",
    "lastSignedIn": "..."
  }
}

# Logout (client-side)
POST /api/auth/logout
Response: { "message": "Logged out successfully" }
```

## Configuration

### Environment Variables

Required:
```env
JWT_SECRET=<generated-secret>
JWT_EXPIRATION=7d
APP_URL=https://governance.fushuma.com
```

Optional (Google OAuth):
```env
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=https://governance.fushuma.com/api/auth/google/callback
```

Optional (Email Service):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<your-app-password>
EMAIL_FROM=Fushuma Governance <noreply@fushuma.com>
```

## Database Schema

### Users Table

New columns added:
- `walletAddress` - Web3 wallet address (VARCHAR(42), unique)
- `passwordHash` - bcrypt password hash (VARCHAR(255))
- `emailVerified` - Email verification status (BOOLEAN)
- `username` - Unique username (VARCHAR(64), unique)
- `displayName` - Display name (VARCHAR(128))
- `avatar` - Profile avatar URL (TEXT)
- `googleId` - Google OAuth ID (VARCHAR(255), unique)

### New Tables

- `email_verification_tokens` - Email verification tokens (24-hour expiration)
- `password_reset_tokens` - Password reset tokens (1-hour expiration)
- `web3_nonces` - SIWE nonces (10-minute expiration)

## Testing

### Test Wallet Authentication

```bash
# 1. Get nonce
curl -X POST https://governance.fushuma.com/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# 2. Sign message in wallet (use nonce from step 1)

# 3. Verify signature
curl -X POST https://governance.fushuma.com/api/auth/wallet/verify \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "message":"...",
    "signature":"..."
  }'
```

### Test Email Authentication

```bash
# Register
curl -X POST https://governance.fushuma.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123$Pass",
    "username":"testuser"
  }'

# Login
curl -X POST https://governance.fushuma.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123$Pass"
  }'

# Get user info
curl -X GET https://governance.fushuma.com/api/auth/me \
  -H "Authorization: Bearer <token-from-login>"
```

## Implementation Status

### Backend: ✅ Complete

- ✅ Web3 wallet authentication (SIWE)
- ✅ Email/password authentication
- ✅ Google OAuth integration
- ✅ JWT token management
- ✅ Auth middleware
- ✅ Email service
- ✅ API routes (15+ endpoints)
- ✅ Database schema and migration
- ✅ Deployed and tested

### Frontend: ⏳ Pending

The frontend needs to be updated to use the new auth system:
- Remove Manus OAuth SDK
- Add wallet sign-in UI (use existing RainbowKit)
- Add email/password forms
- Add Google OAuth button
- Add account linking UI
- Update auth context/hooks

## Documentation

- [FINAL_IMPLEMENTATION_REPORT.md](./FINAL_IMPLEMENTATION_REPORT.md) - Complete implementation summary
- [NEW_AUTH_ARCHITECTURE.md](./NEW_AUTH_ARCHITECTURE.md) - System architecture and design
- [WEB3_AUTH_DEPLOYMENT_GUIDE.md](./WEB3_AUTH_DEPLOYMENT_GUIDE.md) - Deployment guide
- [WEB3_AUTH_IMPLEMENTATION_SUMMARY.md](./WEB3_AUTH_IMPLEMENTATION_SUMMARY.md) - Implementation summary

## Dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "siwe": "^2.1.4",
    "ethers": "^6.9.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "nodemailer": "^6.9.7",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/passport": "^1.0.16",
    "@types/passport-google-oauth20": "^2.0.14",
    "@types/nodemailer": "^6.4.14",
    "@types/jsonwebtoken": "^9.0.5"
  }
}
```

## Security Considerations

- Passwords are hashed with bcrypt (12 salt rounds)
- Password strength requirements: 8+ characters, uppercase, lowercase, number, special character
- SIWE standard for wallet authentication (EIP-4361)
- Nonce-based replay protection
- JWT tokens with expiration
- Rate limiting on sensitive endpoints
- Email verification required
- Secure password reset flow
- HTTPS enforced (via Cloudflare)

## Support

For issues or questions:
- Check application logs: `pm2 logs fushuma-governance-hub`
- Review documentation in `/docs`
- Test API endpoints with curl or Postman

---

**Version**: 1.0.0  
**Status**: Production Ready (Backend) | Frontend Pending  
**Last Updated**: October 26, 2025

