import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { blockchainEvents, indexerState } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { getIndexer } from "../services/indexer";
import { ethereumAddressSchema, paginationSchema } from "../validation";

export const blockchainRouter = router({
  // Get blockchain events with filtering
  getEvents: publicProcedure
    .input(z.object({
      eventType: z.string().optional(),
      contractAddress: ethereumAddressSchema.optional(),
      fromBlock: z.number().int().min(0).optional(),
      toBlock: z.number().int().min(0).optional(),
      limit: z.number().int().positive().max(100).optional(),
      offset: z.number().int().min(0).optional(),
    }))
    .query(async ({ input }) => {
      const limit = input.limit || 20;
      const offset = input.offset || 0;

      const conditions = [];
      
      if (input.eventType) {
        conditions.push(eq(blockchainEvents.eventType, input.eventType));
      }
      
      if (input.contractAddress) {
        conditions.push(eq(blockchainEvents.contractAddress, input.contractAddress));
      }
      
      if (input.fromBlock !== undefined) {
        conditions.push(gte(blockchainEvents.blockNumber, input.fromBlock));
      }
      
      if (input.toBlock !== undefined) {
        conditions.push(lte(blockchainEvents.blockNumber, input.toBlock));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return await db.query.blockchainEvents.findMany({
        where,
        limit,
        offset,
        orderBy: [desc(blockchainEvents.blockNumber)],
      });
    }),

  // Get indexer state for a contract
  getIndexerState: publicProcedure
    .input(z.object({ contractAddress: ethereumAddressSchema }))
    .query(async ({ input }) => {
      return await db.query.indexerState.findFirst({
        where: eq(indexerState.contractAddress, input.contractAddress),
      });
    }),

  // Get all indexer states
  getAllIndexerStates: publicProcedure.query(async () => {
    return await db.query.indexerState.findMany();
  }),

  // Manually trigger indexer sync (admin only)
  triggerSync: adminProcedure
    .input(z.object({ contractAddress: ethereumAddressSchema }))
    .mutation(async ({ input }) => {
      const indexer = getIndexer(input.contractAddress);
      // Trigger a sync cycle
      await indexer.start();
      
      return { success: true, message: 'Indexer sync triggered' };
    }),

  // Get event statistics
  getEventStats: publicProcedure
    .input(z.object({
      contractAddress: ethereumAddressSchema.optional(),
      fromBlock: z.number().int().min(0).optional(),
      toBlock: z.number().int().min(0).optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      
      if (input.contractAddress) {
        conditions.push(eq(blockchainEvents.contractAddress, input.contractAddress));
      }
      
      if (input.fromBlock !== undefined) {
        conditions.push(gte(blockchainEvents.blockNumber, input.fromBlock));
      }
      
      if (input.toBlock !== undefined) {
        conditions.push(lte(blockchainEvents.blockNumber, input.toBlock));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const events = await db.query.blockchainEvents.findMany({
        where,
      });

      // Calculate statistics
      const stats = {
        totalEvents: events.length,
        eventsByType: {} as Record<string, number>,
        earliestBlock: events.length > 0 ? Math.min(...events.map(e => Number(e.blockNumber))) : 0,
        latestBlock: events.length > 0 ? Math.max(...events.map(e => Number(e.blockNumber))) : 0,
      };

      events.forEach(event => {
        stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;
      });

      return stats;
    }),
});

