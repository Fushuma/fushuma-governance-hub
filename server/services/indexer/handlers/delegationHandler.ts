import type { Log } from 'viem';
import { db } from '../../../db';
import { delegations, delegates } from '../../../../drizzle/schema';
import { logger } from '../../../_core/logger';
import { eq, sql } from 'drizzle-orm';

export async function handleDelegationChanged(log: Log) {
  try {
    // Decode event data
    const { args } = log as any;
    
    if (!args) {
      logger.warn('No args in DelegateChanged event');
      return;
    }

    const { delegator, fromDelegate, toDelegate } = args;

    // Get the amount being delegated (from DelegateVotesChanged event or token balance)
    // For now, we'll use a placeholder - in production, query the token contract
    const amount = 0n; // TODO: Query actual delegation amount

    // Record the delegation
    if (toDelegate && toDelegate !== '0x0000000000000000000000000000000000000000') {
      await db.insert(delegations).values({
        delegator,
        delegate: toDelegate,
        amount: Number(amount),
        transactionHash: log.transactionHash || '',
        blockNumber: Number(log.blockNumber),
      }).onDuplicateKeyUpdate({
        set: {
          amount: Number(amount),
          transactionHash: log.transactionHash || '',
          blockNumber: Number(log.blockNumber),
        },
      });

      // Ensure delegate profile exists
      await ensureDelegateExists(toDelegate);

      // Update delegate stats
      await updateDelegateStats(toDelegate);
    }

    // Update old delegate stats if exists
    if (fromDelegate && fromDelegate !== '0x0000000000000000000000000000000000000000') {
      await updateDelegateStats(fromDelegate);
    }

    logger.info(`Indexed delegation change: ${delegator} -> ${toDelegate}`);
  } catch (error) {
    logger.error('Error handling DelegateChanged event:', error);
  }
}

export async function handleDelegateVotesChanged(log: Log) {
  try {
    const { args } = log as any;
    
    if (!args) {
      logger.warn('No args in DelegateVotesChanged event');
      return;
    }

    const { delegate, newBalance } = args;

    // Ensure delegate profile exists
    await ensureDelegateExists(delegate);

    // Update voting power
    await db.update(delegates)
      .set({
        votingPower: Number(newBalance),
      })
      .where(eq(delegates.address, delegate));

    logger.info(`Updated voting power for ${delegate}: ${newBalance}`);
  } catch (error) {
    logger.error('Error handling DelegateVotesChanged event:', error);
  }
}

async function ensureDelegateExists(address: string) {
  const existing = await db.query.delegates.findFirst({
    where: eq(delegates.address, address),
  });

  if (!existing) {
    await db.insert(delegates).values({
      address,
      votingPower: 0,
      delegatorCount: 0,
    });
  }
}

async function updateDelegateStats(delegateAddress: string) {
  // Count delegators
  const result = await db.select({
    count: sql<number>`count(*)`,
    totalAmount: sql<number>`sum(${delegations.amount})`,
  })
    .from(delegations)
    .where(eq(delegations.delegate, delegateAddress));

  const stats = result[0];

  if (stats) {
    await db.update(delegates)
      .set({
        delegatorCount: stats.count || 0,
        votingPower: stats.totalAmount || 0,
      })
      .where(eq(delegates.address, delegateAddress));
  }
}

