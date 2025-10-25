import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getAnalyticsService } from "../services/analytics";

export const analyticsRouter = router({
  // Get governance overview
  overview: publicProcedure.query(async () => {
    const analytics = getAnalyticsService();
    return await analytics.getGovernanceOverview();
  }),

  // Get proposals by status
  proposalsByStatus: publicProcedure.query(async () => {
    const analytics = getAnalyticsService();
    return await analytics.getProposalsByStatus();
  }),

  // Get voting participation
  votingParticipation: publicProcedure
    .input(z.object({ proposalId: z.number().int().positive().optional() }))
    .query(async ({ input }) => {
      const analytics = getAnalyticsService();
      return await analytics.getVotingParticipation(input.proposalId);
    }),

  // Get top delegates
  topDelegates: publicProcedure
    .input(z.object({ limit: z.number().int().positive().max(100).optional() }))
    .query(async ({ input }) => {
      const analytics = getAnalyticsService();
      return await analytics.getTopDelegates(input.limit || 10);
    }),

  // Get delegation trends
  delegationTrends: publicProcedure
    .input(z.object({
      fromDate: z.date(),
      toDate: z.date(),
    }))
    .query(async ({ input }) => {
      const analytics = getAnalyticsService();
      return await analytics.getDelegationTrends(input.fromDate, input.toDate);
    }),

  // Get launchpad statistics
  launchpadStats: publicProcedure.query(async () => {
    const analytics = getAnalyticsService();
    return await analytics.getLaunchpadStats();
  }),

  // Get grants statistics
  grantsStats: publicProcedure.query(async () => {
    const analytics = getAnalyticsService();
    return await analytics.getGrantsStats();
  }),

  // Get proposal timeline
  proposalTimeline: publicProcedure
    .input(z.object({ limit: z.number().int().positive().max(100).optional() }))
    .query(async ({ input }) => {
      const analytics = getAnalyticsService();
      return await analytics.getProposalTimeline(input.limit || 20);
    }),

  // Get voter statistics
  voterStats: publicProcedure
    .input(z.object({ proposalId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const analytics = getAnalyticsService();
      return await analytics.getVoterStats(input.proposalId);
    }),

  // Invalidate analytics cache (admin only)
  invalidateCache: adminProcedure
    .input(z.object({ pattern: z.string().optional() }))
    .mutation(async ({ input }) => {
      const analytics = getAnalyticsService();
      analytics.invalidateCache(input.pattern);
      return { success: true };
    }),
});

