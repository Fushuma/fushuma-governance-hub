# Fushuma Governance Smart Contracts - Summary

## What's Included

This package contains a complete governance system for Fushuma, combining vote-escrowed NFTs (veNFTs) with council oversight mechanisms.

### Core Contracts

1. **FushumaGovernor.sol** - Main governance contract
   - Proposal creation and management
   - veNFT-based voting
   - Quorum and threshold enforcement
   - Timelock execution
   - Council integration

2. **GovernanceCouncil.sol** - Multi-signature council
   - Veto mechanism for harmful proposals
   - Speedup mechanism for urgent proposals
   - Configurable approval thresholds
   - Time-limited voting periods

3. **IVotingEscrow.sol** - Interface for veNFT integration
   - Compatible with Aragon ve-governance
   - Voting power calculation
   - Lock management

### Key Features

**Incentivizes Long-Term Locking**
- Users lock FUMA tokens to receive veNFTs
- Voting power increases over time (up to 4x multiplier)
- Longer locks = more voting power
- Warmup period prevents flash loan attacks

**People Voting**
- Token holders vote with their veNFT voting power
- Multiple voting options: For, Against, Abstain
- Vote with multiple veNFTs in one transaction
- Quorum-based decision making (default 10%)

**Council Oversight**
- Multi-signature council (default 3 of 5 required)
- Can veto harmful proposals within 3 days
- Can fast-track critical proposals
- Transparent on-chain actions

**Security**
- Timelock delays for execution safety
- Emergency pause mechanism
- UUPS upgradability for bug fixes
- Role-based access control

## Architecture

```
User locks FUMA → Receives veNFT → Voting power increases over time
                                  ↓
User creates proposal ← Requires minimum voting power
                                  ↓
Community votes with veNFTs ← Active voting period (7 days)
                                  ↓
Proposal passes ← Quorum reached (10%) + majority for
                                  ↓
Council review period ← Can veto (3 days) or speedup
                                  ↓
Proposal queued ← Timelock delay (2 days)
                                  ↓
Proposal executed ← Final veto check
```

## Governance Parameters

### Default Configuration

**FushumaGovernor:**
- Proposal threshold: 1,000 voting power
- Quorum: 10% of total voting power
- Voting delay: 1 day
- Voting period: 7 days
- Timelock delay: 2 days

**GovernanceCouncil:**
- Required approvals: 3 of 5
- Veto period: 3 days after proposal passes
- Veto voting period: 2 days
- Speedup voting period: 1 day

**VotingEscrow (from Aragon):**
- Minimum deposit: 100 FUMA
- Warmup period: 1 week
- Cooldown period: 2 weeks
- Minimum lock duration: 1 month
- Maximum voting power multiplier: 4x

## Documentation

- **README_GOVERNANCE.md** - Quick start guide
- **ARCHITECTURE.md** - Detailed design documentation
- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment instructions
- **INTEGRATION_GUIDE.md** - Frontend integration guide
- **.env.example** - Environment configuration template

## Quick Start

### 1. Install Dependencies

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Build contracts
cd governance-contracts
forge build
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Deploy

```bash
source .env
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### 4. Grant Roles

```bash
# Grant council member roles
cast send $COUNCIL_ADDRESS \
  "grantRole(bytes32,address)" \
  $(cast keccak "COUNCIL_MEMBER") \
  $COUNCIL_MEMBER_ADDRESS \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 5. Integrate with Frontend

Update your Fushuma Governance Hub with the deployed contract addresses. See `INTEGRATION_GUIDE.md` for details.

## Integration with Existing Fushuma Governance Hub

The smart contracts are designed to integrate seamlessly with your existing Fushuma Governance Hub:

### Database Extensions

Add tables to track:
- veNFT positions (tokenId, amount, voting power)
- On-chain proposals (linked to off-chain data)
- On-chain votes (for analytics)
- Council actions (veto/speedup events)

### Frontend Components

Build UI for:
- Lock FUMA interface with APY calculator
- veNFT portfolio viewer
- Proposal creation with IPFS metadata
- Voting interface with multi-veNFT support
- Council dashboard

### Event Indexing

Index blockchain events to keep database in sync:
- ProposalCreated
- VoteCast
- ProposalQueued
- ProposalExecuted
- VetoInitiated
- SpeedupInitiated

See `INTEGRATION_GUIDE.md` for complete implementation details.

## Technology Stack

- **Solidity 0.8.22** - Smart contract language
- **Foundry** - Development framework
- **OpenZeppelin Contracts Upgradeable** - Security-audited base contracts
- **Aragon ve-governance** - veNFT architecture inspiration
- **UUPS Proxy Pattern** - Upgradability

## Security

### Multi-Layer Security

1. **Timelock** - All proposals have execution delay
2. **Council Veto** - Safety valve for harmful proposals
3. **Pausability** - Emergency pause mechanism
4. **Upgradability** - UUPS proxy for bug fixes
5. **Access Control** - Role-based permissions

### Mitigations

- **Flash Loan Attacks** - Warmup period + increasing voting power
- **Governance Takeover** - Council veto + timelock
- **Council Abuse** - Transparent actions + removable through governance

## Testing

Basic tests are included. For production:

```bash
# Run tests
forge test

# Run with gas reporting
forge test --gas-report

# Coverage
forge coverage
```

**Note:** The included tests are basic placeholders. For production deployment, you should:
1. Implement comprehensive unit tests
2. Add integration tests
3. Perform security audit
4. Test on testnet with real users

## Deployment Checklist

Before deploying to mainnet:

- [ ] Deploy and test on Fushuma testnet
- [ ] Conduct security audit
- [ ] Test all user flows end-to-end
- [ ] Prepare council member list
- [ ] Set up monitoring and alerts
- [ ] Prepare user documentation
- [ ] Plan announcement strategy

## Support

- **Documentation**: See included markdown files
- **Issues**: Report via GitHub Issues (after upload)
- **Discord**: [Join Fushuma Discord]
- **Email**: governance@fushuma.com

## License

MIT License - see LICENSE file for details

## Acknowledgments

- **Aragon** - ve-governance architecture and inspiration
- **OpenZeppelin** - Secure contract libraries
- **Polygon CDK** - zkEVM infrastructure for Fushuma Network

---

**Built for Fushuma Network (Chain ID: 121224)**

This governance system empowers the Fushuma community to make decisions together while incentivizing long-term commitment through vote-escrowed tokens and providing safety through council oversight.

