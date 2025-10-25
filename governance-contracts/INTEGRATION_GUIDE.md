# Integration Guide: Fushuma Governance Hub + Smart Contracts

This guide explains how to integrate the governance smart contracts with the existing Fushuma Governance Hub web application.

## Overview

The integration connects the React frontend with the on-chain governance contracts, enabling users to lock tokens, create proposals, vote, and participate in governance directly from the web interface.

## Architecture Integration

```
┌─────────────────────────────────────────────────────────────┐
│                  Fushuma Governance Hub                      │
│                    (React Frontend)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Lock FUMA   │  │   Proposals  │  │    Voting    │      │
│  │  Interface   │  │   Dashboard  │  │   Interface  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                    ┌──────▼──────┐                          │
│                    │   wagmi +   │                          │
│                    │  RainbowKit │                          │
│                    └──────┬──────┘                          │
└────────────────────────────┼──────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Fushuma Network │
                    │  (Chain ID: 121224)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐    ┌──────▼──────┐
    │  Voting  │      │  Fushuma   │    │ Governance  │
    │  Escrow  │      │  Governor  │    │   Council   │
    └──────────┘      └────────────┘    └─────────────┘
```

## Database Schema Extensions

Add the following tables to your existing database schema (`drizzle/schema.ts`):

### 1. veNFT Positions Table

```typescript
export const venftPositions = mysqlTable("venft_positions", {
  id: int("id").autoincrement().primaryKey(),
  tokenId: int("tokenId").notNull().unique(),
  ownerAddress: varchar("ownerAddress", { length: 42 }).notNull(),
  lockedAmount: bigint("lockedAmount", { mode: "bigint" }).notNull(),
  lockStart: timestamp("lockStart").notNull(),
  lockEnd: timestamp("lockEnd"),
  votingPower: bigint("votingPower", { mode: "bigint" }).notNull(),
  isInExitQueue: boolean("isInExitQueue").default(false),
  exitQueueTime: timestamp("exitQueueTime"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  ownerIdx: index("idx_venft_owner").on(table.ownerAddress),
  tokenIdIdx: index("idx_venft_token_id").on(table.tokenId),
}));

export type VenftPosition = typeof venftPositions.$inferSelect;
export type InsertVenftPosition = typeof venftPositions.$inferInsert;
```

### 2. On-Chain Proposals Table

```typescript
export const onchainProposals = mysqlTable("onchain_proposals", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull().unique(),
  proposerAddress: varchar("proposerAddress", { length: 42 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  metadataHash: varchar("metadataHash", { length: 66 }),
  state: mysqlEnum("state", ["pending", "active", "defeated", "succeeded", "queued", "executed", "cancelled", "vetoed"]).notNull(),
  votesFor: bigint("votesFor", { mode: "bigint" }).default(BigInt(0)),
  votesAgainst: bigint("votesAgainst", { mode: "bigint" }).default(BigInt(0)),
  votesAbstain: bigint("votesAbstain", { mode: "bigint" }).default(BigInt(0)),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  executionTime: timestamp("executionTime"),
  transactionHash: varchar("transactionHash", { length: 66 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  stateIdx: index("idx_onchain_proposal_state").on(table.state),
  proposerIdx: index("idx_onchain_proposal_proposer").on(table.proposerAddress),
  endTimeIdx: index("idx_onchain_proposal_end_time").on(table.endTime),
}));

export type OnchainProposal = typeof onchainProposals.$inferSelect;
export type InsertOnchainProposal = typeof onchainProposals.$inferInsert;
```

### 3. On-Chain Votes Table

```typescript
export const onchainVotes = mysqlTable("onchain_votes", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  tokenId: int("tokenId").notNull(),
  voterAddress: varchar("voterAddress", { length: 42 }).notNull(),
  voteType: mysqlEnum("voteType", ["for", "against", "abstain"]).notNull(),
  votingPower: bigint("votingPower", { mode: "bigint" }).notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  proposalIdx: index("idx_onchain_vote_proposal").on(table.proposalId),
  voterIdx: index("idx_onchain_vote_voter").on(table.voterAddress),
  proposalTokenIdx: index("idx_onchain_vote_proposal_token").on(table.proposalId, table.tokenId),
}));

export type OnchainVote = typeof onchainVotes.$inferSelect;
export type InsertOnchainVote = typeof onchainVotes.$inferInsert;
```

### 4. Council Actions Table

