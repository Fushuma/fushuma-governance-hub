# Fushuma Governance Hub - Complete User Manual

## 📋 Table of Contents
1. [Overview](#overview)
2. [Network Information](#network-information)
3. [Features](#features)
4. [Getting Started](#getting-started)
5. [User Guide](#user-guide)
6. [Technical Details](#technical-details)
7. [Testing the Application](#testing-the-application)
8. [Deployment](#deployment)

---

## 🌟 Overview

**Fushuma Governance Hub** is a comprehensive decentralized governance platform built for the Fushuma ecosystem. It serves as the central nexus for community interaction, governance participation, project funding, and ecosystem growth.

### Key Highlights
- **Blockchain**: Fushuma Network (Polygon CDK zkEVM Layer 2)
- **Purpose**: Decentralized governance, project launchpad, and community engagement
- **Technology Stack**: React 19, TypeScript, tRPC, Express, Web3, RainbowKit
- **Progressive Web App**: Installable on mobile devices (Android/iOS)

---

## 🌐 Network Information

### Fushuma Network Details
- **Network Name**: Fushuma
- **Chain ID**: 121224 (0x1d988)
- **Native Currency**: FUMA
- **Currency Decimals**: 18
- **RPC URL**: https://rpc.fushuma.com
- **Block Explorer**: https://fumascan.com
- **Network Type**: Mainnet (Polygon CDK zkEVM)

### Adding Fushuma to MetaMask
1. Open MetaMask
2. Click on network dropdown
3. Select "Add Network"
4. Enter the following details:
   - Network Name: Fushuma
   - RPC URL: https://rpc.fushuma.com
   - Chain ID: 121224
   - Currency Symbol: FUMA
   - Block Explorer: https://fumascan.com

---

## ✨ Features

### 1. **Governance System**
Participate in decentralized decision-making for the Fushuma ecosystem.

**Features:**
- **Proposal Creation**: Submit governance proposals for community voting
- **Voting Mechanism**: Vote on active proposals using your FUMA tokens
- **Voting Power**: Your voting power is proportional to your FUMA token holdings
- **Proposal Tracking**: Monitor proposal status (Active, Passed, Rejected, Pending)
- **Real-time Results**: See live voting results with percentage breakdowns
- **Proposal History**: View all past proposals and their outcomes

**How to Use:**
1. Navigate to `/governance`
2. Connect your wallet
3. Browse active proposals
4. Click "Vote For" or "Vote Against" on any proposal
5. Confirm the transaction in your wallet
6. View your voting history in the Dashboard

---

### 2. **Launchpad**
Discover and support new projects seeking funding in the Fushuma ecosystem.

**Features:**
- **Project Discovery**: Browse projects seeking community funding
- **Voting System**: Vote on projects you want to support
- **Project Details**: View comprehensive information about each project
- **Funding Progress**: Track funding goals and current progress
- **Token Information**: See token details, allocation, and vesting schedules
- **Team Information**: Learn about project teams and their backgrounds

**How to Use:**
1. Go to `/launchpad`
2. Browse available projects
3. Click on any project to view details
4. Vote to support projects you believe in
5. Track your supported projects in your Dashboard

---

### 3. **Development Grants**
Apply for or review development grant applications.

**Features:**
- **Grant Applications**: Submit applications for development funding
- **Milestone Tracking**: Monitor project milestones and deliverables
- **Application Review**: Community members can review and comment on applications
- **Funding Tiers**: Multiple grant tiers based on project scope
- **Progress Updates**: Grant recipients can post progress updates
- **Transparency**: All grant information is publicly accessible

**How to Use:**
1. Visit `/grants`
2. Browse active grant applications
3. Click on an application to view full details
4. Review milestones and funding requests
5. Participate in community discussions

---

### 4. **Dojo News**
Stay updated with the latest news and developments in the Fushuma ecosystem.

**Features:**
- **News Feed**: Latest updates from the Fushuma community
- **Article Categories**: Filtered by Development, Community, Partnerships, etc.
- **Rich Media**: Images, videos, and embedded content
- **Social Sharing**: Share articles on social media
- **Comments**: Engage in discussions on news articles
- **Notifications**: Get notified about important announcements

**How to Use:**
1. Navigate to `/news`
2. Browse the latest articles
3. Click to read full articles
4. Comment and engage with the community
5. Share important news with your network

---

### 5. **Ecosystem Directory**
Explore all projects and dApps built on Fushuma.

**Features:**
- **Project Catalog**: Comprehensive directory of ecosystem projects
- **Category Filters**: Filter by DeFi, NFT, Gaming, Infrastructure, etc.
- **Project Profiles**: Detailed information about each project
- **Links & Resources**: Direct links to project websites and social media
- **Statistics**: View project metrics and adoption data
- **Search Functionality**: Find specific projects quickly

**How to Use:**
1. Go to `/ecosystem`
2. Browse or search for projects
3. Filter by category
4. Click on projects to learn more
5. Visit project websites directly from the directory

---

### 6. **Community Showcase**
Share and discover community-created content.

**Features:**
- **User Content**: Community-generated articles, tutorials, and guides
- **Content Categories**: Tutorials, Reviews, Guides, Opinion pieces
- **Upvoting System**: Vote on quality content
- **Author Profiles**: Follow your favorite community contributors
- **Content Submission**: Submit your own content for the community
- **Featured Content**: Highlighted community contributions

**How to Use:**
1. Visit `/community`
2. Browse community content
3. Upvote helpful content
4. Submit your own contributions
5. Follow community contributors

---

### 7. **Personal Dashboard**
Track your activity and participation across the platform.

**Features:**
- **Activity Overview**: See all your governance activities
- **Voting History**: Track all proposals you've voted on
- **Supported Projects**: Monitor projects you've backed
- **Grant Applications**: Manage your grant applications
- **Statistics**: View your participation metrics
- **Notifications**: Stay updated on relevant activities

**How to Use:**
1. Navigate to `/dashboard`
2. Connect your wallet
3. View your activity summary
4. Track your voting power
5. Monitor your supported projects

---

### 8. **Wallet Integration**
Seamless Web3 wallet connectivity powered by RainbowKit.

**Supported Wallets:**
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow Wallet
- Trust Wallet
- And many more...

**Features:**
- **One-Click Connect**: Easy wallet connection
- **Multi-Wallet Support**: Connect multiple wallets
- **Network Switching**: Automatic network detection and switching
- **Transaction Signing**: Secure transaction signing
- **Balance Display**: View your FUMA balance
- **Persistent Sessions**: Stay connected across sessions

**How to Connect:**
1. Click "Connect Wallet" in the navigation bar
2. Select your preferred wallet
3. Approve the connection in your wallet
4. Ensure you're on the Fushuma network (Chain ID: 121224)
5. Start participating in governance

---

### 9. **Progressive Web App (PWA)**
Install the app on your mobile device for a native app experience.

**Features:**
- **Offline Support**: Access cached content offline
- **Home Screen Installation**: Add to home screen like a native app
- **Push Notifications**: Receive important updates (coming soon)
- **Fast Loading**: Optimized performance
- **Responsive Design**: Works perfectly on all screen sizes

**How to Install (Android):**
1. Open the app in Chrome browser
2. Tap the menu (three dots)
3. Select "Add to Home screen"
4. Confirm installation
5. Launch from your home screen

**How to Install (iOS):**
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Confirm installation
5. Launch from your home screen

---

## 🚀 Getting Started

### Prerequisites
- A Web3 wallet (MetaMask recommended)
- FUMA tokens for voting and transactions
- Internet connection

### Step-by-Step Setup

#### 1. Install MetaMask
- Download from https://metamask.io
- Create a new wallet or import existing one
- Secure your seed phrase

#### 2. Add Fushuma Network
- Open MetaMask
- Add custom network with details from [Network Information](#network-information)
- Switch to Fushuma network

#### 3. Get FUMA Tokens
- Purchase FUMA from supported exchanges
- Transfer to your wallet
- Ensure you have enough for gas fees

#### 4. Access the Platform
- Visit the Fushuma Governance Hub URL
- Click "Connect Wallet"
- Select MetaMask
- Approve connection
- Start exploring!

---

## 📖 User Guide

### For Voters

#### Participating in Governance
1. **Connect Wallet**: Ensure your wallet is connected
2. **Check Voting Power**: View your FUMA balance in the dashboard
3. **Browse Proposals**: Go to Governance page
4. **Read Proposals**: Click on proposals to read full details
5. **Cast Vote**: Click "Vote For" or "Vote Against"
6. **Confirm Transaction**: Approve in your wallet
7. **Track Results**: Monitor voting progress

#### Best Practices
- Read proposals thoroughly before voting
- Consider the impact on the ecosystem
- Participate in community discussions
- Vote on multiple proposals to increase engagement
- Check your voting history regularly

---

### For Project Teams

#### Submitting to Launchpad
1. **Prepare Documentation**: Project whitepaper, tokenomics, roadmap
2. **Create Proposal**: Submit project details
3. **Engage Community**: Answer questions and provide updates
4. **Monitor Votes**: Track community support
5. **Launch**: If approved, proceed with token launch

#### Applying for Grants
1. **Review Grant Criteria**: Understand requirements
2. **Prepare Application**: Detailed project plan and milestones
3. **Submit Application**: Fill out grant application form
4. **Community Review**: Respond to feedback
5. **Milestone Delivery**: Complete and report on milestones

---

### For Content Creators

#### Contributing to Community
1. **Create Content**: Write tutorials, guides, or reviews
2. **Submit Content**: Use the community submission form
3. **Engage**: Respond to comments and feedback
4. **Build Reputation**: Consistent quality contributions
5. **Get Featured**: Top content gets highlighted

---

## 🔧 Technical Details

### Architecture

#### Frontend
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State Management**: React Query + tRPC
- **Routing**: Wouter (lightweight routing)
- **Web3**: wagmi + RainbowKit
- **Build Tool**: Vite 7

#### Backend
- **Server**: Express 4
- **API**: tRPC 11 (type-safe API)
- **Database**: MySQL/TiDB with Drizzle ORM
- **Authentication**: Manus OAuth + JWT
- **File Storage**: S3-compatible storage

#### Blockchain Integration
- **Network**: Fushuma (Polygon CDK zkEVM)
- **Wallet Connection**: RainbowKit
- **Web3 Library**: wagmi v2
- **Smart Contracts**: (To be deployed)

### Database Schema

#### Core Tables
- **users**: User profiles and authentication
- **launchpad_projects**: Project listings
- **votes**: Voting records
- **grants**: Grant applications
- **grant_milestones**: Milestone tracking
- **news_articles**: News and updates
- **ecosystem_projects**: Project directory
- **community_posts**: User-generated content
- **comments**: Discussion threads

### API Endpoints (tRPC)

#### Authentication
- `auth.me` - Get current user
- `auth.logout` - Logout user

#### Launchpad
- `launchpad.list` - Get all projects
- `launchpad.getById` - Get project details
- `launchpad.vote` - Vote on project
- `launchpad.getUserVote` - Get user's vote

#### Grants
- `grants.list` - Get all grants
- `grants.getById` - Get grant details
- `grants.getMilestones` - Get grant milestones

#### Governance
- `governance.listProposals` - Get proposals
- `governance.getProposal` - Get proposal details
- `governance.vote` - Cast vote
- `governance.createProposal` - Create new proposal

#### News
- `news.list` - Get news articles
- `news.getById` - Get article details

#### Ecosystem
- `ecosystem.list` - Get ecosystem projects
- `ecosystem.getById` - Get project details

#### Community
- `community.list` - Get community posts
- `community.getById` - Get post details
- `community.create` - Create new post

---

## 🧪 Testing the Application

### Live Demo URL
**Web Application**: [Your deployed URL will be here]

### Test Accounts
For testing purposes, you can use:
- **Test Wallet**: Connect any Web3 wallet on Fushuma network
- **Test Tokens**: Use Fushuma testnet faucet (if available)

### Testing Checklist

#### ✅ Basic Functionality
- [ ] Homepage loads correctly
- [ ] Navigation works on all pages
- [ ] Wallet connection successful
- [ ] Network switching to Fushuma works
- [ ] Responsive design on mobile

#### ✅ Governance
- [ ] Proposals list displays
- [ ] Proposal details page loads
- [ ] Voting buttons work
- [ ] Vote confirmation appears
- [ ] Voting power displays correctly

#### ✅ Launchpad
- [ ] Projects list displays
- [ ] Project details page loads
- [ ] Voting functionality works
- [ ] Project information is complete

#### ✅ Grants
- [ ] Grant applications list
- [ ] Grant details display
- [ ] Milestones show correctly

#### ✅ Other Features
- [ ] News articles load
- [ ] Ecosystem directory works
- [ ] Community posts display
- [ ] Dashboard shows user data
- [ ] PWA installation works

---

## 🚢 Deployment

### Environment Variables Required

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

### Deployment Steps

#### 1. Build the Application
```bash
cd /home/ubuntu/fushuma-governance-hub
pnpm install
pnpm build
```

#### 2. Deploy to Production
- Use the Manus platform "Publish" button
- Or deploy to your own server
- Or use Vercel/Netlify for frontend

#### 3. Configure Custom Domain
- Point your domain to the deployment
- Configure SSL certificate
- Update CORS settings if needed

#### 4. Database Migration
```bash
pnpm db:push
```

#### 5. Seed Initial Data
```bash
npx tsx seed-data.ts
```

---

## 📱 Mobile App (PWA)

### Installation Instructions

#### Android
1. Open https://your-app-url.com in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. Name the app "Fushuma Governance"
4. Tap "Add"
5. App icon appears on home screen

#### iOS
1. Open https://your-app-url.com in Safari
2. Tap Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Name the app "Fushuma Governance"
5. Tap "Add"
6. App icon appears on home screen

### PWA Features
- ✅ Offline access to cached pages
- ✅ Native app-like experience
- ✅ Fast loading times
- ✅ Home screen icon
- ✅ Full-screen mode
- ⏳ Push notifications (coming soon)

---

## 🔐 Security

### Best Practices
- Never share your private keys
- Always verify transaction details before signing
- Use hardware wallets for large holdings
- Enable 2FA on your wallet if available
- Keep your browser and wallet extensions updated
- Verify the website URL before connecting wallet

### Smart Contract Security
- All contracts will be audited before deployment
- Multi-signature requirements for critical operations
- Time-locks on governance actions
- Emergency pause functionality

---

## 🆘 Support

### Getting Help
- **Discord**: [Join Fushuma Discord]
- **Telegram**: [Join Fushuma Telegram]
- **Twitter**: [@FushumaChain]
- **Email**: support@fushuma.com
- **Documentation**: https://docs.fushuma.com

### Common Issues

#### Wallet Won't Connect
- Ensure you're using a supported browser (Chrome, Firefox, Brave)
- Clear browser cache and cookies
- Try a different wallet
- Check if wallet extension is enabled

#### Wrong Network
- Open MetaMask
- Click network dropdown
- Select "Fushuma" or add it manually
- Refresh the page

#### Transaction Failed
- Check if you have enough FUMA for gas fees
- Increase gas limit if needed
- Try again after a few minutes
- Check network status on fumascan.com

---

## 📄 License

This project is open-source under the MIT License.

---

## 🙏 Acknowledgments

- **Polygon CDK**: For the zkEVM infrastructure
- **Aragon**: For governance design inspiration
- **RainbowKit**: For wallet connection UI
- **Manus**: For development platform and tools
- **Fushuma Community**: For continuous support and feedback

---

## 📊 Roadmap

### Phase 1 (Current) ✅
- [x] Core governance functionality
- [x] Launchpad for projects
- [x] Development grants system
- [x] News and community features
- [x] Wallet integration
- [x] PWA support

### Phase 2 (Q2 2025) 🚧
- [ ] On-chain voting implementation
- [ ] Smart contract deployment
- [ ] Token-weighted voting
- [ ] Delegation system
- [ ] Advanced proposal types

### Phase 3 (Q3 2025) 📅
- [ ] Mobile native apps (iOS/Android)
- [ ] Push notifications
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] API for third-party integrations

### Phase 4 (Q4 2025) 🔮
- [ ] Cross-chain governance
- [ ] NFT-based voting
- [ ] Reputation system
- [ ] Quadratic voting
- [ ] AI-powered proposal analysis

---

## 📞 Contact

For business inquiries, partnerships, or technical support:

**Email**: governance@fushuma.com  
**Website**: https://fushuma.com  
**GitHub**: https://github.com/Fushuma

---

*Last Updated: October 24, 2025*  
*Version: 1.0.0*

