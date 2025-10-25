# Fushuma Governance Architecture

## Overview

This document outlines the governance architecture for Fushuma, combining Aragon's ve-governance model with a council-based oversight mechanism. The system incentivizes long-term token locking while providing safety mechanisms through council oversight.

## Core Components

### 1. Vote-Escrowed NFT System (veNFT)

**Contract**: `VotingEscrowIncreasing.sol`

Users lock FUMA tokens to receive veNFTs (ERC721) with the following properties:

- **Increasing Voting Power**: Voting power starts at the locked amount and increases over time up to a maximum multiplier
- **Lock Duration Incentive**: Longer locks = higher maximum voting power
- **Warmup Period**: New locks have a warmup period before they can vote
- **Exit Queue**: Users can exit anytime but must wait in a cooldown queue
- **Merging & Splitting**: NFTs can be merged or split for flexibility
- **Optional Delegation**: Voting power can be delegated to other addresses

**Key Parameters**:
- Minimum deposit amount
- Warmup period (e.g., 1 week)
- Cooldown period (e.g., 2 weeks)
- Minimum lock duration (e.g., 1 month)
- Exit fee percentage (optional)
- Maximum voting power multiplier (e.g., 4x)

### 2. Gauge Voting System

**Contract**: `TokenGaugeVoter.sol`

Allows veNFT holders to vote on various gauges (funding allocations, grants, projects):

- **Split Voting**: Users can distribute their voting power across multiple options
- **Epoch-based**: Voting happens in defined epochs (e.g., weekly or monthly)
- **Gauge Management**: Council can create, activate, and deactivate gauges
- **Vote Tracking**: All votes are recorded on-chain for transparency

### 3. Governance Proposals

**Contract**: `FushumaGovernor.sol` (Custom)

Handles governance proposals with dual-layer approval:

**Proposal Types**:
- **Standard Proposals**: General governance decisions
- **Grant Proposals**: Development grant allocations
- **Improvement Proposals**: Protocol upgrades and changes
- **Emergency Proposals**: Time-sensitive decisions

**Voting Mechanism**:
- People vote with their veNFT voting power
- Quorum requirements based on total voting power
- Voting period (e.g., 7 days)
- Execution delay (timelock)

### 4. Council Oversight

**Contract**: `GovernanceCouncil.sol` (Custom)

A multi-signature council with special powers:

**Powers**:
- **Veto**: Can veto proposals within a veto period (e.g., 3 days after proposal passes)
- **Speedup**: Can fast-track emergency proposals or critical grants
- **Guardian**: Can pause the system in case of emergencies
- **Gauge Management**: Can create and manage voting gauges

**Council Composition**:
- 5-9 trusted community members
- Requires majority approval for actions (e.g., 3 of 5, or 5 of 9)
- Council members can be changed through governance

**Limitations**:
- Cannot create proposals (only people can)
- Cannot directly execute proposals (only veto or speedup)
- Actions are transparent and logged on-chain
- Veto power expires after a certain period

## Governance Flow

### Standard Proposal Flow

1. **Proposal Creation**
   - User with minimum veNFT voting power creates proposal
   - Proposal enters "pending" state
   - Voting period starts after delay

2. **Voting Period**
   - veNFT holders vote for/against/abstain
   - Voting power calculated based on locked amount and duration
   - Users can change votes during voting period

3. **Proposal Passes**
   - Quorum reached (e.g., 10% of total voting power)
   - More "for" than "against" votes
   - Enters "passed" state

4. **Council Review Period**
   - Council has 3 days to review
   - Can veto if proposal is harmful
   - If no veto, proposal proceeds

5. **Execution**
   - After timelock delay (e.g., 2 days)
   - Proposal is executed on-chain
   - State changes to "executed"

### Speedup Flow (Council-Initiated)

1. **Emergency Situation**
   - Critical bug fix needed
   - Time-sensitive grant approval
   - Urgent protocol change

2. **Council Speedup**
   - Council votes to speedup (requires majority)
   - Reduces voting period (e.g., 2 days instead of 7)
   - Reduces or removes execution delay

3. **Expedited Voting**
   - Community votes in shortened period
   - Still requires quorum
   - Executes immediately after passing

### Grant Allocation Flow

