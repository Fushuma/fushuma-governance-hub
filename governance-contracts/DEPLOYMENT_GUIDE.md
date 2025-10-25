# Fushuma Governance Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Fushuma governance contracts to the Fushuma network.

## Prerequisites

Before deploying, ensure you have:

1. **Foundry installed** - Install from https://getfoundry.sh/
2. **A funded wallet** - With FUMA tokens for gas fees
3. **VotingEscrow contract deployed** - From Aragon ve-governance (or deploy it first)
4. **Council member addresses** - 5-9 trusted community members

## Step 1: Clone and Setup

```bash
# Navigate to the governance-contracts directory
cd governance-contracts

# Install dependencies (if needed)
forge install

# Build contracts
forge build
```

## Step 2: Configure Environment

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Deployment wallet private key
PRIVATE_KEY=your_private_key_here

# Fushuma Network RPC
FUSHUMA_RPC_URL=https://rpc.fushuma.com

# Contract addresses (you need to deploy VotingEscrow first)
DAO_ADDRESS=0x...  # Your DAO address or admin address
ESCROW_ADDRESS=0x...  # VotingEscrowIncreasing contract address
FUMA_TOKEN_ADDRESS=0x...  # FUMA token address

# Council members
COUNCIL_MEMBER_1=0x...
COUNCIL_MEMBER_2=0x...
COUNCIL_MEMBER_3=0x...
COUNCIL_MEMBER_4=0x...
COUNCIL_MEMBER_5=0x...
```

## Step 3: Deploy VotingEscrow (if not already deployed)

If you haven't deployed the VotingEscrow contract yet, you need to deploy it from the Aragon ve-governance repository:

```bash
# Clone Aragon ve-governance
git clone https://github.com/aragon/ve-governance.git
cd ve-governance

# Follow their deployment instructions
# Or use their factory deployment method
```

**Key parameters for VotingEscrow:**
- Token: FUMA token address
- Min deposit: 100 FUMA (100000000000000000000 wei)
- Warmup period: 604800 (1 week in seconds)
- Cooldown period: 1209600 (2 weeks in seconds)
- Min lock duration: 2592000 (1 month in seconds)
- Max multiplier: 4x

## Step 4: Deploy Governance Contracts

```bash
# Load environment variables
source .env

# Dry run (simulation)
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY

# Actual deployment
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# With contract verification (if block explorer supports it)
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

The deployment will output:
- GovernanceCouncil address
- FushumaGovernor address
- Deployment parameters

Save these addresses - you'll need them for the frontend integration.

## Step 5: Grant Roles

After deployment, you need to grant roles to council members and other addresses.

### Grant Council Member Roles

```bash
# Using cast (Foundry's CLI tool)
cast send $COUNCIL_ADDRESS \
  "grantRole(bytes32,address)" \
  $(cast keccak "COUNCIL_MEMBER") \
  $COUNCIL_MEMBER_1 \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY

# Repeat for all council members
```

Or use a script:

```javascript
// grant-roles.js
const { ethers } = require('ethers');

const COUNCIL_MEMBER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COUNCIL_MEMBER"));
const councilMembers = [
  "0x...",  // Member 1
  "0x...",  // Member 2
  // ... add all members
];

async function grantRoles() {
  const provider = new ethers.JsonRpcProvider(process.env.FUSHUMA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const council = new ethers.Contract(
    process.env.COUNCIL_ADDRESS,
    ["function grantRole(bytes32,address)"],
    wallet
  );

  for (const member of councilMembers) {
    const tx = await council.grantRole(COUNCIL_MEMBER_ROLE, member);
    await tx.wait();
    console.log(`Granted COUNCIL_MEMBER to ${member}`);
  }
}

grantRoles();
```

### Grant Executor Role

```bash
# Grant EXECUTOR_ROLE to an address (could be a multisig or the DAO)
cast send $GOVERNOR_ADDRESS \
  "grantRole(bytes32,address)" \
  $(cast keccak "EXECUTOR") \
  $EXECUTOR_ADDRESS \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Step 6: Verify Deployment

Check that everything is set up correctly:

```bash
# Check council parameters
cast call $COUNCIL_ADDRESS "requiredApprovals()" --rpc-url $FUSHUMA_RPC_URL
cast call $COUNCIL_ADDRESS "vetoPeriod()" --rpc-url $FUSHUMA_RPC_URL

# Check governor parameters
cast call $GOVERNOR_ADDRESS "proposalThreshold()" --rpc-url $FUSHUMA_RPC_URL
cast call $GOVERNOR_ADDRESS "quorumBps()" --rpc-url $FUSHUMA_RPC_URL
cast call $GOVERNOR_ADDRESS "votingPeriod()" --rpc-url $FUSHUMA_RPC_URL

