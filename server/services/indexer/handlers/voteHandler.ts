import type { Log } from 'viem';
import { db } from '../../../db';
import { proposalVotes, proposals } from '../../../../drizzle/schema';
import { logger } from '../../../_core/logger';
import { eq } from 'drizzle-orm';

export async function handleVoteCast(log: Log) {
  try {
    // Decode event data
    const { args } = log as any;
    
    if (!args) {
      logger.warn('No args in VoteCast event');
      return;
    }

    const { voter, proposalId, support, weight, reason } = args;

    // Map support value to vote choice
    // 0 = against, 1 = for, 2 = abstain
    let voteChoice: 'for' | 'against' | 'abstain';
    if (support === 0 || support === '0') {
      voteChoice = 'against';
    } else if (support === 1 || support === '1') {
      voteChoice = 'for';
    } else {
      voteChoice = 'abstain';
    }

    // Find the proposal
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.proposalId, Number(proposalId)),
    });

    if (!proposal) {
      logger.warn(`Proposal ${proposalId} not found for vote`);
      return;
    }

    // Record the vote
    await db.insert(proposalVotes).values({
      proposalId: proposal.id,
      userId: 0, // Will be linked later if user is registered
      voterAddress: voter,
      voteChoice,
      votingPower: Number(weight),
      transactionHash: log.transactionHash || undefined,
      reason: reason || undefined,
    });

    // Update proposal vote counts
    const votingPower = Number(weight);
    if (voteChoice === 'for') {
      await db.update(proposals)
        .set({
          votesFor: proposal.votesFor + votingPower,
          totalVotes: proposal.totalVotes + votingPower,
        })
        .where(eq(proposals.id, proposal.id));
    } else if (voteChoice === 'against') {
      await db.update(proposals)
        .set({
          votesAgainst: proposal.votesAgainst + votingPower,
          totalVotes: proposal.totalVotes + votingPower,
        })
        .where(eq(proposals.id, proposal.id));
    } else {
      // Abstain still counts toward total votes
      await db.update(proposals)
        .set({
          totalVotes: proposal.totalVotes + votingPower,
        })
        .where(eq(proposals.id, proposal.id));
    }

    logger.info(`Indexed vote from ${voter} on proposal ${proposalId}: ${voteChoice}`);
  } catch (error) {
    logger.error('Error handling VoteCast event:', error);
  }
}

