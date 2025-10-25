import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { db } from '../_core/db';

/**
 * Gauge Router
 * Handles gauge voting and resource allocation
 */

export const gaugeRouter = router({
  /**
   * List all gauges
   */
  list: publicProcedure
    .input(z.object({ 
      activeOnly: z.boolean().optional().default(true) 
    }))
    .query(async ({ input }) => {
      // Mock data for now
      const gauges = [
        {
          id: 1,
          gaugeId: 1,
          name: 'Development Grants',
          description: 'Funding for ecosystem development projects and grants',
          gaugeType: 'grant' as const,
          contractAddress: '0x1234567890123456789012345678901234567890',
          weight: 4500,
          totalVotes: 562500,
          isActive: true,
          addedAtEpoch: 0,
          currentAllocation: 180000,
          votersCount: 15,
        },
        {
          id: 2,
          gaugeId: 2,
          name: 'Treasury Operations',
          description: 'Core treasury operations and protocol maintenance',
          gaugeType: 'treasury' as const,
          contractAddress: '0x2345678901234567890123456789012345678901',
          weight: 3000,
          totalVotes: 375000,
          isActive: true,
          addedAtEpoch: 0,
          currentAllocation: 120000,
          votersCount: 12,
        },
        {
          id: 3,
          gaugeId: 3,
          name: 'Marketing & Growth',
          description: 'Marketing campaigns and ecosystem growth initiatives',
          gaugeType: 'treasury' as const,
          contractAddress: '0x3456789012345678901234567890123456789012',
          weight: 2500,
          totalVotes: 312500,
          isActive: true,
          addedAtEpoch: 0,
          currentAllocation: 100000,
          votersCount: 10,
        },
        {
          id: 4,
          gaugeId: 4,
          name: 'Protocol Parameters',
          description: 'Adjustments to protocol parameters and configurations',
          gaugeType: 'parameter' as const,
          contractAddress: '0x4567890123456789012345678901234567890123',
          weight: 0,
          totalVotes: 0,
          isActive: true,
          addedAtEpoch: 1,
          currentAllocation: 0,
          votersCount: 0,
        },
        {
          id: 5,
          gaugeId: 5,
          name: 'Community Initiatives',
          description: 'Community-driven projects and initiatives',
          gaugeType: 'grant' as const,
          contractAddress: '0x5678901234567890123456789012345678901234',
          weight: 0,
          totalVotes: 0,
          isActive: false,
          addedAtEpoch: 0,
          currentAllocation: 0,
          votersCount: 0,
        },
      ];

      if (input.activeOnly) {
        return gauges.filter(g => g.isActive);
      }
      
      return gauges;
    }),

  /**
   * Get gauge by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // Mock data
      const gauges: Record<number, any> = {
        1: {
          id: 1,
          gaugeId: 1,
          name: 'Development Grants',
          description: 'Funding for ecosystem development projects and grants',
          gaugeType: 'grant' as const,
          contractAddress: '0x1234567890123456789012345678901234567890',
          weight: 4500,
          totalVotes: 562500,
          isActive: true,
          addedAtEpoch: 0,
          currentAllocation: 180000,
          votersCount: 15,
          historicalWeights: [
            { epoch: 0, weight: 4200, allocation: 168000 },
            { epoch: 1, weight: 4500, allocation: 180000 },
          ],
          topVoters: [
            { address: '0xabc...123', votingPower: 50000, weight: 10000 },
            { address: '0xdef...456', votingPower: 40000, weight: 10000 },
          ],
        },
      };

      return gauges[input.id] || null;
    }),

  /**
   * Get user's votes
   */
  getUserVotes: publicProcedure
    .input(z.object({ 
      userId: z.number().optional(),
      address: z.string().optional(),
      epoch: z.number().optional(),
    }))
    .query(async ({ input }) => {
      // Mock data
      if (!input.userId && !input.address) {
        return [];
      }

      return [
        {
          id: 1,
          gaugeId: 1,
          gaugeName: 'Development Grants',
          weight: 5000, // 50%
          votingPower: 100000,
          epoch: input.epoch || 1,
          timestamp: new Date(),
        },
        {
          id: 2,
          gaugeId: 2,
          gaugeName: 'Treasury Operations',
          weight: 3000, // 30%
          votingPower: 100000,
          epoch: input.epoch || 1,
          timestamp: new Date(),
        },
        {
          id: 3,
          gaugeId: 3,
          gaugeName: 'Marketing & Growth',
          weight: 2000, // 20%
          votingPower: 100000,
          epoch: input.epoch || 1,
          timestamp: new Date(),
        },
      ];
    }),

  /**
   * Get gauge distributions
   */
  getDistributions: publicProcedure
    .input(z.object({ 
      gaugeId: z.number(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      // Mock data
      const distributions = [];
      for (let i = 0; i < input.limit; i++) {
        distributions.push({
          id: i + 1,
          gaugeId: input.gaugeId,
          epoch: i,
          amount: 150000 + i * 10000,
          weight: 4000 + i * 100,
          distributedAt: new Date(Date.now() - i * 14 * 24 * 60 * 60 * 1000),
          claimed: i > 0,
          claimedAt: i > 0 ? new Date(Date.now() - i * 14 * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000) : null,
        });
      }
      return distributions;
    }),

  /**
   * Vote on gauges (mock - will be replaced with blockchain interaction)
   */
  vote: publicProcedure
    .input(z.object({
      votes: z.array(z.object({
        gaugeId: z.number(),
        weight: z.number().min(0).max(10000),
      })),
      veNftId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Validate total weight = 10000 (100%)
      const totalWeight = input.votes.reduce((sum, v) => sum + v.weight, 0);
      if (totalWeight !== 10000) {
        throw new Error('Total weight must equal 10000 (100%)');
      }

      // Mock success response
      return {
        success: true,
        message: 'Votes recorded successfully',
        txHash: '0x' + Math.random().toString(16).substring(2, 66),
        votes: input.votes,
      };
    }),

  /**
   * Get gauge statistics
   */
  getStats: publicProcedure
    .input(z.object({ gaugeId: z.number() }))
    .query(async ({ input }) => {
      // Mock statistics
      return {
        gaugeId: input.gaugeId,
        totalVotingPower: 562500,
        totalDistributed: 1800000,
        avgWeight: 4300,
        votersCount: 15,
        distributionsCount: 10,
        activeGrants: 5,
        claimRate: 0.95,
        historicalData: [
          { epoch: 0, weight: 4200, votes: 525000, allocation: 168000 },
          { epoch: 1, weight: 4500, votes: 562500, allocation: 180000 },
        ],
      };
    }),

  /**
   * Get gauge leaderboard
   */
  getLeaderboard: publicProcedure
    .input(z.object({ 
      epoch: z.number().optional(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      // Mock leaderboard
      const gauges = [
        { id: 1, name: 'Development Grants', weight: 4500, rank: 1, change: 0 },
        { id: 2, name: 'Treasury Operations', weight: 3000, rank: 2, change: 0 },
        { id: 3, name: 'Marketing & Growth', weight: 2500, rank: 3, change: 0 },
        { id: 4, name: 'Protocol Parameters', weight: 0, rank: 4, change: 0 },
      ];

      return gauges.slice(0, input.limit);
    }),
});

