/**
 * Analytics Service
 * 
 * Provides governance analytics and metrics
 */

import { db } from '../../db';
import { proposals, proposalVotes, delegates, delegations, launchpadProjects, developmentGrants } from '../../../drizzle/schema';
import { sql, eq, gte, lte, and, desc } from 'drizzle-orm';
import { logger } from '../../_core/logger';
import { getCacheService } from '../cache';

export class AnalyticsService {
  private cache = getCacheService();

  /**
   * Get governance overview statistics
   */
  async getGovernanceOverview() {
    return this.cache.getOrSet('analytics:governance:overview', async () => {
      const [
        totalProposals,
        activeProposals,
        totalVotes,
        totalDelegates,
        totalDelegations,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(proposals),
        db.select({ count: sql<number>`count(*)` }).from(proposals).where(eq(proposals.status, 'active')),
        db.select({ count: sql<number>`count(*)` }).from(proposalVotes),
        db.select({ count: sql<number>`count(*)` }).from(delegates),
        db.select({ count: sql<number>`count(*)` }).from(delegations),
      ]);

      return {
        totalProposals: totalProposals[0]?.count || 0,
        activeProposals: activeProposals[0]?.count || 0,
        totalVotes: totalVotes[0]?.count || 0,
        totalDelegates: totalDelegates[0]?.count || 0,
        totalDelegations: totalDelegations[0]?.count || 0,
      };
    }, 60000); // Cache for 1 minute
  }

  /**
   * Get proposal statistics by status
   */
  async getProposalsByStatus() {
    return this.cache.getOrSet('analytics:proposals:by-status', async () => {
      const results = await db
        .select({
          status: proposals.status,
          count: sql<number>`count(*)`,
        })
        .from(proposals)
        .groupBy(proposals.status);

      return results.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {} as Record<string, number>);
    }, 60000);
  }

  /**
   * Get voting participation metrics
   */
  async getVotingParticipation(proposalId?: number) {
    const cacheKey = proposalId 
      ? `analytics:voting:participation:${proposalId}`
      : 'analytics:voting:participation:all';

    return this.cache.getOrSet(cacheKey, async () => {
      let query = db
        .select({
          proposalId: proposalVotes.proposalId,
          totalVotes: sql<number>`count(*)`,
          totalVotingPower: sql<number>`sum(${proposalVotes.votingPower})`,
        })
        .from(proposalVotes);

      if (proposalId) {
        query = query.where(eq(proposalVotes.proposalId, proposalId)) as any;
      }

      const results = await query.groupBy(proposalVotes.proposalId);

      return results;
    }, 30000);
  }

  /**
   * Get top delegates by voting power
   */
  async getTopDelegates(limit: number = 10) {
    return this.cache.getOrSet(`analytics:delegates:top:${limit}`, async () => {
      return await db.query.delegates.findMany({
        limit,
        orderBy: [desc(delegates.votingPower)],
      });
    }, 300000); // Cache for 5 minutes
  }

  /**
   * Get delegation trends over time
   */
  async getDelegationTrends(fromDate: Date, toDate: Date) {
    const cacheKey = `analytics:delegation:trends:${fromDate.getTime()}-${toDate.getTime()}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const results = await db
        .select({
          date: sql<string>`DATE(${delegations.createdAt})`,
          count: sql<number>`count(*)`,
          totalAmount: sql<number>`sum(${delegations.amount})`,
        })
        .from(delegations)
        .where(
          and(
            gte(delegations.createdAt, fromDate),
            lte(delegations.createdAt, toDate)
          )
        )
        .groupBy(sql`DATE(${delegations.createdAt})`);

      return results;
    }, 3600000); // Cache for 1 hour
  }

  /**
   * Get launchpad statistics
   */
  async getLaunchpadStats() {
    return this.cache.getOrSet('analytics:launchpad:stats', async () => {
      const [
        totalProjects,
        byStatus,
        totalFunding,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(launchpadProjects),
        db
          .select({
            status: launchpadProjects.status,
            count: sql<number>`count(*)`,
          })
          .from(launchpadProjects)
          .groupBy(launchpadProjects.status),
        db.select({ total: sql<number>`sum(${launchpadProjects.fundingAmount})` }).from(launchpadProjects),
      ]);

      return {
        totalProjects: totalProjects[0]?.count || 0,
        byStatus: byStatus.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {} as Record<string, number>),
        totalFunding: totalFunding[0]?.total || 0,
      };
    }, 300000);
  }

  /**
   * Get grants statistics
   */
  async getGrantsStats() {
    return this.cache.getOrSet('analytics:grants:stats', async () => {
      const [
        totalGrants,
        byStatus,
        totalFunding,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(developmentGrants),
        db
          .select({
            status: developmentGrants.status,
            count: sql<number>`count(*)`,
          })
          .from(developmentGrants)
          .groupBy(developmentGrants.status),
        db.select({ total: sql<number>`sum(${developmentGrants.fundingRequest})` }).from(developmentGrants),
      ]);

      return {
        totalGrants: totalGrants[0]?.count || 0,
        byStatus: byStatus.reduce((acc, row) => {
          acc[row.status] = row.count;
          return acc;
        }, {} as Record<string, number>),
        totalFunding: totalFunding[0]?.total || 0,
      };
    }, 300000);
  }

  /**
   * Get proposal timeline (recent activity)
   */
  async getProposalTimeline(limit: number = 20) {
    return this.cache.getOrSet(`analytics:proposals:timeline:${limit}`, async () => {
      return await db.query.proposals.findMany({
        limit,
        orderBy: [desc(proposals.createdAt)],
      });
    }, 60000);
  }

  /**
   * Get voter statistics for a proposal
   */
  async getVoterStats(proposalId: number) {
    return this.cache.getOrSet(`analytics:voters:${proposalId}`, async () => {
      const votes = await db.query.proposalVotes.findMany({
        where: eq(proposalVotes.proposalId, proposalId),
      });

      const stats = {
        totalVoters: votes.length,
        votesFor: votes.filter(v => v.voteChoice === 'for').length,
        votesAgainst: votes.filter(v => v.voteChoice === 'against').length,
        votesAbstain: votes.filter(v => v.voteChoice === 'abstain').length,
        totalVotingPower: votes.reduce((sum, v) => sum + v.votingPower, 0),
        votingPowerFor: votes.filter(v => v.voteChoice === 'for').reduce((sum, v) => sum + v.votingPower, 0),
        votingPowerAgainst: votes.filter(v => v.voteChoice === 'against').reduce((sum, v) => sum + v.votingPower, 0),
        votingPowerAbstain: votes.filter(v => v.voteChoice === 'abstain').reduce((sum, v) => sum + v.votingPower, 0),
      };

      return stats;
    }, 30000);
  }

  /**
   * Invalidate cache for specific analytics
   */
  invalidateCache(pattern?: string) {
    if (pattern) {
      this.cache.invalidatePattern(new RegExp(pattern));
    } else {
      this.cache.invalidatePattern(/^analytics:/);
    }
    logger.info('Analytics cache invalidated');
  }
}

// Export singleton instance
let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

