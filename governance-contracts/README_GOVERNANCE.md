# Fushuma Governance Contracts

Smart contracts for Fushuma's decentralized governance system, combining vote-escrowed NFTs (veNFTs) with council oversight mechanisms.

## Overview

This governance system enables the Fushuma community to make decisions through a dual-layer approach that balances decentralization with security and efficiency. The system incentivizes long-term token locking while providing safety mechanisms through council oversight.

### Key Features

**Vote-Escrowed NFTs (veNFTs)**
- Users lock FUMA tokens to receive ERC721 NFTs representing their position
- Voting power increases over time based on lock duration
- Longer locks receive higher voting power multipliers (up to 4x)
- Warmup period prevents flash loan attacks
- Exit queue with cooldown period for withdrawals

**People Voting**
- Token holders vote on proposals using their veNFT voting power
- Quorum-based decision making (default 10% of total voting power)
- Multiple voting options: For, Against, Abstain
- Vote with multiple veNFTs in a single transaction

**Council Oversight**
- Multi-signature council with veto and speedup powers
- Can veto harmful proposals within a veto period
- Can fast-track critical proposals or grants
- Transparent on-chain actions
- Council members managed through governance

## Architecture

### Core Contracts

1. **VotingEscrowIncreasing** (from Aragon ve-governance) - Manages FUMA token locks and veNFT minting
2. **FushumaGovernor** - Main governance contract for proposal management
3. **GovernanceCouncil** - Multi-signature council with veto and speedup powers
4. **TokenGaugeVoter** (from Aragon ve-governance) - Enables gauge voting for grant allocations

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design documentation.

## Installation

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone and setup
git clone <repository-url>
cd governance-contracts
forge install
forge build
```

## Deployment

Create a `.env` file:

```env
PRIVATE_KEY=your_private_key
FUSHUMA_RPC_URL=https://rpc.fushuma.com
DAO_ADDRESS=0x...
ESCROW_ADDRESS=0x...
CLOCK_ADDRESS=0x...
```

Deploy contracts:

```bash
source .env
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $FUSHUMA_RPC_URL \
  --broadcast \
  --verify
```

## Usage Examples

### Lock FUMA Tokens

```solidity
IERC20(fumaToken).approve(escrowAddress, amount);
IVotingEscrow(escrow).createLock(amount);
```

### Create Proposal

```solidity
uint256 proposalId = governor.propose(
    "Proposal Title",
    "Description",
    metadataHash
);
```

### Vote on Proposal

```solidity
// Single veNFT
governor.castVote(proposalId, tokenId, VoteType.For);

// Multiple veNFTs
uint256[] memory tokenIds = [1, 2, 3];
governor.castVoteMultiple(proposalId, tokenIds, VoteType.For);
```

### Council Actions

```solidity
// Veto a proposal
council.initiateVeto(proposalId);
council.approveVeto(proposalId);

// Speedup a proposal
council.initiateSpeedup(proposalId, 2 days, 1 days);
council.approveSpeedup(proposalId);
```

## Testing

```bash
forge test                    # Run all tests
forge test --gas-report       # With gas reporting
forge coverage                # Coverage report
```

## Security

- Timelock delays for execution safety
- Council veto as safety valve
- Emergency pause mechanism
- UUPS upgradability for bug fixes
- Role-based access control

## License

MIT License

## Support

- Documentation: [ARCHITECTURE.md](ARCHITECTURE.md)
- Discord: [Join our Discord]
- Email: governance@fushuma.com

