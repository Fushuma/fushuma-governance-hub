# Fushuma Governance Hub

> The nexus for community interaction, governance, and economic activity in the Fushuma ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://reactjs.org/)
[![Fushuma Network](https://img.shields.io/badge/Network-Fushuma-6366f1)](https://fushuma.com)

## 🌟 Overview

Fushuma Governance Hub is a comprehensive decentralized governance platform built on the Fushuma Network. It provides a unified interface for community members to participate in governance, discover new projects, apply for grants, and engage with the ecosystem.

### Key Features

- **🗳️ Decentralized Governance**: Vote on proposals and shape the future of Fushuma
- **🚀 Project Launchpad**: Discover and support new projects seeking funding
- **💰 Development Grants**: Apply for or review grant applications with full GitHub integration
- **💬 Community Discussion**: Comment on grants and proposals with markdown support
- **📰 Dojo News**: Stay updated with ecosystem developments
- **🌐 Ecosystem Directory**: Explore all projects built on Fushuma
- **🔐 Web3 Wallet Authentication**: Seamless wallet-based sign-in
- **📱 Progressive Web App**: Install on mobile devices

## 🏗️ Tech Stack

**Frontend**: React 19 + TypeScript + Tailwind CSS + wagmi + tRPC  
**Backend**: Express + tRPC + Drizzle ORM + MySQL  
**Blockchain**: Fushuma Network (Chain ID: 121224)  
**Integrations**: GitHub API for grants sync

## 🚀 Quick Start

```bash
git clone https://github.com/Fushuma/fushuma-governance-hub.git
cd fushuma-governance-hub
pnpm install
cp .env.example .env
# Edit .env with your configuration
pnpm db:push
pnpm dev
```

## 📊 Current Features

### Grants System ✅
- Full GitHub integration with Dev_grants repository
- 413+ comments synced from GitHub
- Markdown rendering for rich content
- Reactions and engagement tracking
- Direct GitHub issue links
- Comment posting for logged-in users

### Authentication ✅
- Web3 wallet authentication (MetaMask, WalletConnect)
- JWT session management
- Secure message signing

### UI/UX ✅
- Aragon-inspired professional design
- Dark theme with modern aesthetics
- Responsive layout
- Status badges and visual indicators

## 📁 Key Directories

- `client/` - React frontend application
- `server/` - Express backend with tRPC
- `drizzle/` - Database schema and migrations
- `scripts/` - Utility scripts (GitHub sync, etc.)
- `docs/` - Additional documentation

## 🔐 Authentication

**Web3 Wallet** (Primary)
- Connect wallet → Sign message → Authenticated
- Supports MetaMask, WalletConnect, and more

**Email** (Coming Soon)
- Magic link authentication
- Requires SMTP configuration

## 📞 Support

- **Website**: https://fushuma.com
- **Governance**: https://governance.fushuma.com
- **Email**: governance@fushuma.com

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

Built with ❤️ by the Fushuma Community
