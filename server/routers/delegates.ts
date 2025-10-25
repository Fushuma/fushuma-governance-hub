import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { delegates, delegations } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { ethereumAddressSchema, paginationSchema } from "../validation";

export const delegatesRouter = router({
  // Get all delegates with pagination
  list: publicProcedure
    .input(paginationSchema.optional())
    .query(async ({ input }) => {
      const limit = input?.limit || 20;
      const offset = input?.offset || 0;

      return await db.query.delegates.findMany({
        limit,
        offset,
        orderBy: [desc(delegates.votingPower)],
      });
    }),

  // Get top delegates by voting power
  topDelegates: publicProcedure
    .input(z.object({ limit: z.number().int().positive().max(100).optional() }))
    .query(async ({ input }) => {
      const limit = input?.limit || 10;

      return await db.query.delegates.findMany({
        limit,
        orderBy: [desc(delegates.votingPower)],
      });
    }),

  // Get delegate by address
  getByAddress: publicProcedure
    .input(z.object({ address: ethereumAddressSchema }))
    .query(async ({ input }) => {
      return await db.query.delegates.findFirst({
        where: eq(delegates.address, input.address.toLowerCase()),
      });
    }),

  // Create or update delegate profile
  updateProfile: protectedProcedure
    .input(z.object({
      address: ethereumAddressSchema,
      name: z.string().min(1).max(255).optional(),
      bio: z.string().max(5000).optional(),
      avatarUrl: z.string().url().max(500).optional(),
      twitterHandle: z.string().max(100).optional(),
      websiteUrl: z.string().url().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.query.delegates.findFirst({
        where: eq(delegates.address, input.address.toLowerCase()),
      });

      if (existing) {
        // Update existing profile
        await db.update(delegates)
          .set({
            name: input.name,
            bio: input.bio,
            avatarUrl: input.avatarUrl,
            twitterHandle: input.twitterHandle,
            websiteUrl: input.websiteUrl,
          })
          .where(eq(delegates.address, input.address.toLowerCase()));
      } else {
        // Create new profile
        await db.insert(delegates).values({
          address: input.address.toLowerCase(),
          name: input.name,
          bio: input.bio,
          avatarUrl: input.avatarUrl,
          twitterHandle: input.twitterHandle,
          websiteUrl: input.websiteUrl,
          votingPower: 0,
          delegatorCount: 0,
        });
      }

      return { success: true };
    }),

  // Get delegators for a delegate
  getDelegators: publicProcedure
    .input(z.object({
      delegateAddress: ethereumAddressSchema,
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().min(0).optional(),
    }))
    .query(async ({ input }) => {
      const limit = input.limit || 20;
      const offset = input.offset || 0;

      return await db.query.delegations.findMany({
        where: eq(delegations.delegate, input.delegateAddress.toLowerCase()),
        limit,
        offset,
        orderBy: [desc(delegations.amount)],
      });
    }),

  // Get delegation history for an address
  getDelegationHistory: publicProcedure
    .input(z.object({
      address: ethereumAddressSchema,
      limit: z.number().int().positive().max(100).optional(),
    }))
    .query(async ({ input }) => {
      const limit = input.limit || 20;

      return await db.query.delegations.findMany({
        where: eq(delegations.delegator, input.address.toLowerCase()),
        limit,
        orderBy: [desc(delegations.createdAt)],
      });
    }),

  // Get delegate stats
  getStats: publicProcedure
    .input(z.object({ address: ethereumAddressSchema }))
    .query(async ({ input }) => {
      const delegate = await db.query.delegates.findFirst({
        where: eq(delegates.address, input.address.toLowerCase()),
      });

      if (!delegate) {
        return null;
      }

      // Get additional stats
      const delegatorsList = await db.query.delegations.findMany({
        where: eq(delegations.delegate, input.address.toLowerCase()),
      });

      return {
        ...delegate,
        totalDelegators: delegatorsList.length,
        delegators: delegatorsList,
      };
    }),
});

