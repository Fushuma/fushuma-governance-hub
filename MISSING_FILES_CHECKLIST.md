# Missing Files Checklist for Production Deployment

This checklist identifies critical files that are missing from the Fushuma Governance Hub project and should be created before production deployment.

## Critical Missing Files

### 1. `.gitignore`

**Priority:** 🔴 **High**

**Purpose:** Prevent sensitive files and build artifacts from being committed to version control.

**Recommended content:**

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
.next/
out/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Testing
coverage/

# PM2
.pm2/

# Uploads
uploads/

# Temporary files
*.tmp
.cache/
```

---

### 2. `Dockerfile`

**Priority:** 🔴 **High**

**Purpose:** Build a production-ready container image for the application.

**Recommended content:**

```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Copy necessary files
COPY server ./server
COPY drizzle ./drizzle
COPY shared ./shared
COPY ecosystem.config.js ./

# Create logs and uploads directories
RUN mkdir -p logs uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["pnpm", "start"]
```

---

### 3. `.env.example`

**Priority:** 🟠 **Medium**

**Purpose:** Provide a template for environment variables.

**Recommended content:**

```env
# Database
DATABASE_URL=mysql://username:password@localhost:3306/fushuma_governance

# Authentication
JWT_SECRET=your-secret-key-at-least-32-characters-long
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application
NODE_ENV=production
PORT=3000
VITE_APP_ID=your-app-id
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://your-logo-url.com/logo.png

# Owner
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Owner Name

# Storage
BUILT_IN_FORGE_API_URL=https://forge-api-url
BUILT_IN_FORGE_API_KEY=your-api-key

# Blockchain
VITE_FUSHUMA_RPC_URL=https://rpc.fushuma.com
VITE_FUSHUMA_CHAIN_ID=121224
VITE_FUSHUMA_EXPLORER=https://fumascan.com
VITE_GOVERNOR_CONTRACT_ADDRESS=0x...
VITE_TOKEN_CONTRACT_ADDRESS=0x...
VITE_TREASURY_CONTRACT_ADDRESS=0x...
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics-endpoint
VITE_ANALYTICS_WEBSITE_ID=your-website-id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (for distributed caching and rate limiting)
REDIS_URL=redis://localhost:6379
```

---

### 4. `.dockerignore`

**Priority:** 🟠 **Medium**

**Purpose:** Reduce Docker image size by excluding unnecessary files.

**Recommended content:**

```dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.*.local
dist
build
coverage
.vscode
.idea
*.swp
*.swo
*~
.DS_Store
Thumbs.db
logs
uploads
.pm2
*.tmp
.cache
```

---

### 5. CI/CD Pipeline Configuration

**Priority:** 🔴 **High**

**Purpose:** Automate testing, building, and deployment.

**Example for GitHub Actions (`.github/workflows/ci-cd.yml`):**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install pnpm
        run: npm install -g pnpm@10.4.1
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run linter
        run: pnpm lint
      
      - name: Run type check
        run: pnpm check
      
      - name: Run tests
        run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Add deployment commands here
          echo "Deploy to production server"
```

---

### 6. Linter Configuration (`.eslintrc.js`)

**Priority:** 🟠 **Medium**

**Purpose:** Enforce consistent code style and catch potential errors.

**Recommended content:**

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/react-in-jsx-scope': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

---

### 7. Prettier Configuration (`.prettierrc`)

**Priority:** 🟠 **Medium**

**Purpose:** Automatically format code for consistency.

**Recommended content:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid"
}
```

---

### 8. `LICENSE`

**Priority:** 🟢 **Low**

**Purpose:** Specify the license for the project (MIT as mentioned in README).

**Recommended content:** Standard MIT License text.

---

### 9. `SECURITY.md`

**Priority:** 🟢 **Low**

**Purpose:** Provide security policy and vulnerability reporting instructions.

**Recommended content:**

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please email security@fushuma.com.

Do not open a public issue for security vulnerabilities.

We will respond within 48 hours and work with you to address the issue.
```

---

## Summary

Creating these missing files is essential for a production-ready application. The most critical files are:

1. **`.gitignore`** - Prevents sensitive data leaks
2. **`Dockerfile`** - Enables containerized deployment
3. **`.env.example`** - Guides configuration
4. **CI/CD Pipeline** - Automates quality checks and deployment

Addressing these gaps will significantly improve the security, reliability, and maintainability of the Fushuma Governance Hub.

