import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { db } from '../_core/db';

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
      // Mock news data
      const allNews = [
        {
          id: 1,
          title: 'Fushuma Governance Hub Phase 2 Launch',
          excerpt: 'Introducing gauge voting, epoch management, and enhanced governance features...',
          content: 'We are excited to announce the launch of Phase 2 of the Fushuma Governance Hub. This update brings powerful new features including gauge voting for resource allocation, standardized 14-day governance epochs, and automatic Telegram news integration.',
          author: 'Fushuma Team',
          publishedAt: new Date('2025-10-25'),
          source: 'official' as const,
          sourceUrl: 'https://t.me/FushumaChain/123',
          category: 'announcement',
          tags: ['governance', 'launch', 'phase2'],
          isPinned: true,
          viewCount: 342,
        },
        {
          id: 2,
          title: 'New Development Grant Program Opens',
          excerpt: 'Apply now for funding to build on Fushuma ecosystem...',
          content: 'The Fushuma Foundation is opening a new round of development grants. Developers can now apply for funding to build innovative applications on the Fushuma network.',
          author: 'Grant Committee',
          publishedAt: new Date('2025-10-24'),
          source: 'telegram' as const,
          sourceUrl: 'https://t.me/FushumaChain/122',
          category: 'grants',
          tags: ['grants', 'development', 'funding'],
          isPinned: false,
          viewCount: 256,
        },
        {
          id: 3,
          title: 'Weekly Governance Update - October 25',
          excerpt: 'Summary of governance activities and upcoming votes...',
          content: 'This week saw 5 new proposals submitted, 3 proposals passed, and active participation from 42 unique voters. The current epoch is in the voting phase with 4 days remaining.',
          author: 'Governance Team',
          publishedAt: new Date('2025-10-25'),
          source: 'telegram' as const,
          sourceUrl: 'https://t.me/FushumaChain/121',
          category: 'governance',
          tags: ['governance', 'weekly', 'update'],
          isPinned: false,
          viewCount: 189,
        },
        {
          id: 4,
          title: 'Epoch 1 Results: Record Participation',
          excerpt: 'First epoch concludes with highest voter turnout...',
          content: 'The first governance epoch has concluded with record-breaking participation. 42 unique voters participated, allocating over 1.25M voting power across various gauges.',
          author: 'Fushuma Team',
          publishedAt: new Date('2025-10-23'),
          source: 'official' as const,
          sourceUrl: 'https://t.me/FushumaChain/120',
          category: 'governance',
          tags: ['epoch', 'results', 'governance'],
          isPinned: false,
          viewCount: 412,
        },
        {
          id: 5,
          title: 'Community Call Scheduled for Next Week',
          excerpt: 'Join us for the monthly community call to discuss governance...',
          content: 'The next Fushuma community call is scheduled for next Tuesday at 3 PM UTC. Topics include governance updates, upcoming proposals, and Q&A session.',
          author: 'Community Team',
          publishedAt: new Date('2025-10-22'),
          source: 'telegram' as const,
          sourceUrl: 'https://t.me/FushumaChain/119',
          category: 'community',
          tags: ['community', 'call', 'event'],
          isPinned: false,
          viewCount: 145,
        },
      ];

      // Apply filters
      let filtered = allNews;
      
      if (input.source) {
        filtered = filtered.filter(n => n.source === input.source);
      }
      
      if (input.category) {
        filtered = filtered.filter(n => n.category === input.category);
      }
      
      if (input.tag) {
        filtered = filtered.filter(n => n.tags.includes(input.tag));
      }
      
      if (input.pinnedOnly) {
        filtered = filtered.filter(n => n.isPinned);
      }

      // Pagination
      const paginated = filtered.slice(input.offset, input.offset + input.limit);

      return {
        items: paginated,
        total: filtered.length,
        hasMore: input.offset + input.limit < filtered.length,
      };
    }),

  /**
   * Get news by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // Mock data
      const newsItems: Record<number, any> = {
        1: {
          id: 1,
          title: 'Fushuma Governance Hub Phase 2 Launch',
          excerpt: 'Introducing gauge voting, epoch management, and enhanced governance features...',
          content: `# Fushuma Governance Hub Phase 2 Launch

We are excited to announce the launch of Phase 2 of the Fushuma Governance Hub. This update brings powerful new features including:

## New Features

### Gauge Voting System
Vote on resource allocation across different gauges including development grants, treasury operations, and protocol parameters.

### Epoch Management
Standardized 14-day governance cycles with clear voting, distribution, and preparation phases.

### Telegram Integration
Automatic news synchronization from our official Telegram channel.

### Enhanced Dashboard
Real-time governance metrics, voting history, and participation statistics.

## How to Participate

1. Lock your tokens to receive veNFT
2. Vote on active proposals during voting periods
3. Allocate your voting power across gauges
4. Participate in community discussions

Join us in shaping the future of Fushuma governance!`,
          author: 'Fushuma Team',
          publishedAt: new Date('2025-10-25'),
          source: 'official' as const,
          sourceId: '123',
          sourceUrl: 'https://t.me/FushumaChain/123',
          category: 'announcement',
          tags: ['governance', 'launch', 'phase2'],
          isPinned: true,
          viewCount: 342,
          metadata: {
            readTime: 3,
            images: [],
          },
        },
      };

      const news = newsItems[input.id];
      if (!news) {
        throw new Error('News not found');
      }

      // Increment view count (mock)
      news.viewCount++;

      return news;
    }),

  /**
   * Get news categories
   */
  getCategories: publicProcedure.query(async () => {
    return [
      { id: 'announcement', name: 'Announcements', count: 15 },
      { id: 'governance', name: 'Governance', count: 28 },
      { id: 'grants', name: 'Grants', count: 12 },
      { id: 'community', name: 'Community', count: 34 },
      { id: 'technical', name: 'Technical', count: 8 },
    ];
  }),

  /**
   * Get popular tags
   */
  getTags: publicProcedure
    .input(z.object({ limit: z.number().optional().default(20) }))
    .query(async ({ input }) => {
      const tags = [
        { tag: 'governance', count: 45 },
        { tag: 'grants', count: 23 },
        { tag: 'development', count: 18 },
        { tag: 'community', count: 34 },
        { tag: 'epoch', count: 12 },
        { tag: 'voting', count: 28 },
        { tag: 'proposal', count: 31 },
        { tag: 'launch', count: 8 },
        { tag: 'update', count: 42 },
        { tag: 'announcement', count: 15 },
      ];

      return tags.slice(0, input.limit);
    }),

  /**
   * Get Telegram sync status
   */
  getSyncStatus: publicProcedure.query(async () => {
    // Mock sync status
    return {
      channelId: '@FushumaChain',
      lastSyncAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      messagesSynced: 127,
      errorCount: 2,
      lastError: null,
      isActive: true,
      autoSyncEnabled: true,
      syncInterval: 300000, // 5 minutes
      nextSyncIn: 240000, // 4 minutes
    };
  }),

  /**
   * Manually trigger Telegram sync (admin only)
   */
  syncNow: publicProcedure.mutation(async () => {
    // Mock sync operation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      synced: 3,
      errors: 0,
      message: 'Synced 3 new messages from Telegram',
    };
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
      // Mock trending news (sorted by view count)
      return [
        {
          id: 4,
          title: 'Epoch 1 Results: Record Participation',
          viewCount: 412,
          publishedAt: new Date('2025-10-23'),
          category: 'governance',
        },
        {
          id: 1,
          title: 'Fushuma Governance Hub Phase 2 Launch',
          viewCount: 342,
          publishedAt: new Date('2025-10-25'),
          category: 'announcement',
        },
        {
          id: 2,
          title: 'New Development Grant Program Opens',
          viewCount: 256,
          publishedAt: new Date('2025-10-24'),
          category: 'grants',
        },
        {
          id: 3,
          title: 'Weekly Governance Update - October 25',
          viewCount: 189,
          publishedAt: new Date('2025-10-25'),
          category: 'governance',
        },
        {
          id: 5,
          title: 'Community Call Scheduled for Next Week',
          viewCount: 145,
          publishedAt: new Date('2025-10-22'),
          category: 'community',
        },
      ].slice(0, input.limit);
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
      // Mock search (simple text matching)
      const allNews = [
        {
          id: 1,
          title: 'Fushuma Governance Hub Phase 2 Launch',
          excerpt: 'Introducing gauge voting, epoch management, and enhanced governance features...',
        },
        {
          id: 2,
          title: 'New Development Grant Program Opens',
          excerpt: 'Apply now for funding to build on Fushuma ecosystem...',
        },
      ];

      const results = allNews.filter(n => 
        n.title.toLowerCase().includes(input.query.toLowerCase()) ||
        n.excerpt.toLowerCase().includes(input.query.toLowerCase())
      );

      return results.slice(0, input.limit);
    }),
});

