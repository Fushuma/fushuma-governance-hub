# Fushuma Governance Hub - Phase 2 Architecture

## Overview

This document outlines the architecture for the next phase of governance features, including gauge voting, epoch management, Telegram integration, and proposal creation wizard.

## 1. Gauge Voting System

### Purpose
Allow veNFT holders to direct resource allocation (treasury funds, grants, protocol parameters) through periodic voting on "gauges" representing different allocation targets.

### Architecture

#### Smart Contracts

**GaugeController.sol**
- Manages all gauges and their weights
- Tracks user votes and calculates gauge weights
- Implements vote decay over time
- Supports gauge addition/removal by governance

**Gauge.sol** (Base contract)
- Represents a single allocation target
- Receives allocated resources based on weight
- Tracks distributions and claims
- Extensible for different gauge types

**GrantGauge.sol** (extends Gauge)
- Specific to grant funding
- Links to development grants
- Handles milestone-based distributions

**TreasuryGauge.sol** (extends Gauge)
- Allocates to treasury initiatives
- Supports multi-signature execution
- Time-locked distributions

#### Database Schema

```typescript
// Gauges table
gauges: {
  id: string;
  name: string;
  description: string;
  type: 'grant' | 'treasury' | 'parameter';
  contractAddress: string;
  weight: number;
  totalVotes: number;
  isActive: boolean;
  createdAt: Date;
  metadata: json;
}

// Gauge votes table
gaugeVotes: {
  id: string;
  gaugeId: string;
  userId: string;
  veNftId: number;
  weight: number; // 0-10000 (percentage in basis points)
  votingPower: number;
  epoch: number;
  timestamp: Date;
}

// Gauge distributions table
gaugeDistributions: {
  id: string;
  gaugeId: string;
  epoch: number;
  amount: number;
  weight: number;
  distributedAt: Date;
  txHash: string;
}
```

#### API Endpoints (tRPC)

```typescript
gauge: {
  // Query
  list: () => Gauge[];
  getById: (id: string) => Gauge;
  getUserVotes: (userId: string) => GaugeVote[];
  getDistributions: (gaugeId: string) => Distribution[];
  
  // Mutation
  vote: (votes: { gaugeId: string, weight: number }[]) => Result;
  create: (gauge: CreateGaugeInput) => Gauge;
  update: (id: string, data: UpdateGaugeInput) => Gauge;
  deactivate: (id: string) => Result;
}
```

#### Frontend Components

- `GaugeList.tsx` - Display all active gauges
- `GaugeCard.tsx` - Individual gauge with voting interface
- `GaugeVotingModal.tsx` - Multi-gauge voting interface
- `GaugeDistributionChart.tsx` - Visualize allocations
- `GaugeHistory.tsx` - Historical voting and distributions

### User Flow

1. User connects wallet and views active gauges
2. User allocates voting power across gauges (total = 100%)
3. System validates vote (must own veNFT, total = 100%)
4. Vote is recorded on-chain and in database
5. At epoch end, gauge weights determine resource allocation
6. Resources are distributed to gauges
7. Gauge recipients can claim allocated resources

---

## 2. Epoch Management System

### Purpose
Standardize governance cycles with fixed periods for voting, distribution, and execution.

### Architecture

#### Epoch Structure

```typescript
interface Epoch {
  number: number;
  startTime: Date;
  endTime: Date;
  votingStartTime: Date;
  votingEndTime: Date;
  distributionTime: Date;
  status: 'upcoming' | 'voting' | 'distribution' | 'completed';
  totalVotingPower: number;
  totalDistributed: number;
}
```

#### Epoch Phases

1. **Voting Period** (7 days)
   - Users vote on proposals
   - Users allocate gauge votes
   - No new proposals accepted

2. **Distribution Period** (1 day)
   - Calculate final weights
   - Distribute resources to gauges
   - Execute passed proposals

3. **Preparation Period** (6 days)
   - New proposals can be created
   - Discussion and refinement
   - Prepare for next voting period

**Total Epoch Duration**: 14 days

#### Smart Contract

