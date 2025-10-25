import { db } from '../_core/db';
import { news, telegramSyncState } from '../../drizzle/schema-phase2';
import { eq } from 'drizzle-orm';

/**
 * Telegram News Sync Service
 * Syncs news and announcements from Fushuma's Telegram channel
 */

const TELEGRAM_CHANNEL = '@FushumaChain';
const TELEGRAM_CHANNEL_URL = 'https://t.me/FushumaChain';

interface TelegramMessage {
  id: string;
  date: Date;
  text: string;
  author?: string;
  media?: any[];
  links?: string[];
}

interface SyncResult {
  synced: number;
  errors: number;
  lastMessageId?: string;
}

class TelegramSyncService {
  private botToken: string | null = null;
  private channelId: string = TELEGRAM_CHANNEL;
  private autoSyncEnabled: boolean = false;
  private syncInterval: number = 300000; // 5 minutes
  private syncTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the Telegram sync service
   */
  async initialize(
    botToken?: string,
    autoSync: boolean = false,
    syncIntervalMs: number = 300000
  ): Promise<void> {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || null;
    this.autoSyncEnabled = autoSync;
    this.syncInterval = syncIntervalMs;

    if (!this.botToken) {
      console.warn('Telegram bot token not provided, sync will be disabled');
      return;
    }

    // Initialize sync state in database
    await this.initializeSyncState();

    if (this.autoSyncEnabled) {
      this.startAutoSync();
    }

    console.log('TelegramSyncService initialized');
  }

  /**
   * Initialize sync state in database
   */
  private async initializeSyncState(): Promise<void> {
    const existing = await db.query.telegramSyncState.findFirst({
      where: eq(telegramSyncState.channelId, this.channelId),
    });

    if (!existing) {
      await db.insert(telegramSyncState).values({
        channelId: this.channelId,
        isActive: true,
      });
    }
  }

  /**
   * Fetch messages from Telegram channel
   * Note: This requires Telegram Bot API with proper permissions
   */
  private async fetchMessages(limit: number = 10, offset?: string): Promise<TelegramMessage[]> {
    if (!this.botToken) {
      throw new Error('Telegram bot token not configured');
    }

    try {
      // Using Telegram Bot API to get channel updates
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(offset && { offset }),
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      // Parse messages
      const messages: TelegramMessage[] = [];
      for (const update of data.result) {
        if (update.channel_post) {
          const post = update.channel_post;
          messages.push({
            id: post.message_id.toString(),
            date: new Date(post.date * 1000),
            text: post.text || post.caption || '',
            author: post.author_signature,
            media: post.photo || post.video ? [post.photo || post.video] : undefined,
            links: this.extractLinks(post.text || post.caption || ''),
          });
        }
      }

      return messages;
    } catch (error) {
      console.error('Error fetching Telegram messages:', error);
      throw error;
    }
  }