```typescript
export const councilActions = mysqlTable("council_actions", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  actionType: mysqlEnum("actionType", ["veto", "speedup"]).notNull(),
  initiatorAddress: varchar("initiatorAddress", { length: 42 }).notNull(),
  approvals: int("approvals").default(1),
  requiredApprovals: int("requiredApprovals").notNull(),
  executed: boolean("executed").default(false),
  expiresAt: timestamp("expiresAt").notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  proposalIdx: index("idx_council_action_proposal").on(table.proposalId),
  typeIdx: index("idx_council_action_type").on(table.actionType),
  executedIdx: index("idx_council_action_executed").on(table.executed),
}));

export type CouncilAction = typeof councilActions.$inferSelect;
export type InsertCouncilAction = typeof councilActions.$inferInsert;
```

## Frontend Integration

### 1. Contract ABIs

Create a new directory `client/src/contracts/` and add the contract ABIs:

```typescript
// client/src/contracts/abis.ts
export const VotingEscrowABI = [...]; // Copy from out/VotingEscrowIncreasing.sol/VotingEscrow.json
export const FushumaGovernorABI = [...]; // Copy from out/FushumaGovernor.sol/FushumaGovernor.json
export const GovernanceCouncilABI = [...]; // Copy from out/GovernanceCouncil.sol/GovernanceCouncil.json
export const TokenGaugeVoterABI = [...]; // Copy from out/TokenGaugeVoter.sol/TokenGaugeVoter.json
```

### 2. Contract Addresses Configuration

```typescript
// client/src/contracts/addresses.ts
export const GOVERNANCE_CONTRACTS = {
  votingEscrow: "0x..." as `0x${string}`,
  governor: "0x..." as `0x${string}`,
  council: "0x..." as `0x${string}`,
  gaugeVoter: "0x..." as `0x${string}`,
  fumaToken: "0x..." as `0x${string}`,
} as const;
```

### 3. Custom Hooks for Contract Interactions

#### Lock FUMA Hook

```typescript
// client/src/hooks/useCreateLock.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VotingEscrowABI, GOVERNANCE_CONTRACTS } from '@/contracts';

export function useCreateLock() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createLock = async (amount: bigint) => {
    return writeContract({
      address: GOVERNANCE_CONTRACTS.votingEscrow,
      abi: VotingEscrowABI,
      functionName: 'createLock',
      args: [amount],
    });
  };

  return { createLock, isConfirming, isSuccess, hash };
}
```

#### Create Proposal Hook

```typescript
// client/src/hooks/useCreateProposal.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FushumaGovernorABI, GOVERNANCE_CONTRACTS } from '@/contracts';

export function useCreateProposal() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createProposal = async (
    title: string,
    description: string,
    metadataHash: `0x${string}`
  ) => {
    return writeContract({
      address: GOVERNANCE_CONTRACTS.governor,
      abi: FushumaGovernorABI,
      functionName: 'propose',
      args: [title, description, metadataHash],
    });
  };

  return { createProposal, isConfirming, isSuccess, hash };
}
```

#### Cast Vote Hook

```typescript
// client/src/hooks/useCastVote.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { FushumaGovernorABI, GOVERNANCE_CONTRACTS } from '@/contracts';

export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2,
}

export function useCastVote() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const castVote = async (
    proposalId: bigint,
    tokenId: bigint,
    voteType: VoteType
  ) => {
    return writeContract({
      address: GOVERNANCE_CONTRACTS.governor,
      abi: FushumaGovernorABI,
      functionName: 'castVote',
      args: [proposalId, tokenId, voteType],
    });
  };

  const castVoteMultiple = async (
    proposalId: bigint,
    tokenIds: bigint[],
    voteType: VoteType
  ) => {
    return writeContract({
      address: GOVERNANCE_CONTRACTS.governor,
      abi: FushumaGovernorABI,
      functionName: 'castVoteMultiple',
      args: [proposalId, tokenIds, voteType],
    });
  };

  return { castVote, castVoteMultiple, isConfirming, isSuccess, hash };
}
```

### 4. UI Components

#### Lock FUMA Component

```typescript
// client/src/components/LockFuma.tsx
import { useState } from 'react';
import { parseEther } from 'viem';
import { useCreateLock } from '@/hooks/useCreateLock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LockFuma() {
  const [amount, setAmount] = useState('');
  const { createLock, isConfirming, isSuccess } = useCreateLock();

  const handleLock = async () => {
    if (!amount) return;
    await createLock(parseEther(amount));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Lock FUMA Tokens</h2>
      <div>
        <label>Amount to Lock</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter FUMA amount"
        />
      </div>
      <Button onClick={handleLock} disabled={isConfirming}>
        {isConfirming ? 'Locking...' : 'Lock FUMA'}
      </Button>
      {isSuccess && <p className="text-green-600">Lock successful!</p>}
    </div>
  );
}
```

#### Voting Component