**EpochManager.sol**
- Tracks current epoch
- Enforces epoch boundaries
- Emits epoch transition events
- Calculates epoch-based rewards

```solidity
contract EpochManager {
    uint256 public constant EPOCH_DURATION = 14 days;
    uint256 public constant VOTING_DURATION = 7 days;
    uint256 public constant DISTRIBUTION_DURATION = 1 day;
    
    uint256 public startTime;
    uint256 public currentEpoch;
    
    function getCurrentEpoch() external view returns (uint256);
    function getEpochStartTime(uint256 epoch) external view returns (uint256);
    function getEpochEndTime(uint256 epoch) external view returns (uint256);
    function isVotingPeriod() external view returns (bool);
    function isDistributionPeriod() external view returns (bool);
    function advanceEpoch() external;
}
```

#### Database Schema

```typescript
epochs: {
  number: number;
  startTime: Date;
  endTime: Date;
  votingStartTime: Date;
  votingEndTime: Date;
  distributionTime: Date;
  status: string;
  totalVotingPower: number;
  totalDistributed: number;
  proposalsCount: number;
  votersCount: number;
  metadata: json;
}
```

#### API Endpoints

```typescript
epoch: {
  getCurrent: () => Epoch;
  getById: (number: number) => Epoch;
  getHistory: (limit: number) => Epoch[];
  getStats: (number: number) => EpochStats;
  getTimeline: () => EpochTimeline;
}
```

#### Frontend Components

- `EpochTimer.tsx` - Countdown to next phase
- `EpochTimeline.tsx` - Visual timeline of epochs
- `EpochStats.tsx` - Statistics for current/past epochs
- `EpochBanner.tsx` - Current phase indicator

---

## 3. Telegram News Integration

### Purpose
Automatically sync news and announcements from Fushuma's Telegram channel to the governance hub.

### Architecture

#### Data Source
- **Telegram Channel**: https://t.me/FushumaChain
- **Method**: Telegram Bot API with webhook or polling

#### Integration Approach

**Option A: Telegram Bot API** (Recommended)
- Create a Telegram bot
- Subscribe to channel updates
- Parse messages and extract news
- Store in database

**Option B: RSS/Web Scraping**
- Use Telegram's public RSS feed (if available)
- Scrape channel webpage
- Less reliable, rate-limited

#### Database Schema

```typescript
news: {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  publishedAt: Date;
  source: 'telegram' | 'manual';
  sourceId: string; // Telegram message ID
  sourceUrl: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  viewCount: number;
  metadata: json;
}
```

#### Service Implementation

**server/services/telegram-sync.ts**

```typescript
class TelegramSyncService {
  private bot: TelegramBot;
  private channelId: string;
  
  async initialize(): Promise<void>;
  async syncMessages(limit?: number): Promise<SyncResult>;
  async parseMessage(message: TelegramMessage): Promise<News>;
  async startPolling(): Promise<void>;
  async setupWebhook(url: string): Promise<void>;
}
```

#### API Endpoints

```typescript
telegram: {
  getSyncStatus: () => SyncStatus;
  syncNews: () => SyncResult;
  getNews: (filters: NewsFilters) => News[];
  getById: (id: string) => News;
}
```

#### Frontend Components

- `NewsList.tsx` - Display news feed
- `NewsCard.tsx` - Individual news item
- `NewsDetail.tsx` - Full news article view
- `NewsTicker.tsx` - Scrolling news ticker
- `TelegramSyncPanel.tsx` - Admin sync management

