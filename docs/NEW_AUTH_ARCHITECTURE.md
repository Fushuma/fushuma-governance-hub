# New Authentication Architecture - Fushuma Governance Hub

## Overview

Replace Manus OAuth with a flexible multi-method authentication system:
- **Primary**: Web3 wallet sign-in (SIWE - Sign-In with Ethereum)
- **Secondary**: Email/password authentication
- **Social**: Gmail OAuth integration
- **Flexible**: Link wallet ↔ email ↔ password for multiple login options

## Database Schema Changes

### Updated Users Table

```typescript
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  
  // Wallet authentication
  walletAddress: varchar("walletAddress", { length: 42 }).unique(), // Primary identifier
  
  // Email/password authentication
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }), // bcrypt hash
  emailVerified: boolean("emailVerified").default(false),
  
  // Profile information
  username: varchar("username", { length: 64 }).unique(),
  displayName: varchar("displayName", { length: 128 }),
  avatar: text("avatar"),
  
  // OAuth providers
  googleId: varchar("googleId", { length: 255 }).unique(),
  
  // Legacy Manus OAuth (keep for migration)
  openId: varchar("openId", { length: 64 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  
  // Authorization
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  walletIdx: index("idx_wallet").on(table.walletAddress),
  emailIdx: index("idx_email").on(table.email),
  usernameIdx: index("idx_username").on(table.username),
  googleIdx: index("idx_google").on(table.googleId),
  roleIdx: index("idx_role").on(table.role),
}));
```

### New Tables

#### Email Verification Tokens
```typescript
export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("idx_token").on(table.token),
  userIdx: index("idx_user").on(table.userId),
}));
```

#### Password Reset Tokens
```typescript
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedAt: timestamp("usedAt"),
}, (table) => ({
  tokenIdx: index("idx_token").on(table.token),
  userIdx: index("idx_user").on(table.userId),
}));
```

#### Web3 Nonces (for SIWE)
```typescript
export const web3Nonces = mysqlTable("web3_nonces", {
  id: int("id").autoincrement().primaryKey(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
  nonce: varchar("nonce", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("idx_wallet").on(table.walletAddress),
  nonceIdx: index("idx_nonce").on(table.nonce),
}));
```

## Authentication Flows

### 1. Web3 Wallet Sign-In (Primary)

**Flow**:
1. User connects wallet via RainbowKit
2. Frontend requests nonce from backend: `POST /api/auth/nonce`
3. Backend generates unique nonce, stores in DB, returns to frontend
4. Frontend prompts user to sign message with nonce (SIWE standard)
5. User signs message in wallet
6. Frontend sends signature to backend: `POST /api/auth/wallet/verify`
7. Backend verifies signature, creates/updates user, returns JWT session token
8. User is authenticated

**Endpoints**:
```typescript
POST /api/auth/nonce
Body: { walletAddress: string }
Response: { nonce: string }

POST /api/auth/wallet/verify
Body: { 
  walletAddress: string,
  signature: string,
  message: string 
}
Response: { 
  token: string,
  user: User,
  isNewUser: boolean 
}
```

### 2. Email/Password Sign-Up

**Flow**:
1. User provides email + password (+ optional username)
2. Frontend: `POST /api/auth/register`
3. Backend validates, hashes password (bcrypt), creates user
4. Backend sends verification email with token
5. User clicks link: `GET /api/auth/verify-email?token=xxx`
6. Backend verifies token, marks email as verified
7. User can now log in

**Endpoints**:
```typescript
POST /api/auth/register
Body: { 
  email: string,
  password: string,
  username?: string,
  displayName?: string 
}
Response: { 
  message: "Verification email sent",
  userId: number 
}

GET /api/auth/verify-email?token=xxx
Response: { 
  message: "Email verified successfully" 
}

POST /api/auth/login
Body: { 
  email: string,
  password: string 
}
Response: { 
  token: string,
  user: User 
}
```

### 3. Gmail OAuth Sign-In

