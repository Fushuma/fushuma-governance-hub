import type { Log } from 'viem';
import { db } from '../../../db';
import { proposals } from '../../../../drizzle/schema';
import { logger } from '../../../_core/logger';
import { eq } from 'drizzle-orm';

export async function handleProposalCreated(log: Log) {
  try {
    // Decode event data
    const { args } = log as any;
    
    if (!args) {
      logger.warn('No args in ProposalCreated event');
      return;
    }

    const { proposalId, proposer, description, startBlock, endBlock } = args;

    // Check if proposal already exists
    const existing = await db.query.proposals.findFirst({
      where: eq(proposals.proposalId, Number(proposalId)),
    });

    if (existing) {
      logger.debug(`Proposal ${proposalId} already indexed`);
      return;
    }

    // Calculate dates from blocks (assuming 2s block time)
    const currentBlock = Number(log.blockNumber);
    const blocksToStart = Number(startBlock) - currentBlock;
    const blocksToEnd = Number(endBlock) - currentBlock;
    
    const startDate = new Date(Date.now() + blocksToStart * 2000);
    const endDate = new Date(Date.now() + blocksToEnd * 2000);

    // Create proposal in database
    await db.insert(proposals).values({
      title: description.substring(0, 255), // Use first part as title
      description: description,
      proposer: proposer,
      status: 'pending',
      votesFor: 0,
      votesAgainst: 0,
      totalVotes: 0,
      quorum: 0, // Will be updated from contract
      startDate,
      endDate,
      transactionHash: log.transactionHash || undefined,
      contractAddress: log.address,
      proposalId: Number(proposalId),
    });

    logger.info(`Indexed new proposal: ${proposalId}`);
  } catch (error) {
    logger.error('Error handling ProposalCreated event:', error);
  }
}

export async function handleProposalExecuted(log: Log) {
  try {
    const { args } = log as any;
    
    if (!args) {
      logger.warn('No args in ProposalExecuted event');
      return;
    }

    const { proposalId } = args;

    // Update proposal status
    await db.update(proposals)
      .set({
        status: 'executed',
        executionDate: new Date(),
      })
      .where(eq(proposals.proposalId, Number(proposalId)));

    logger.info(`Proposal ${proposalId} marked as executed`);
  } catch (error) {
    logger.error('Error handling ProposalExecuted event:', error);
  }
}

export async function handleProposalCanceled(log: Log) {
  try {
    const { args } = log as any;
    
    if (!args) {
      logger.warn('No args in ProposalCanceled event');
      return;
    }

    const { proposalId } = args;

    // Update proposal status
    await db.update(proposals)
      .set({
        status: 'cancelled',
      })
      .where(eq(proposals.proposalId, Number(proposalId)));

    logger.info(`Proposal ${proposalId} marked as cancelled`);
  } catch (error) {
    logger.error('Error handling ProposalCanceled event:', error);
  }
}

