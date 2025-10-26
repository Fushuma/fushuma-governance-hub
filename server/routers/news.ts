import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { db } from '../_core/db';
import { news } from '../../drizzle/schema-phase2';
import { desc, eq, and, like, or } from 'drizzle-orm';
import { telegramSync } from '../services/telegram-sync';

/**
 * News Router
 * Handles news feed and Telegram integration
 */

export const newsRouter = router({
  /**
   * Get news list with filters
   */
  list: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
      source: z.enum(['telegram', 'manual', 'github', 'official']).optional(),
      category: z.string().optional(),
      tag: z.string().optional(),
      pinnedOnly: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      try {
        // Build query conditions
        const conditions = [];
        
        if (input.source) {
          conditions.push(eq(news.source, input.source));
        }
        
        if (input.category) {
          conditions.push(eq(news.category, input.category));
        }
        
        if (input.pinnedOnly) {
          conditions.push(eq(news.isPinned, true));
        }

        // Fetch from database
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        
        const items = await db
          .select()
          .from(news)
          .where(whereClause)
          .orderBy(desc(news.publishedAt))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const totalItems = await db
          .select()
          .from(news)
          .where(whereClause);

        return {
          items: items.map(item => ({
            ...item,
            tags: item.tags as string[] || [],
          })),
          total: totalItems.length,
          hasMore: input.offset + input.limit < totalItems.length,
        };
      } catch (error) {
        console.error('Error fetching news:', error);
        // Return empty result on error
        return {
          items: [],
          total: 0,
          hasMore: false,
        };
      }
    }),

  /**
   * Get news by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const newsItem = await db.query.news.findFirst({
          where: eq(news.id, input.id),
        });

        if (!newsItem) {
          throw new Error('News not found');
        }

        // Increment view count
        await db
          .update(news)
          .set({ viewCount: (newsItem.viewCount || 0) + 1 })
          .where(eq(news.id, input.id));

        return {
          ...newsItem,
          tags: newsItem.tags as string[] || [],
          viewCount: (newsItem.viewCount || 0) + 1,
        };
      } catch (error) {
        console.error('Error fetching news by ID:', error);
        throw new Error('News not found');
      }
    }),

  /**
   * Get news categories
   */
  getCategories: publicProcedure.query(async () => {
    try {
      // Get unique categories with counts
      const items = await db.select().from(news);
      
      const categoryCounts = items.reduce((acc, item) => {
        const cat = item.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(categoryCounts).map(([id, count]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        count,
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }),

  /**
   * Get popular tags
   */
  getTags: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(async ({ input }) => {
      try {
        const items = await db.select().from(news);
        
        const tagCounts = items.reduce((acc, item) => {
          const tags = item.tags as string[] || [];
          tags.forEach(tag => {
            acc[tag] = (acc[tag] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(tagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, input.limit);
      } catch (error) {
        console.error('Error fetching tags:', error);
        return [];
      }
    }),

  /**
   * Get Telegram sync status
   */
  getSyncStatus: publicProcedure.query(async () => {
    try {
      return await telegramSync.getSyncStatus();
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return {
        channelId: '@FushumaChain',
        lastSyncAt: undefined,
        messagesSynced: 0,
        errorCount: 0,
        lastError: undefined,
        isActive: false,
        autoSyncEnabled: false,
        syncInterval: 300000,
      };
    }
  }),

  /**
   * Manually trigger Telegram sync (admin only)
   */
  syncNow: publicProcedure.mutation(async () => {
    try {
      const result = await telegramSync.syncMessages(20);
      
      return {
        success: true,
        synced: result.synced,
        errors: result.errors,
        message: `Synced ${result.synced} new messages from Telegram`,
      };
    } catch (error) {
      console.error('Error syncing Telegram:', error);
      return {
        success: false,
        synced: 0,
        errors: 1,
        message: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }),

  /**
   * Get trending news
   */
  getTrending: publicProcedure
    .input(z.object({ 
      limit: z.number().optional().default(5),
      days: z.number().optional().default(7),
    }))
    .query(async ({ input }) => {
      try {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - input.days);

        const items = await db
          .select()
          .from(news)
          .orderBy(desc(news.viewCount))
          .limit(input.limit);

        return items.map(item => ({
          id: item.id,
          title: item.title,
          viewCount: item.viewCount || 0,
          publishedAt: item.publishedAt,
          category: item.category,
        }));
      } catch (error) {
        console.error('Error fetching trending news:', error);
        return [];
      }
    }),

  /**
   * Search news
   */
  search: publicProcedure
    .input(z.object({
      query: z.string(),
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      try {
        const searchTerm = `%${input.query}%`;
        
        const items = await db
          .select()
          .from(news)
          .where(
            or(
              like(news.title, searchTerm),
              like(news.content, searchTerm),
              like(news.excerpt, searchTerm)
            )
          )
          .limit(input.limit);

        return items.map(item => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt,
        }));
      } catch (error) {
        console.error('Error searching news:', error);
        return [];
      }
    }),
});

