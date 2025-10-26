import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { enhancedGithubSync } from '../services/github-sync-enhanced';
import { TRPCError } from '@trpc/server';

export const githubRouter = router({
  /**
   * Trigger manual sync of grants from GitHub
   * Admin only
   */
  syncGrants: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check if user is admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can trigger manual sync',
        });
      }

      try {
        const result = await enhancedGithubSync.syncAllGrants();
        return {
          success: true,
          ...result,
        };
      } catch (error) {
        console.error('Error syncing grants:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync grants from GitHub',
        });
      }
    }),

  /**
   * Get sync status
   */
  getSyncStatus: publicProcedure
    .query(async () => {
      // Return basic sync configuration
      return {
        autoSyncEnabled: process.env.ENABLE_GITHUB_AUTO_SYNC === 'true',
        syncInterval: parseInt(process.env.GITHUB_SYNC_INTERVAL || '3600000'),
        repository: 'Fushuma/Dev_grants',
      };
    }),

  /**
   * Handle GitHub webhook
   * Public endpoint but should be secured with webhook secret
   */
  handleWebhook: publicProcedure
    .input(z.object({
      action: z.string(),
      issue: z.any(),
      signature: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // TODO: Verify webhook signature
        // const isValid = verifyWebhookSignature(input.signature, payload);
        // if (!isValid) throw new Error('Invalid signature');

        await enhancedGithubSync.handleWebhook(input);
        return { success: true };
      } catch (error) {
        console.error('Error handling webhook:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process webhook',
        });
      }
    }),
});