```typescript
// client/src/components/VoteOnProposal.tsx
import { useCastVote, VoteType } from '@/hooks/useCastVote';
import { Button } from '@/components/ui/button';

interface VoteOnProposalProps {
  proposalId: bigint;
  tokenId: bigint;
}

export function VoteOnProposal({ proposalId, tokenId }: VoteOnProposalProps) {
  const { castVote, isConfirming, isSuccess } = useCastVote();

  const handleVote = async (voteType: VoteType) => {
    await castVote(proposalId, tokenId, voteType);
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => handleVote(VoteType.For)}
        disabled={isConfirming}
        className="bg-green-600"
      >
        Vote For
      </Button>
      <Button
        onClick={() => handleVote(VoteType.Against)}
        disabled={isConfirming}
        className="bg-red-600"
      >
        Vote Against
      </Button>
      <Button
        onClick={() => handleVote(VoteType.Abstain)}
        disabled={isConfirming}
        className="bg-gray-600"
      >
        Abstain
      </Button>
      {isSuccess && <p className="text-green-600">Vote cast!</p>}
    </div>
  );
}
```

## Event Indexing

To keep the database in sync with on-chain events, implement an event indexer:

### 1. Event Listener Service

```typescript
// server/services/eventIndexer.ts
import { createPublicClient, http, parseAbiItem } from 'viem';
import { fushuma } from '@/lib/chains';
import { db } from '@/db';
import { onchainProposals, onchainVotes } from '@/drizzle/schema';

const client = createPublicClient({
  chain: fushuma,
  transport: http(),
});

export async function indexProposalCreated() {
  const logs = await client.getLogs({
    address: GOVERNANCE_CONTRACTS.governor,
    event: parseAbiItem('event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 startTime, uint256 endTime)'),
    fromBlock: 'earliest',
  });

  for (const log of logs) {
    const { proposalId, proposer, title, startTime, endTime } = log.args;
    
    await db.insert(onchainProposals).values({
      proposalId: Number(proposalId),
      proposerAddress: proposer,
      title,
      startTime: new Date(Number(startTime) * 1000),
      endTime: new Date(Number(endTime) * 1000),
      state: 'pending',
    }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  }
}

export async function indexVoteCast() {
  const logs = await client.getLogs({
    address: GOVERNANCE_CONTRACTS.governor,
    event: parseAbiItem('event VoteCast(uint256 indexed proposalId, uint256 indexed tokenId, address indexed voter, uint8 voteType, uint256 votingPower)'),
    fromBlock: 'earliest',
  });

  for (const log of logs) {
    const { proposalId, tokenId, voter, voteType, votingPower } = log.args;
    
    await db.insert(onchainVotes).values({
      proposalId: Number(proposalId),
      tokenId: Number(tokenId),
      voterAddress: voter,
      voteType: voteType === 0 ? 'against' : voteType === 1 ? 'for' : 'abstain',
      votingPower: BigInt(votingPower),
      transactionHash: log.transactionHash,
    });
  }
}
```

### 2. Scheduled Indexing

```typescript
// server/jobs/indexer.ts
import cron from 'node-cron';
import { indexProposalCreated, indexVoteCast } from '@/services/eventIndexer';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Indexing blockchain events...');
  await indexProposalCreated();
  await indexVoteCast();
  console.log('Indexing complete');
});
```

## API Endpoints

Add tRPC endpoints for governance data:

```typescript
// server/routers/governance.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { db } from '../db';
import { onchainProposals, venftPositions } from '@/drizzle/schema';

export const governanceRouter = router({
  getProposals: publicProcedure.query(async () => {
    return db.select().from(onchainProposals).orderBy(desc(onchainProposals.createdAt));
  }),

  getProposal: publicProcedure
    .input(z.object({ proposalId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(onchainProposals).where(eq(onchainProposals.proposalId, input.proposalId)).limit(1);
    }),

  getUserVeNFTs: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(venftPositions).where(eq(venftPositions.ownerAddress, input.address));
    }),
});
```

## Testing Integration

1. **Deploy contracts to Fushuma testnet**
2. **Update contract addresses in frontend config**
3. **Test lock creation flow**
4. **Test proposal creation**
5. **Test voting with veNFTs**
6. **Verify event indexing works**
7. **Test council actions (if applicable)**

## Production Deployment Checklist

- [ ] Deploy contracts to Fushuma mainnet
- [ ] Update contract addresses in production config
- [ ] Run database migrations for new tables
- [ ] Deploy event indexer service
- [ ] Test all user flows end-to-end
- [ ] Monitor contract events and indexer logs
- [ ] Set up alerts for failed transactions
- [ ] Document user guides for governance participation

## Support

For integration questions, contact governance@fushuma.com or join our Discord.

