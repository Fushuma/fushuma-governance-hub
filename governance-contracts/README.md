# Fushuma Governance Contracts

Smart contracts for the Fushuma decentralized governance system built with Foundry.

## Overview

This repository contains the governance smart contracts for the Fushuma Network, implementing a sophisticated voting system with vote-escrowed NFTs (veNFTs) and council oversight mechanisms.

### Contracts

- **FushumaGovernor**: Main governance contract with veNFT-based voting
- **GovernanceCouncil**: Council with veto and speedup powers for governance oversight
- **IVotingEscrow**: Interface for vote-escrowed NFT integration

### Key Features

- ✅ Vote-escrowed NFT (veNFT) based voting power
- ✅ Token lock-up incentives (longer locks = more voting power)
- ✅ Council veto mechanism for emergency governance
- ✅ Proposal speedup capabilities
- ✅ Upgradeable contracts (UUPS pattern)
- ✅ Comprehensive security features (pausable, reentrancy guards)
- ✅ Time-locked execution for safety

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Node.js 18+ (optional, for additional tooling)
- A wallet with FUMA tokens on Fushuma Network
- RPC access to Fushuma Network

## Installation

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Clone and Install Dependencies

```bash
cd governance-contracts
forge install
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update the following variables:

```env
PRIVATE_KEY=your_private_key_here
RPC_URL=https://rpc.fushuma.com
DAO_ADDRESS=0x... # Your DAO address
ESCROW_ADDRESS=0x... # VotingEscrow contract address
CLOCK_ADDRESS=0x... # Clock contract address
```

## Development

### Build Contracts

```bash
forge build
```

### Run Tests

```bash
# Run all tests
forge test

# Run tests with verbosity
forge test -vvv

# Run specific test
forge test --match-test testProposalCreation

# Run tests with gas reporting
forge test --gas-report
```

### Format Code

```bash
forge fmt
```

### Generate Gas Snapshots

```bash
forge snapshot
```

## Deployment

### Prerequisites for Deployment

Before deploying the governance contracts, ensure you have:

1. **VotingEscrow Contract**: Deploy or obtain the address of the VotingEscrowIncreasing contract
2. **Clock Contract**: Deploy or obtain the address of the Clock contract
3. **DAO Setup**: Have an Aragon DAO deployed or use a multisig as the DAO address
4. **Sufficient FUMA**: Ensure your deployer wallet has enough FUMA for gas fees

### Deploy to Fushuma Network

```bash
# Load environment variables
source .env

# Deploy contracts
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Or use the RPC endpoint name from foundry.toml
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url fushuma \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Verify Contracts on Fumascan

```bash
forge verify-contract \
  --chain-id 121224 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.22 \
  <CONTRACT_ADDRESS> \
  src/FushumaGovernor.sol:FushumaGovernor \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Deployment Output

After successful deployment, contract addresses will be saved to:
- `deployments/governance.json`

Example output:
```json
{
  "council": "0x...",
  "governor": "0x...",
  "network": "fushuma",
  "chainId": 121224,
  "timestamp": 1234567890
}
```

## Post-Deployment Configuration

After deployment, perform these critical steps:

### 1. Grant Council Member Roles

```bash
# Using cast
cast send <COUNCIL_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "COUNCIL_MEMBER_ROLE") \
  <MEMBER_ADDRESS> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### 2. Configure Executor Role

```bash
cast send <GOVERNOR_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "EXECUTOR") \
  <EXECUTOR_ADDRESS> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### 3. Transfer Admin to DAO

```bash
# Transfer admin role to DAO for decentralization
cast send <GOVERNOR_ADDRESS> \
  "grantRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  <DAO_ADDRESS> \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

## Governance Parameters

Default parameters (can be modified in deployment script):

| Parameter | Value | Description |
|-----------|-------|-------------|
| Proposal Threshold | 1000 FUMA | Minimum voting power to create proposals |
| Quorum | 10% | Minimum participation for valid votes |
| Voting Period | 7 days | Duration of voting |
| Voting Delay | 1 day | Delay before voting starts |
| Timelock Delay | 2 days | Delay before execution |
| Veto Period | 3 days | Council veto window |
| Required Approvals | 3 of 5 | Council members needed for actions |

## Architecture

### Contract Interactions

```
┌─────────────────┐
│  Governance Hub │ (Frontend)
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ FushumaGovernor │◄────►│ VotingEscrow NFT │
└────────┬────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│GovernanceCouncil│
└─────────────────┘
```

### Voting Flow

1. User locks FUMA tokens → Receives veNFT
2. User creates proposal (if meets threshold)
3. Voting period begins after delay
4. Users vote with their veNFTs
5. Council can veto or speedup
6. If passed, proposal queued with timelock
7. After timelock, proposal can be executed

## Security

### Audits

⚠️ **These contracts have NOT been audited yet.** Use at your own risk.

### Security Features

- ✅ UUPS Upgradeable pattern
- ✅ ReentrancyGuard on critical functions
- ✅ Pausable for emergency stops
- ✅ Role-based access control
- ✅ Timelock delays for execution
- ✅ Council veto mechanism

### Best Practices

- Always test on testnet first
- Use a multisig for admin roles
- Monitor governance activity
- Implement emergency pause procedures

## Troubleshooting

### Common Issues

**Issue: "Insufficient voting power"**
- Ensure you have locked enough FUMA tokens
- Check your veNFT balance and voting power

**Issue: "Proposal not active"**
- Wait for voting delay to pass
- Check proposal state

**Issue: "Deployment fails"**
- Verify all environment variables are set
- Ensure wallet has sufficient FUMA for gas
- Check RPC URL is accessible

## Testing

Run the test suite:

```bash
# Run all tests
forge test

# Run with coverage
forge coverage

# Run specific test file
forge test --match-path test/FushumaGovernor.t.sol
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Fushuma Network](https://fushuma.com)
- [Fumascan Explorer](https://fumascan.com)
- [Governance Hub](https://governance.fushuma.com)

## Support

- GitHub Issues: [Report bugs or request features]
- Discord: [Join our Discord]
- Email: governance@fushuma.com

