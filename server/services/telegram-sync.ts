import { getDb } from '../db';
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
  private channelUsername: string = 'FushumaChain';
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
    this.channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME || 'FushumaChain';
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || '@FushumaChain';
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
    try {
      const db = await getDb();
      if (!db) return;
      
      const existing = await db.query.telegramSyncState.findFirst({
        where: eq(telegramSyncState.channelId, this.channelId),
      });

      if (!existing) {
        await db.insert(telegramSyncState).values({
          channelId: this.channelId,
          isActive: true,
        });
      }
    } catch (error) {
      console.error('Error initializing sync state:', error);
    }
  }

  /**
   * Get file URL from Telegram
   */
  private async getFileUrl(fileId: string): Promise<string | null> {
    if (!this.botToken) return null;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`
      );
      const data = await response.json();

      if (data.ok && data.result.file_path) {
        return `https://api.telegram.org/file/bot${this.botToken}/${data.result.file_path}`;
      }
      return null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  /**
   * Fetch messages from Telegram channel using getUpdates
   * This method captures channel posts if the bot is added as admin
   */
  private async fetchMessagesFromUpdates(limit: number = 10, offset?: number): Promise<TelegramMessage[]> {
    if (!this.botToken) {
      throw new Error('Telegram bot token not configured');
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
      const params = new URLSearchParams({
        limit: limit.toString(),
        allowed_updates: JSON.stringify(['channel_post']),
        ...(offset && { offset: offset.toString() }),
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      const messages: TelegramMessage[] = [];
      for (const update of data.result) {
        if (update.channel_post) {
          const post = update.channel_post;
          
          // Extract media URLs
          const media: any[] = [];
          
          // Handle photos
          if (post.photo && post.photo.length > 0) {
            // Get the largest photo size
            const largestPhoto = post.photo[post.photo.length - 1];
            const photoUrl = await this.getFileUrl(largestPhoto.file_id);
            if (photoUrl) {
              media.push({ type: 'photo', url: photoUrl });
            }
          }
          
          // Handle videos
          if (post.video) {
            const videoUrl = await this.getFileUrl(post.video.file_id);
            if (videoUrl) {
              media.push({ 
                type: 'video', 
                url: videoUrl,
                thumbnail: post.video.thumbnail ? await this.getFileUrl(post.video.thumbnail.file_id) : null
              });
            }
          }
          
          // Handle animations (GIFs)
          if (post.animation) {
            const animationUrl = await this.getFileUrl(post.animation.file_id);
            if (animationUrl) {
              media.push({ type: 'animation', url: animationUrl });
            }
          }
          
          messages.push({
            id: post.message_id.toString(),
            date: new Date(post.date * 1000),
            text: post.text || post.caption || '',
            author: post.author_signature || 'Fushuma Team',
            media: media.length > 0 ? media : undefined,
            links: this.extractLinks(post.text || post.caption || ''),
          });
        }
      }

      return messages;
    } catch (error) {
      console.error('Error fetching Telegram messages via getUpdates:', error);
      throw error;
    }
  }

  /**
   * Fetch messages from public Telegram channel by scraping the web page
   * This works for public channels without needing bot admin access
   */
  private async fetchMessagesFromChannel(limit: number = 50): Promise<TelegramMessage[]> {
    try {
      // Use the public channel preview URL
      const channelUsername = this.channelId.replace('@', '');
      const url = `https://t.me/s/${channelUsername}`;
      
      console.log(`Fetching messages from ${url}`);
      
      const response = await fetch(url);
      const html = await response.text();
      
      // Parse HTML to extract messages
      const messages: TelegramMessage[] = [];
      
      // Match message blocks in the HTML
      const messageRegex = /<div class="tgme_widget_message[^"]*"[^>]*data-post="[^"]+"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
      const matches = html.matchAll(messageRegex);
      
      for (const match of matches) {
        const messageHtml = match[0];
        
        // Extract message ID
        const idMatch = messageHtml.match(/data-post="[^/]+\/(\d+)"/);
        if (!idMatch) continue;
        const messageId = idMatch[1];
        
        // Extract text content
        const textMatch = messageHtml.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        let text = '';
        if (textMatch) {
          // Remove HTML tags and decode entities
          text = textMatch[1]
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .trim();
        }
        
        // Extract date
        const dateMatch = messageHtml.match(/<time[^>]*datetime="([^"]+)"/);
        const date = dateMatch ? new Date(dateMatch[1]) : new Date();
        
        // Extract media (photos)
        const media: any[] = [];
        const photoMatches = messageHtml.matchAll(/<a[^>]*class="tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)"/g);
        for (const photoMatch of photoMatches) {
          media.push({ type: 'photo', url: photoMatch[1] });
        }
        
        // Extract video
        const videoMatch = messageHtml.match(/<video[^>]*src="([^"]+)"/);
        if (videoMatch) {
          const thumbnailMatch = messageHtml.match(/<video[^>]*poster="([^"]+)"/);
          media.push({ 
            type: 'video', 
            url: videoMatch[1],
            thumbnail: thumbnailMatch ? thumbnailMatch[1] : null
          });
        }
        
        if (text || media.length > 0) {
          messages.push({
            id: messageId,
            date,
            text,
            author: 'Fushuma Team',
            media: media.length > 0 ? media : undefined,
            links: this.extractLinks(text),
          });
        }
        
        if (messages.length >= limit) break;
      }
      
      console.log(`Fetched ${messages.length} messages from Telegram`);
      return messages;
    } catch (error) {
      console.error('Error fetching from public channel:', error);
      return [];
    }
  }

  /**
   * Parse Telegram message into news article
   * Now preserves the full message body as content
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

    // IMPORTANT: Use the FULL text as content, not just lines after the first
    // This ensures the complete message body is stored
    const content = text.trim();

    // Create excerpt (first 200 chars of content)
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
      const db = await getDb();
      if (!db) {
        console.warn('Database not available for Telegram sync');
        return { synced: 0, errors: 0 };
      }
      
      const syncState = await db.query.telegramSyncState.findFirst({
        where: eq(telegramSyncState.channelId, this.channelId),
      });

      // Fetch messages from channel
      const messages = await this.fetchMessagesFromChannel(limit);

      console.log(`Fetched ${messages.length} messages from Telegram`);

      for (const message of messages) {
        try {
          // Check if message already exists
          const existing = await db.query.news.findFirst({
            where: eq(news.sourceId, message.id),
          });

          if (existing) {
            console.log(`Message ${message.id} already exists, skipping`);
            continue; // Skip already synced messages
          }

          // Parse message - this now includes the full body
          const parsed = this.parseMessage(message);

          console.log(`Syncing message ${message.id}: ${parsed.title.substring(0, 50)}...`);

          // Insert into database with full content and media
          await db.insert(news).values({
            title: parsed.title,
            content: parsed.content, // Full message body
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
            metadata: {
              media: message.media || [],
              links: message.links || [],
            },
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
      try {
      const db = await getDb();
      if (!db) return;
      
      const syncState = await db.query.telegramSyncState.findFirst({
        where: eq(telegramSyncState.channelId, this.channelId),
      });

      await db
          .update(telegramSyncState)
          .set({
            lastError: error instanceof Error ? error.message : 'Unknown error',
            errorCount: (syncState?.errorCount || 0) + 1,
          })
          .where(eq(telegramSyncState.channelId, this.channelId));
      } catch (updateError) {
        console.error('Error updating sync state:', updateError);
      }

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
    try {
      const db = await getDb();
      if (!db) {
        return {
          channelId: this.channelId,
          lastSyncAt: undefined,
          messagesSynced: 0,
          errorCount: 0,
          lastError: undefined,
          isActive: false,
          autoSyncEnabled: this.autoSyncEnabled,
          syncInterval: this.syncInterval,
        };
      }
      
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
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        channelId: this.channelId,
        lastSyncAt: undefined,
        messagesSynced: 0,
        errorCount: 0,
        lastError: undefined,
        isActive: false,
        autoSyncEnabled: this.autoSyncEnabled,
        syncInterval: this.syncInterval,
      };
    }
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