**Flow**:
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth: `GET /api/auth/google`
3. User authorizes on Google
4. Google redirects back: `GET /api/auth/google/callback?code=xxx`
5. Backend exchanges code for Google profile
6. Backend creates/updates user with googleId
7. Backend creates session, redirects to app
8. User is authenticated

**Endpoints**:
```typescript
GET /api/auth/google
Response: Redirect to Google OAuth

GET /api/auth/google/callback?code=xxx
Response: Redirect to app with session cookie
```

### 4. Account Linking

**Scenario**: User signs in with wallet, wants to add email/password

**Flow**:
1. User authenticated with wallet
2. User goes to Settings → Link Email
3. User provides email + password
4. Frontend: `POST /api/auth/link/email`
5. Backend validates, hashes password, updates user record
6. Backend sends verification email
7. User verifies email
8. Now user can log in with either wallet OR email/password

**Endpoints**:
```typescript
POST /api/auth/link/email
Headers: { Authorization: Bearer <jwt> }
Body: { 
  email: string,
  password: string 
}
Response: { 
  message: "Email linked, verification sent" 
}

POST /api/auth/link/wallet
Headers: { Authorization: Bearer <jwt> }
Body: { 
  walletAddress: string,
  signature: string,
  message: string 
}
Response: { 
  message: "Wallet linked successfully" 
}

POST /api/auth/link/google
Headers: { Authorization: Bearer <jwt> }
Response: Redirect to Google OAuth with state
```

## Implementation Plan

### Phase 1: Database Migration

```sql
-- Add new columns to users table
ALTER TABLE users 
  ADD COLUMN walletAddress VARCHAR(42) UNIQUE,
  ADD COLUMN passwordHash VARCHAR(255),
  ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE,
  ADD COLUMN username VARCHAR(64) UNIQUE,
  ADD COLUMN displayName VARCHAR(128),
  ADD COLUMN avatar TEXT,
  ADD COLUMN googleId VARCHAR(255) UNIQUE;

-- Add indexes
CREATE INDEX idx_wallet ON users(walletAddress);
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_google ON users(googleId);

-- Create new tables
CREATE TABLE email_verification_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_token (token),
  INDEX idx_user (userId)
);

CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usedAt TIMESTAMP NULL,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_token (token),
  INDEX idx_user (userId)
);

CREATE TABLE web3_nonces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  walletAddress VARCHAR(42) NOT NULL,
  nonce VARCHAR(255) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet (walletAddress),
  INDEX idx_nonce (nonce)
);
```

### Phase 2: Backend Implementation

**Dependencies**:
```json
{
  "bcryptjs": "^2.4.3",
  "siwe": "^2.1.4",
  "ethers": "^6.9.0",
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "nodemailer": "^6.9.7",
  "@types/bcryptjs": "^2.4.6",
  "@types/passport": "^1.0.16",
  "@types/passport-google-oauth20": "^2.0.14",
  "@types/nodemailer": "^6.4.14"
}
```

**File Structure**:
```
server/
├── auth/
│   ├── wallet.ts          # Web3 wallet authentication
│   ├── email.ts           # Email/password authentication
│   ├── google.ts          # Google OAuth
│   ├── linking.ts         # Account linking
│   ├── jwt.ts             # JWT token management
│   └── middleware.ts      # Auth middleware
├── services/
│   ├── email.ts           # Email sending service
│   └── crypto.ts          # Password hashing, token generation
└── routes/
    └── auth.ts            # Auth API routes
```

### Phase 3: Frontend Implementation

**Components**:
```
client/src/
├── components/
│   ├── auth/
│   │   ├── WalletSignIn.tsx       # Web3 wallet sign-in
│   │   ├── EmailSignIn.tsx        # Email/password login
│   │   ├── EmailSignUp.tsx        # Email registration
│   │   ├── GoogleSignIn.tsx       # Google OAuth button
│   │   ├── AuthModal.tsx          # Unified auth modal
│   │   └── AccountLinking.tsx     # Link accounts UI
│   └── settings/
│       └── SecuritySettings.tsx   # Manage linked accounts
├── hooks/
│   ├── useAuth.ts                 # Auth state management
│   └── useWalletAuth.ts           # Web3 auth hook
└── utils/
    └── siwe.ts                    # SIWE message generation
```