1. **Grant Proposal Submission**
   - Developer submits grant application
   - Creates on-chain proposal linked to grant

2. **Gauge Voting**
   - Grant enters gauge voting
   - veNFT holders allocate voting power to grants
   - Voting happens over epoch (e.g., monthly)

3. **Council Review**
   - Council reviews top-voted grants
   - Can veto fraudulent or low-quality grants
   - Can speedup critical infrastructure grants

4. **Funding Allocation**
   - Grants receive funding based on votes
   - Milestone-based disbursement
   - Council can pause funding if milestones not met

## Voting Power Calculation

### Linear Increasing Curve

```
votingPower = lockedAmount * (1 + (timeElapsed / maxLockTime) * (maxMultiplier - 1))
```

**Example**:
- User locks 1000 FUMA for 1 year
- Max multiplier: 4x
- Initial voting power: 1000
- After 6 months: 1000 * (1 + 0.5 * 3) = 2500
- After 1 year: 1000 * 4 = 4000

### Quadratic Increasing Curve (Alternative)

```
votingPower = lockedAmount * (1 + ((timeElapsed / maxLockTime)^2) * (maxMultiplier - 1))
```

This rewards longer locks even more aggressively.

## Security Considerations

### Multi-Layer Security

1. **Timelock**: All proposals have execution delay
2. **Council Veto**: Safety valve for harmful proposals
3. **Pausability**: Emergency pause mechanism
4. **Upgradability**: UUPS proxy pattern for bug fixes
5. **Access Control**: Role-based permissions

### Attack Vectors & Mitigations

**Flash Loan Attacks**:
- Mitigated by warmup period
- Voting power increases over time
- Cannot acquire instant voting power

**Governance Takeover**:
- Mitigated by council veto
- Timelock allows community to react
- Exit queue prevents instant dumps

**Council Abuse**:
- Council actions are transparent
- Community can remove council through governance
- Veto power expires over time

## Integration with Existing System

### Database Schema Extensions

The existing Fushuma governance hub database will track:

- veNFT lock positions (tokenId, amount, startTime, endTime)
- Voting power snapshots
- Proposal votes (on-chain + off-chain tracking)
- Council actions (veto, speedup events)
- Grant allocations and milestones

### Frontend Integration

The React frontend will display:

- Lock FUMA interface with APY calculator
- veNFT portfolio (owned NFTs, voting power, lock expiry)
- Active proposals with voting interface
- Gauge voting for grants
- Council activity dashboard

### Smart Contract Deployment

Contracts will be deployed on:
- **Network**: Fushuma (Polygon CDK zkEVM)
- **Chain ID**: 121224
- **Native Token**: FUMA

## Recommended Parameters

### Initial Configuration

```
VotingEscrow:
  - minDeposit: 100 FUMA
  - warmupPeriod: 1 week
  - cooldownPeriod: 2 weeks
  - minLockDuration: 1 month
  - maxLockDuration: 4 years
  - maxMultiplier: 4x
  - exitFee: 0% (can be enabled later)

Governor:
  - votingDelay: 1 day
  - votingPeriod: 7 days
  - proposalThreshold: 1000 voting power
  - quorum: 10% of total voting power
  - timelockDelay: 2 days

Council:
  - members: 5 trusted addresses
  - requiredApprovals: 3 of 5
  - vetoPeriod: 3 days after proposal passes
  - speedupRequirement: 4 of 5 for emergency

GaugeVoter:
  - epochDuration: 1 month
  - gaugeCreationRole: Council
```

## Roadmap

### Phase 1: Core Contracts (Current)
- VotingEscrowIncreasing
- TokenGaugeVoter
- FushumaGovernor
- GovernanceCouncil
- Deployment scripts

### Phase 2: Testing & Audit
- Comprehensive unit tests
- Integration tests
- Fork tests on Fushuma testnet
- Security audit

### Phase 3: Deployment
- Deploy to Fushuma testnet
- Community testing
- Deploy to Fushuma mainnet
- Initialize with council members

### Phase 4: Frontend Integration
- veNFT locking interface
- Proposal creation and voting UI
- Gauge voting interface
- Council dashboard

### Phase 5: Advanced Features
- Delegation system
- NFT marketplace for veNFTs
- Reputation system
- Cross-chain governance

