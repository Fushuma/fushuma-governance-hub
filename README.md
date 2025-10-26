# Fushuma Governance Hub

> The nexus for community interaction, governance, and economic activity in the Fushuma ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://reactjs.org/)
[![Fushuma Network](https://img.shields.io/badge/Network-Fushuma-6366f1)](https://fushuma.com)

## 🌟 Overview

Fushuma Governance Hub is a comprehensive decentralized governance platform built on the Fushuma Network (Polygon CDK zkEVM Layer 2). It provides a unified interface for community members to participate in governance, discover new projects, apply for grants, and engage with the ecosystem.

### Key Features

- **🗳️ Decentralized Governance**: Vote on proposals and shape the future of Fushuma
- **🚀 Project Launchpad**: Discover and support new projects seeking funding
- **💰 Development Grants**: Apply for or review grant applications
- **📰 Dojo News**: Stay updated with ecosystem developments
- **🌐 Ecosystem Directory**: Explore all projects built on Fushuma
- **👥 Community Showcase**: Share and discover community content
- **📊 Personal Dashboard**: Track your participation and activity
- **🔐 Web3 Wallet Integration**: Seamless connection with MetaMask, WalletConnect, and more
- **📱 Progressive Web App**: Install on mobile devices for native app experience

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Vite 7
- wagmi + RainbowKit (Web3)
- tRPC (type-safe API)

**Backend**
- Express 4
- tRPC 11
- Drizzle ORM
- MySQL/TiDB

**Blockchain**
- Fushuma Network (Polygon CDK zkEVM)
- Chain ID: 121224
- Native Token: FUMA

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL/TiDB database
- Web3 wallet (MetaMask recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/Fushuma/fushuma-governance-hub.git
cd fushuma-governance-hub

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
pnpm db:push

# Seed initial data (optional)
npx tsx seed-data.ts

# Start development server
pnpm dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Authentication
JWT_SECRET=your-jwt-secret
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Application
VITE_APP_ID=your-app-id
VITE_APP_TITLE=Fushuma Governance Hub
VITE_APP_LOGO=https://your-logo-url.com/logo.png

# Owner
OWNER_OPEN_ID=owner-open-id
OWNER_NAME=Owner Name

# Storage
BUILT_IN_FORGE_API_URL=https://forge-api-url
BUILT_IN_FORGE_API_KEY=your-api-key

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics-endpoint
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

## 📁 Project Structure

```
fushuma-governance-hub/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # Utilities and configurations
│   │   ├── hooks/         # Custom React hooks
│   │   └── contexts/      # React contexts
│   └── public/            # Static assets
├── server/                # Backend Express application
│   ├── routers.ts        # tRPC routers
│   ├── db.ts             # Database queries
│   └── _core/            # Core server utilities
├── drizzle/              # Database schema and migrations
│   └── schema.ts         # Database schema definition
├── shared/               # Shared types and constants
└── storage/              # S3 storage utilities
```

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Database
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript compiler
```

### Database Schema

The application uses the following main tables:

- `users` - User profiles and authentication
- `launchpad_projects` - Project listings for launchpad
- `votes` - Voting records
- `grants` - Grant applications
- `grant_milestones` - Milestone tracking
- `news_articles` - News and updates
- `ecosystem_projects` - Project directory
- `community_posts` - User-generated content
- `comments` - Discussion threads

## 🌐 Network Configuration

### Fushuma Network

Add Fushuma to your wallet:

- **Network Name**: Fushuma
- **RPC URL**: https://rpc.fushuma.com
- **Chain ID**: 121224
- **Currency Symbol**: FUMA
- **Block Explorer**: https://fumascan.com

## 📱 Progressive Web App

The application is a PWA and can be installed on mobile devices:

### Android Installation
1. Open the app in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. Confirm installation

### iOS Installation
1. Open the app in Safari
2. Tap Share (□↑) → "Add to Home Screen"
3. Confirm installation

## 🔐 Security

- All smart contracts will be audited before deployment
- Multi-signature requirements for critical operations
- Time-locks on governance actions
- Secure wallet connection via RainbowKit
- Environment variables for sensitive data

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Polygon CDK](https://polygon.technology/polygon-cdk) - zkEVM infrastructure
- [Aragon](https://aragon.org/) - Governance design inspiration
- [RainbowKit](https://www.rainbowkit.com/) - Wallet connection UI
- [Manus](https://manus.im/) - Development platform
- Fushuma Community - Continuous support and feedback

## 📞 Support

- **Website**: https://fushuma.com
- **Discord**: [Join our Discord]
- **Twitter**: [@FushumaChain]
- **Email**: governance@fushuma.com
- **Documentation**:
  - [MANUAL.md](MANUAL.md) - User guide
  - [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
  - [QUICKSTART.md](QUICKSTART.md) - Quick start guide
  - [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) - Roadmap and improvements

## 🗺️ Roadmap

### Phase 1 (Current) ✅
- [x] Core governance functionality
- [x] Launchpad for projects
- [x] Development grants system
- [x] News and community features
- [x] Wallet integration
- [x] PWA support

### Phase 2 (Q2 2025)
- [ ] On-chain voting implementation
- [ ] Smart contract deployment
- [ ] Token-weighted voting
- [ ] Delegation system

### Phase 3 (Q3 2025)
- [ ] Mobile native apps
- [ ] Push notifications
- [ ] Advanced analytics
- [ ] Multi-language support

### Phase 4 (Q4 2025)
- [ ] Cross-chain governance
- [ ] NFT-based voting
- [ ] Reputation system
- [ ] Quadratic voting

## 📊 Stats

- **Chain ID**: 121224
- **Network**: Fushuma (Polygon CDK zkEVM)
- **Token**: FUMA
- **Launch Date**: October 2025

---

Built with ❤️ by the Fushuma Community