#### Configuration

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@FushumaChain
ENABLE_TELEGRAM_AUTO_SYNC=true
TELEGRAM_SYNC_INTERVAL=300000  # 5 minutes
```

---

## 4. Proposal Creation Wizard

### Purpose
Guide users through creating well-structured governance proposals with proper formatting and required information.

### Architecture

#### Wizard Steps

**Step 1: Proposal Type**
- Select type: Parameter Change, Treasury Allocation, Grant Funding, General
- Each type has specific requirements

**Step 2: Basic Information**
- Title (required, 10-100 chars)
- Summary (required, 50-500 chars)
- Category selection
- Tags

**Step 3: Detailed Description**
- Rich text editor with markdown support
- Image upload
- Link embedding
- Preview mode

**Step 4: Proposal Actions**
- Define on-chain actions (if applicable)
- Contract calls
- Parameter changes
- Fund transfers

**Step 5: Voting Configuration**
- Voting duration (min/max bounds)
- Quorum threshold
- Approval threshold
- Voting options (for/against/abstain)

**Step 6: Review & Submit**
- Preview full proposal
- Validation checks
- Gas estimation
- Submit transaction

#### Proposal Templates

```typescript
interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  type: ProposalType;
  fields: TemplateField[];
  actions: ActionTemplate[];
  votingConfig: VotingConfig;
}