  /**
   * Parse Telegram message into news article
   */
  private parseMessage(message: TelegramMessage): {
    title: string;
    content: string;
    excerpt: string;
    category?: string;
    tags: string[];
  } {
    const text = message.text;
    const lines = text.split('\n').filter(line => line.trim());

    // First line is usually the title
    const title = lines[0]?.trim() || 'Fushuma Update';

    // Rest is content
    const content = lines.slice(1).join('\n').trim();

    // Create excerpt (first 200 chars)
    const excerpt = content.length > 200 
      ? content.substring(0, 200) + '...' 
      : content;

    // Extract category from hashtags
    const categoryMatch = text.match(/#(\w+)/);
    const category = categoryMatch ? categoryMatch[1] : undefined;

    // Extract all hashtags as tags
    const tags = Array.from(text.matchAll(/#(\w+)/g)).map(match => match[1]);

    return {
      title,
      content,
      excerpt,
      category,
      tags,
    };
  }

  /**
   * Extract links from text
   */
  private extractLinks(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return Array.from(text.matchAll(urlRegex)).map(match => match[1]);
  }

  /**
   * Sync messages from Telegram
   */
  async syncMessages(limit: number = 10): Promise<SyncResult> {
    if (!this.botToken) {
      console.warn('Telegram sync skipped: bot token not configured');
      return { synced: 0, errors: 0 };
    }

    let synced = 0;
    let errors = 0;
    let lastMessageId: string | undefined;

    try {
      // Get last sync state
      const syncState = await db.query.telegramSyncState.findFirst({
        where: eq(telegramSyncState.channelId, this.channelId),
      });

      // Fetch messages
      const messages = await this.fetchMessages(limit, syncState?.lastMessageId || undefined);

      for (const message of messages) {
        try {
          // Check if message already exists
          const existing = await db.query.news.findFirst({
            where: eq(news.sourceId, message.id),
          });

          if (existing) {
            continue; // Skip already synced messages
          }

          // Parse message
          const parsed = this.parseMessage(message);

          // Insert into database
          await db.insert(news).values({
            title: parsed.title,
            content: parsed.content,
            excerpt: parsed.excerpt,
            author: message.author || 'Fushuma Team',
            publishedAt: message.date,
            source: 'telegram',
            sourceId: message.id,
            sourceUrl: `${TELEGRAM_CHANNEL_URL}/${message.id}`,
            category: parsed.category,
            tags: parsed.tags,
            isPinned: false,
            viewCount: 0,
          });

          synced++;
          lastMessageId = message.id;
        } catch (error) {
          console.error(`Error syncing message ${message.id}:`, error);
          errors++;
        }
      }

      // Update sync state
      await db
        .update(telegramSyncState)
        .set({
          lastMessageId: lastMessageId || syncState?.lastMessageId,
          lastSyncAt: new Date(),
          messagesSynced: (syncState?.messagesSynced || 0) + synced,
          errorCount: (syncState?.errorCount || 0) + errors,
        })
        .where(eq(telegramSyncState.channelId, this.channelId));

      console.log(`Telegram sync completed: ${synced} synced, ${errors} errors`);
    } catch (error) {
      console.error('Error in Telegram sync:', error);
      
      // Update error in sync state
      await db
        .update(telegramSyncState)
        .set({
          lastError: error instanceof Error ? error.message : 'Unknown error',
          errorCount: db.query.telegramSyncState.findFirst({
            where: eq(telegramSyncState.channelId, this.channelId),
          }).then(state => (state?.errorCount || 0) + 1),
        })
        .where(eq(telegramSyncState.channelId, this.channelId));

      errors++;
    }

    return { synced, errors, lastMessageId };
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    channelId: string;
    lastSyncAt?: Date;
    messagesSynced: number;
    errorCount: number;
    lastError?: string;
    isActive: boolean;
    autoSyncEnabled: boolean;
    syncInterval: number;
  }> {
    const syncState = await db.query.telegramSyncState.findFirst({
      where: eq(telegramSyncState.channelId, this.channelId),
    });

    return {
      channelId: this.channelId,
      lastSyncAt: syncState?.lastSyncAt || undefined,
      messagesSynced: syncState?.messagesSynced || 0,
      errorCount: syncState?.errorCount || 0,
      lastError: syncState?.lastError || undefined,
      isActive: syncState?.isActive || false,
      autoSyncEnabled: this.autoSyncEnabled,
      syncInterval: this.syncInterval,
    };
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (!this.botToken) {
      console.warn('Cannot start auto-sync: bot token not configured');
      return;
    }

    // Run immediately
    this.syncMessages().catch(error => {
      console.error('Error in initial Telegram sync:', error);
    });

    // Then run on interval
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncMessages();
      } catch (error) {
        console.error('Error in Telegram auto-sync:', error);
      }
    }, this.syncInterval);

    console.log(`Telegram auto-sync started (interval: ${this.syncInterval}ms)`);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('Telegram auto-sync stopped');
    }
  }

  /**
   * Alternative: Fetch from public RSS/web scraping
   * This is a fallback method if Bot API is not available
   */
  async syncFromPublicChannel(): Promise<SyncResult> {
    // Note: This would require web scraping or RSS feed parsing
    // Telegram public channels can be accessed via web, but it's less reliable
    
    console.warn('Public channel sync not implemented yet');
    console.warn('Please configure TELEGRAM_BOT_TOKEN for proper sync');
    
    return { synced: 0, errors: 0 };
  }
}

export const telegramSync = new TelegramSyncService();

