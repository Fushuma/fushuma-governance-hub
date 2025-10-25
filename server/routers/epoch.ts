import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { db } from '../_core/db';
import { epochs } from '../../drizzle/schema-phase2';
import { eq, desc } from 'drizzle-orm';

/**
 * Epoch Router
 * Handles epoch-related queries and operations
 */

export const epochRouter = router({
  /**
   * Get current epoch
   */
  getCurrent: publicProcedure.query(async () => {
    // For now, return mock data until smart contracts are deployed
    // This will be replaced with actual blockchain data
    const now = new Date();
    const epochNumber = Math.floor((now.getTime() - new Date('2025-01-01').getTime()) / (14 * 24 * 60 * 60 * 1000));
    
    const startTime = new Date(new Date('2025-01-01').getTime() + epochNumber * 14 * 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 14 * 24 * 60 * 60 * 1000);
    const votingStartTime = startTime;
    const votingEndTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    const distributionTime = votingEndTime;
    
    // Determine phase
    let phase: 'preparation' | 'voting' | 'distribution' = 'preparation';
    let status: 'upcoming' | 'voting' | 'distribution' | 'completed' = 'completed';
    
    if (now >= votingStartTime && now < votingEndTime) {
      phase = 'voting';
      status = 'voting';
    } else if (now >= votingEndTime && now < new Date(votingEndTime.getTime() + 24 * 60 * 60 * 1000)) {
      phase = 'distribution';
      status = 'distribution';
    } else if (now >= startTime && now < endTime) {
      phase = 'preparation';
      status = 'voting';
    }
    
    // Calculate time remaining
    let timeRemaining = 0;
    if (phase === 'voting') {
      timeRemaining = Math.floor((votingEndTime.getTime() - now.getTime()) / 1000);
    } else if (phase === 'distribution') {
      timeRemaining = Math.floor((new Date(votingEndTime.getTime() + 24 * 60 * 60 * 1000).getTime() - now.getTime()) / 1000);
    } else {
      timeRemaining = Math.floor((endTime.getTime() - now.getTime()) / 1000);
    }
    
    return {
      number: epochNumber,
      startTime,
      endTime,
      votingStartTime,
      votingEndTime,
      distributionTime,
      status,
      phase,
      timeRemaining: Math.max(0, timeRemaining),
      totalVotingPower: 1250000,
      totalDistributed: 500000,
      proposalsCount: 5,
      votersCount: 42,
      finalized: false,
    };
  }),

  /**
   * Get epoch by number
   */
  getById: publicProcedure
    .input(z.object({ number: z.number() }))
    .query(async ({ input }) => {
      // Mock data for now
      const startTime = new Date(new Date('2025-01-01').getTime() + input.number * 14 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 14 * 24 * 60 * 60 * 1000);
      const votingStartTime = startTime;
      const votingEndTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
      const distributionTime = votingEndTime;
      
      return {
        number: input.number,
        startTime,
        endTime,
        votingStartTime,
        votingEndTime,
        distributionTime,
        status: 'completed' as const,
        phase: 'preparation' as const,
        timeRemaining: 0,
        totalVotingPower: 1000000 + input.number * 50000,
        totalDistributed: 400000 + input.number * 20000,
        proposalsCount: 3 + input.number,
        votersCount: 30 + input.number * 5,
        finalized: true,
      };
    }),

  /**
   * Get epoch history
   */
  getHistory: publicProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(async ({ input }) => {
      // Mock data for now
      const currentEpoch = Math.floor((Date.now() - new Date('2025-01-01').getTime()) / (14 * 24 * 60 * 60 * 1000));
      const history = [];
      
      for (let i = 0; i < Math.min(input.limit, currentEpoch + 1); i++) {
        const epochNumber = currentEpoch - i;
        const startTime = new Date(new Date('2025-01-01').getTime() + epochNumber * 14 * 24 * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 14 * 24 * 60 * 60 * 1000);
        const votingStartTime = startTime;
        const votingEndTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        const distributionTime = votingEndTime;
        
        history.push({
          number: epochNumber,
          startTime,
          endTime,
          votingStartTime,
          votingEndTime,
          distributionTime,
          status: i === 0 ? 'voting' : 'completed' as const,
          phase: i === 0 ? 'voting' : 'preparation' as const,
          timeRemaining: 0,
          totalVotingPower: 1000000 + epochNumber * 50000,
          totalDistributed: 400000 + epochNumber * 20000,
          proposalsCount: 3 + epochNumber,
          votersCount: 30 + epochNumber * 5,
          finalized: i !== 0,
        });
      }
      
      return history;
    }),

  /**
   * Get epoch statistics
   */
  getStats: publicProcedure
    .input(z.object({ number: z.number() }))
    .query(async ({ input }) => {
      // Mock statistics
      return {
        epochNumber: input.number,
        totalVotingPower: 1000000 + input.number * 50000,
        totalDistributed: 400000 + input.number * 20000,
        proposalsCount: 3 + input.number,
        votersCount: 30 + input.number * 5,
        participationRate: 0.65 + (input.number % 10) * 0.02,
        topGauges: [
          { name: 'Development Grants', weight: 4500, allocation: 180000 },
          { name: 'Treasury Operations', weight: 3000, allocation: 120000 },
          { name: 'Marketing Fund', weight: 2500, allocation: 100000 },
        ],
        votingTrends: {
          avgVotingPower: 29762,
          uniqueVoters: 30 + input.number * 5,
          totalVotes: 150 + input.number * 10,
        },
      };
    }),

  /**
   * Get epoch timeline
   */
  getTimeline: publicProcedure.query(async () => {
    const currentEpoch = Math.floor((Date.now() - new Date('2025-01-01').getTime()) / (14 * 24 * 60 * 60 * 1000));
    const timeline = [];
    
    // Show current and next 2 epochs
    for (let i = 0; i < 3; i++) {
      const epochNumber = currentEpoch + i;
      const startTime = new Date(new Date('2025-01-01').getTime() + epochNumber * 14 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 14 * 24 * 60 * 60 * 1000);
      const votingStartTime = startTime;
      const votingEndTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
      const distributionTime = votingEndTime;
      const distributionEndTime = new Date(distributionTime.getTime() + 24 * 60 * 60 * 1000);
      
      timeline.push({
        epochNumber,
        startTime,
        endTime,
        phases: [
          {
            name: 'Voting',
            startTime: votingStartTime,
            endTime: votingEndTime,
            duration: 7 * 24 * 60 * 60,
          },
          {
            name: 'Distribution',
            startTime: distributionTime,
            endTime: distributionEndTime,
            duration: 24 * 60 * 60,
          },
          {
            name: 'Preparation',
            startTime: distributionEndTime,
            endTime,
            duration: 6 * 24 * 60 * 60,
          },
        ],
      });
    }
    
    return timeline;
  }),
});