// Predefined templates
templates = [
  {
    name: 'Grant Funding',
    fields: ['recipient', 'amount', 'milestones', 'deliverables'],
    actions: ['transfer'],
  },
  {
    name: 'Parameter Change',
    fields: ['parameter', 'currentValue', 'proposedValue', 'rationale'],
    actions: ['setParameter'],
  },
  {
    name: 'Treasury Allocation',
    fields: ['recipient', 'amount', 'purpose', 'timeline'],
    actions: ['transfer', 'vest'],
  },
];
```

#### Database Schema

```typescript
proposalDrafts: {
  id: string;
  userId: string;
  title: string;
  summary: string;
  description: string;
  type: string;
  category: string;
  tags: string[];
  actions: json;
  votingConfig: json;
  currentStep: number;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### API Endpoints

```typescript
proposal: {
  // Wizard
  createDraft: (data: CreateDraftInput) => Draft;
  updateDraft: (id: string, data: UpdateDraftInput) => Draft;
  getDraft: (id: string) => Draft;
  deleteDraft: (id: string) => Result;
  
  // Templates
  getTemplates: () => Template[];
  getTemplate: (id: string) => Template;
  
  // Submission
  validateProposal: (draft: Draft) => ValidationResult;
  submitProposal: (draftId: string) => Proposal;
  estimateGas: (draft: Draft) => GasEstimate;
}
```

#### Frontend Components

- `ProposalWizard.tsx` - Main wizard container
- `WizardStep.tsx` - Individual step component
- `WizardNavigation.tsx` - Step navigation
- `ProposalTypeSelector.tsx` - Type selection
- `ProposalEditor.tsx` - Rich text editor
- `ActionBuilder.tsx` - Build on-chain actions
- `VotingConfigForm.tsx` - Configure voting
- `ProposalPreview.tsx` - Preview before submit
- `TemplateSelector.tsx` - Choose from templates

#### Validation Rules

```typescript
const validationRules = {
  title: {
    minLength: 10,
    maxLength: 100,
    required: true,
  },
  summary: {
    minLength: 50,
    maxLength: 500,
    required: true,
  },
  description: {
    minLength: 200,
    required: true,
  },
  votingDuration: {
    min: 3 * 24 * 60 * 60, // 3 days
    max: 14 * 24 * 60 * 60, // 14 days
  },
  quorum: {
    min: 1, // 1%
    max: 50, // 50%
  },
};
```

---

## Integration Points

### Cross-Feature Integration

1. **Gauge Voting + Epochs**
   - Gauge votes are locked for entire epoch
   - Weight calculations happen at epoch boundaries
   - Distributions occur during distribution phase

2. **Proposals + Epochs**
   - Proposals can only be created during preparation phase
   - Voting occurs during voting phase
   - Execution happens during distribution phase

3. **Telegram News + Proposals**
   - News about proposal outcomes
   - Announcement of new proposals
   - Epoch transition notifications

4. **Wizard + Gauges**
   - Special proposal type for creating new gauges
   - Gauge parameter modification proposals

### State Management

```typescript
// Global state
interface GovernanceState {
  currentEpoch: Epoch;
  activeGauges: Gauge[];
  userVotes: GaugeVote[];
  userProposals: Proposal[];
  recentNews: News[];
  draftProposal: Draft | null;
}
```

---

## Technical Stack

### Smart Contracts
- **Language**: Solidity 0.8.20+
- **Framework**: Foundry
- **Testing**: Forge tests
- **Deployment**: Foundry scripts

### Backend
- **Runtime**: Node.js 22+
- **Framework**: Express + tRPC
- **Database**: MySQL/TiDB with Drizzle ORM
- **Cache**: Redis
- **Queue**: Bull (for background jobs)

### Frontend
- **Framework**: React 19
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **UI**: shadcn/ui components
- **Charts**: Recharts
- **Editor**: TipTap (for rich text)

### External Services
- **Telegram**: Bot API
- **GitHub**: Octokit (already integrated)
- **Blockchain**: ethers.js v6

---

## Deployment Strategy

### Phase 1: Smart Contracts
1. Deploy EpochManager
2. Deploy GaugeController
3. Deploy base Gauge contracts
4. Configure initial epochs

### Phase 2: Backend Services
1. Deploy Telegram sync service
2. Deploy epoch tracking service
3. Deploy gauge calculation service
4. Set up cron jobs

### Phase 3: Frontend
1. Deploy epoch components
2. Deploy gauge voting interface
3. Deploy proposal wizard
4. Deploy news feed

### Phase 4: Integration & Testing
1. End-to-end testing
2. Load testing
3. Security audit
4. Mainnet deployment

---

## Security Considerations

### Smart Contracts
- Reentrancy guards on all state-changing functions
- Access control for admin functions
- Pause mechanism for emergencies
- Time locks for critical operations
- Comprehensive test coverage (>90%)

### Backend
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention
- CSRF protection

### Frontend
- Wallet signature verification
- Transaction simulation before execution
- Clear user confirmations
- Error handling and user feedback

---

## Performance Optimization

### Database
- Indexes on frequently queried fields
- Materialized views for complex queries
- Connection pooling
- Query result caching

### API
- Response caching with Redis
- Pagination for large datasets
- GraphQL-style field selection
- Background job processing

### Frontend
- Code splitting by route
- Lazy loading of components
- Image optimization
- Service worker for offline support

---

## Monitoring & Observability

### Metrics
- Epoch transition events
- Gauge vote counts
- Proposal submission rate
- News sync success rate
- API response times
- Error rates

### Logging
- Structured logging (JSON)
- Log levels (debug, info, warn, error)
- Request/response logging
- Error stack traces
- Performance metrics

### Alerts
- Failed epoch transitions
- Sync failures (Telegram, GitHub)
- High error rates
- Performance degradation
- Security events

---

## Timeline Estimate

### Week 1-2: Smart Contracts
- Design and implement contracts
- Write comprehensive tests
- Deploy to testnet

### Week 3-4: Backend Services
- Implement epoch management
- Implement Telegram sync
- Implement gauge calculations
- API endpoints

### Week 5-6: Frontend
- Epoch UI components
- Gauge voting interface
- Proposal wizard
- News feed

### Week 7: Integration & Testing
- End-to-end testing
- Bug fixes
- Performance optimization

### Week 8: Deployment
- Mainnet contract deployment
- Production deployment
- Monitoring setup
- Documentation

**Total**: 8 weeks

---

## Success Metrics

### Adoption
- Number of active voters per epoch
- Number of gauges created
- Proposal submission rate
- News engagement (views, shares)

### Quality
- Proposal quality scores
- Voter participation rate
- Gauge distribution diversity
- News freshness (sync lag)

### Technical
- System uptime (>99.9%)
- API response time (<100ms p95)
- Sync success rate (>99%)
- Zero critical security issues

---

## Future Enhancements

### Phase 3 Features
- Delegation system
- Vote incentives (bribes)
- Multi-signature integration
- Advanced analytics dashboard
- Mobile app (native)

### Optimizations
- Layer 2 scaling
- Gasless voting (meta-transactions)
- Snapshot voting for signaling
- IPFS for proposal storage

---

**Document Version**: 1.0
**Last Updated**: October 25, 2025
**Status**: Design Complete, Ready for Implementation