# Check escrow connection
cast call $GOVERNOR_ADDRESS "escrow()" --rpc-url $FUSHUMA_RPC_URL
```

## Step 7: Update Frontend Configuration

Update your Fushuma Governance Hub frontend with the deployed contract addresses:

```typescript
// client/src/contracts/addresses.ts
export const GOVERNANCE_CONTRACTS = {
  votingEscrow: "0x..." as `0x${string}`,  // VotingEscrow address
  governor: "0x..." as `0x${string}`,      // FushumaGovernor address
  council: "0x..." as `0x${string}`,       // GovernanceCouncil address
  fumaToken: "0x..." as `0x${string}`,     // FUMA token address
} as const;
```

## Step 8: Test the System

### Test 1: Create a Lock

```bash
# Approve FUMA tokens
cast send $FUMA_TOKEN_ADDRESS \
  "approve(address,uint256)" \
  $ESCROW_ADDRESS \
  1000000000000000000000 \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY

# Create lock
cast send $ESCROW_ADDRESS \
  "createLock(uint256)" \
  1000000000000000000000 \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Test 2: Create a Proposal

```bash
# Create proposal
cast send $GOVERNOR_ADDRESS \
  "propose(string,string,bytes32)" \
  "Test Proposal" \
  "This is a test proposal" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Test 3: Vote on Proposal

Wait for voting delay to pass, then:

```bash
# Cast vote (VoteType: 0=Against, 1=For, 2=Abstain)
cast send $GOVERNOR_ADDRESS \
  "castVote(uint256,uint256,uint8)" \
  1 \  # Proposal ID
  1 \  # Token ID
  1 \  # Vote For
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY
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

### Updating Parameters

Only addresses with `GOVERNANCE_ADMIN_ROLE` can update parameters:

```bash
# Update proposal threshold
cast send $GOVERNOR_ADDRESS \
  "setProposalThreshold(uint256)" \
  2000000000000000000000 \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY

# Update quorum (in basis points, 1500 = 15%)
cast send $GOVERNOR_ADDRESS \
  "setQuorum(uint256)" \
  1500 \
  --rpc-url $FUSHUMA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Security Considerations

1. **Private Key Management**
   - Never commit `.env` file to git
   - Use hardware wallets for production deployments
   - Consider using a multisig for admin roles

2. **Council Selection**
   - Choose trusted, active community members
   - Ensure geographic and organizational diversity
   - Have a process for removing/replacing council members

3. **Testing**
   - Deploy to testnet first
   - Run extensive tests with real users
   - Monitor for unexpected behavior

4. **Upgradability**
   - Contracts use UUPS proxy pattern
   - Upgrades require `GOVERNANCE_ADMIN_ROLE`
   - Always test upgrades on testnet first

## Troubleshooting

### "Insufficient voting power" error
- Ensure your veNFT has passed the warmup period
- Check that your voting power is above the proposal threshold
- Verify you're using the correct token ID

### "Proposal not active" error
- Check the proposal state with `state(proposalId)`
- Ensure voting period hasn't ended
- Verify voting delay has passed

### "Already voted" error
- Each veNFT can only vote once per proposal
- Use a different veNFT or wait for the next proposal

### Transaction reverts
- Check gas limits
- Verify you have sufficient FUMA for gas
- Ensure you have the required roles

## Support

For deployment issues:
- Check the logs in `deployments/governance.json`
- Review the [ARCHITECTURE.md](ARCHITECTURE.md) for design details
- See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for frontend integration
- Contact: governance@fushuma.com

## Next Steps

After successful deployment:

1. **Announce to Community**
   - Share contract addresses
   - Explain governance process
   - Provide user guides

2. **Monitor Activity**
   - Track proposals and votes
   - Monitor council actions
   - Watch for unusual patterns

3. **Iterate**
   - Gather community feedback
   - Adjust parameters as needed
   - Plan future improvements

## Appendix: Contract ABIs

The contract ABIs are located in:
- `out/FushumaGovernor.sol/FushumaGovernor.json`
- `out/GovernanceCouncil.sol/GovernanceCouncil.json`

Extract the ABI for frontend integration:

```bash
cat out/FushumaGovernor.sol/FushumaGovernor.json | jq '.abi' > FushumaGovernor.abi.json
cat out/GovernanceCouncil.sol/GovernanceCouncil.json | jq '.abi' > GovernanceCouncil.abi.json
```