## Security Considerations

### Password Security
- **Hashing**: bcrypt with salt rounds = 12
- **Minimum length**: 8 characters
- **Complexity**: Require uppercase, lowercase, number, special char
- **Reset tokens**: 32-byte random, 1-hour expiration

### Web3 Security
- **SIWE standard**: Use EIP-4361 Sign-In with Ethereum
- **Nonce**: Unique, one-time use, 10-minute expiration
- **Signature verification**: Verify with ethers.js
- **Replay protection**: Store used nonces

### Session Security
- **JWT**: HS256 algorithm, 7-day expiration
- **Refresh tokens**: Optional, 30-day expiration
- **HttpOnly cookies**: Prevent XSS attacks
- **CSRF protection**: SameSite=Strict

### Email Security
- **Verification required**: Before password reset or sensitive operations
- **Rate limiting**: Max 3 verification emails per hour
- **Token expiration**: 24 hours for verification, 1 hour for reset

## Migration Strategy

### Existing Users (Manus OAuth)
1. Keep `openId` field for backward compatibility
2. On first login with new system, prompt to link wallet or email
3. Gradually migrate users to new authentication
4. After 90 days, deprecate Manus OAuth

### Data Migration
```typescript
// Migrate existing users
UPDATE users 
SET walletAddress = NULL,
    emailVerified = (email IS NOT NULL),
    username = CONCAT('user_', id)
WHERE walletAddress IS NULL;
```

## Testing Plan

### Unit Tests
- Password hashing and verification
- JWT token generation and validation
- Signature verification (SIWE)
- Email token generation

### Integration Tests
- Complete wallet sign-in flow
- Complete email registration flow
- Google OAuth flow
- Account linking flows

### E2E Tests
- User signs in with wallet
- User registers with email
- User links wallet to email account
- User logs in with different methods

## Environment Variables

```env
# JWT
JWT_SECRET=<existing-secret>
JWT_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://governance.fushuma.com/api/auth/google/callback

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@fushuma.com
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=Fushuma Governance <noreply@fushuma.com>

# App
APP_URL=https://governance.fushuma.com
```

## API Documentation

### Authentication Endpoints

```
POST   /api/auth/nonce                    # Get nonce for wallet sign-in
POST   /api/auth/wallet/verify            # Verify wallet signature
POST   /api/auth/register                 # Register with email/password
POST   /api/auth/login                    # Login with email/password
POST   /api/auth/logout                   # Logout (clear session)
GET    /api/auth/me                       # Get current user
GET    /api/auth/verify-email             # Verify email with token
POST   /api/auth/resend-verification      # Resend verification email
POST   /api/auth/forgot-password          # Request password reset
POST   /api/auth/reset-password           # Reset password with token
GET    /api/auth/google                   # Initiate Google OAuth
GET    /api/auth/google/callback          # Google OAuth callback
POST   /api/auth/link/email               # Link email to account
POST   /api/auth/link/wallet              # Link wallet to account
POST   /api/auth/link/google              # Link Google to account
DELETE /api/auth/unlink/email             # Unlink email
DELETE /api/auth/unlink/wallet            # Unlink wallet
DELETE /api/auth/unlink/google            # Unlink Google
```

## Timeline

- **Phase 1** (Database): 2 hours
- **Phase 2** (Backend): 6-8 hours
- **Phase 3** (Frontend): 6-8 hours
- **Phase 4** (Testing): 2-3 hours
- **Phase 5** (Deployment): 1-2 hours

**Total**: 17-23 hours

## Benefits

✅ **No external OAuth dependency** (Manus)
✅ **Web3-native** authentication (wallet-first)
✅ **Flexible** login options (wallet, email, Google)
✅ **Account linking** for seamless UX
✅ **Self-hosted** and fully controlled
✅ **Standards-based** (SIWE, OAuth 2.0)
✅ **Secure** (bcrypt, JWT, HTTPS)

---

**Status**: Design Complete ✅ | Ready for Implementation 🚀

