import { Octokit } from '@octokit/rest';
import { db } from '../db';
import { developmentGrants, grantComments } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: Array<{ name: string }>;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  comments: number;
}

interface GitHubComment {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  body: string;
  body_html?: string;
  created_at: string;
  updated_at: string;
  reactions?: {
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
  };
}

export class EnhancedGitHubGrantsSync {
  private octokit: Octokit;
  private owner = 'Fushuma';
  private repo = 'Dev_grants';

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Fetch all grant issues from GitHub
   */
  async fetchGrantIssues(): Promise<GitHubIssue[]> {
    try {
      const { data } = await this.octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'all',
        per_page: 100,
      });

      return data as GitHubIssue[];
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      throw error;
    }
  }

  /**
   * Fetch comments for a specific issue
   */
  async fetchIssueComments(issueNumber: number): Promise<GitHubComment[]> {
    try {
      const { data } = await this.octokit.rest.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        per_page: 100,
      });

      // Fetch reactions for each comment
      const commentsWithReactions = await Promise.all(
        data.map(async (comment) => {
          try {
            const { data: reactions } = await this.octokit.rest.reactions.listForIssueComment({
              owner: this.owner,
              repo: this.repo,
              comment_id: comment.id,
            });

            const reactionCounts = {
              '+1': 0,
              '-1': 0,
              laugh: 0,
              hooray: 0,
              confused: 0,
              heart: 0,
              rocket: 0,
              eyes: 0,
            };

            reactions.forEach((reaction) => {
              const content = reaction.content as keyof typeof reactionCounts;
              if (content in reactionCounts) {
                reactionCounts[content]++;
              }
            });

            return {
              ...comment,
              reactions: reactionCounts,
            } as GitHubComment;
          } catch (error) {
            console.error(`Error fetching reactions for comment ${comment.id}:`, error);
            return comment as GitHubComment;
          }
        })
      );

      return commentsWithReactions;
    } catch (error) {
      console.error(`Error fetching comments for issue #${issueNumber}:`, error);
      throw error;
    }
  }

  /**
   * Parse grant information from issue body
   */
  parseGrantIssue(issue: GitHubIssue) {
    const body = issue.body || '';
    
    // Extract amount requested (look for patterns like "$10,000" or "10000 FUMA" or "10000 USDT")
    const amountMatch = body.match(/\$?([\d,]+)\s*(FUMA|USD|USDT)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // Extract category from labels
    const categoryLabels = ['infrastructure', 'defi', 'nft', 'gaming', 'tooling', 'education', 'launchpad'];
    const category = issue.labels.find(label => 
      categoryLabels.includes(label.name.toLowerCase())
    )?.name || 'other';

    // Determine status from labels and state
    let status: 'submitted' | 'review' | 'approved' | 'in_progress' | 'completed' | 'rejected' = 'submitted';
    if (issue.state === 'closed') {
      const hasApprovedLabel = issue.labels.some(l => l.name.toLowerCase().includes('approved'));
      const hasRejectedLabel = issue.labels.some(l => l.name.toLowerCase().includes('rejected'));
      const hasCompletedLabel = issue.labels.some(l => l.name.toLowerCase().includes('completed'));
      
      if (hasCompletedLabel) status = 'completed';
      else if (hasApprovedLabel) status = 'approved';
      else if (hasRejectedLabel) status = 'rejected';
    } else {
      const hasApprovedLabel = issue.labels.some(l => l.name.toLowerCase().includes('approved'));
      const hasInProgressLabel = issue.labels.some(l => l.name.toLowerCase().includes('in progress'));
      const hasReviewLabel = issue.labels.some(l => l.name.toLowerCase().includes('review'));
      
      if (hasInProgressLabel) status = 'in_progress';
      else if (hasApprovedLabel) status = 'approved';
      else if (hasReviewLabel) status = 'review';
    }

    // Extract description - try to get the first paragraph or overview section
    const descMatch = body.match(/##\s*(?:Description|Overview|Grant Overview)\s*\n([\s\S]*?)(?=\n##|$)/i);
    const description = descMatch ? descMatch[1].trim() : body.substring(0, 1000);

    return {
      githubIssueNumber: issue.number,
      title: issue.title,
      description,
      githubIssueBody: body,
      githubIssueState: issue.state,
      amount,
      category,
      status,
      applicant: issue.user?.login || 'unknown',
      applicantAvatar: issue.user?.avatar_url || '',
      githubUrl: issue.html_url,
      githubLabels: JSON.stringify(issue.labels.map(l => l.name)),
      githubCommentCount: issue.comments,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
    };
  }

  /**
   * Sync a single grant to database
   */
  async upsertGrant(grantData: ReturnType<typeof this.parseGrantIssue>) {
    try {
      // Check if grant already exists
      const existing = await db.query.developmentGrants.findFirst({
        where: eq(developmentGrants.githubIssueNumber, grantData.githubIssueNumber),
      });

      if (existing) {
        // Update existing grant
        await db
          .update(developmentGrants)
          .set({
            title: grantData.title,
            description: grantData.description,
            githubIssueBody: grantData.githubIssueBody,
            githubIssueState: grantData.githubIssueState,
            applicantName: grantData.applicant,
            githubAuthor: grantData.applicant,
            githubAuthorAvatar: grantData.applicantAvatar,
            fundingRequest: grantData.amount,
            status: grantData.status,
            githubIssueUrl: grantData.githubUrl,
            githubLabels: grantData.githubLabels,
            githubCommentCount: grantData.githubCommentCount,
            updatedAt: new Date(),
          })
          .where(eq(developmentGrants.id, existing.id));
        
        console.log(`Updated grant #${grantData.githubIssueNumber}: ${grantData.title}`);
        return existing.id;
      } else {
        // Insert new grant
        const [newGrant] = await db
          .insert(developmentGrants)
          .values({
            title: grantData.title,
            description: grantData.description,
            githubIssueBody: grantData.githubIssueBody,
            githubIssueState: grantData.githubIssueState,
            githubIssueNumber: grantData.githubIssueNumber,
            applicantName: grantData.applicant,
            githubAuthor: grantData.applicant,
            githubAuthorAvatar: grantData.applicantAvatar,
            contactInfo: '',
            valueProposition: grantData.description,
            deliverables: '',
            roadmap: '',
            fundingRequest: grantData.amount,
            status: grantData.status,
            submittedBy: 1, // System user
            githubIssueUrl: grantData.githubUrl,
            githubLabels: grantData.githubLabels,
            githubCommentCount: grantData.githubCommentCount,
          })
          .returning();
        
        console.log(`Created grant #${grantData.githubIssueNumber}: ${grantData.title}`);
        return newGrant.id;
      }
    } catch (error) {
      console.error(`Error upserting grant #${grantData.githubIssueNumber}:`, error);
      throw error;
    }
  }

  /**
   * Sync comments for a grant
   */
  async syncGrantComments(grantId: number, issueNumber: number): Promise<number> {
    try {
      const comments = await this.fetchIssueComments(issueNumber);
      console.log(`Fetched ${comments.length} comments for issue #${issueNumber}`);

      let synced = 0;
      for (const comment of comments) {
        try {
          // Check if comment already exists
          const existing = await db.query.grantComments.findFirst({
            where: eq(grantComments.githubCommentId, comment.id),
          });

          const commentData = {
            grantId,
            githubCommentId: comment.id,
            author: comment.user?.login || 'unknown',
            authorAvatar: comment.user?.avatar_url || '',
            body: comment.body,
            bodyHtml: comment.body_html || null,
            reactions: comment.reactions ? JSON.stringify(comment.reactions) : null,
            createdAt: new Date(comment.created_at),
            updatedAt: new Date(comment.updated_at),
          };

          if (existing) {
            // Update existing comment
            await db
              .update(grantComments)
              .set({
                body: commentData.body,
                bodyHtml: commentData.bodyHtml,
                reactions: commentData.reactions,
                updatedAt: commentData.updatedAt,
              })
              .where(eq(grantComments.id, existing.id));
          } else {
            // Insert new comment
            await db.insert(grantComments).values(commentData);
          }
          synced++;
        } catch (error) {
          console.error(`Error syncing comment ${comment.id}:`, error);
        }
      }

      return synced;
    } catch (error) {
      console.error(`Error syncing comments for grant ${grantId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all grants from GitHub with comments
   */
  async syncAllGrants(): Promise<{ synced: number; errors: number; commentsSynced: number }> {
    console.log('Starting enhanced GitHub grants sync...');
    
    try {
      const issues = await this.fetchGrantIssues();
      console.log(`Found ${issues.length} issues in GitHub`);

      let synced = 0;
      let errors = 0;
      let commentsSynced = 0;

      for (const issue of issues) {
        try {
          const grantData = this.parseGrantIssue(issue);
          const grantId = await this.upsertGrant(grantData);
          synced++;

          // Sync comments for this grant
          if (issue.comments > 0) {
            const commentsCount = await this.syncGrantComments(grantId, issue.number);
            commentsSynced += commentsCount;
          }
        } catch (error) {
          console.error(`Error syncing issue #${issue.number}:`, error);
          errors++;
        }
      }

      console.log(`Sync complete: ${synced} grants synced, ${commentsSynced} comments synced, ${errors} errors`);
      return { synced, errors, commentsSynced };
    } catch (error) {
      console.error('Error in syncAllGrants:', error);
      throw error;
    }
  }

  /**
   * Handle GitHub webhook for real-time updates
   */
  async handleWebhook(payload: any): Promise<void> {
    try {
      const { action, issue, comment } = payload;

      if (!issue) {
        console.log('Webhook payload does not contain issue data');
        return;
      }

      console.log(`Received webhook: ${action} for issue #${issue.number}`);

      // Handle issue actions
      const issueActions = ['opened', 'edited', 'closed', 'reopened', 'labeled', 'unlabeled'];
      if (issueActions.includes(action)) {
        const grantData = this.parseGrantIssue(issue);
        await this.upsertGrant(grantData);
      }

      // Handle comment actions
      const commentActions = ['created', 'edited', 'deleted'];
      if (commentActions.includes(action) && comment) {
        // Find the grant by issue number
        const grant = await db.query.developmentGrants.findFirst({
          where: eq(developmentGrants.githubIssueNumber, issue.number),
        });

        if (grant) {
          if (action === 'deleted') {
            // Delete comment
            await db
              .delete(grantComments)
              .where(eq(grantComments.githubCommentId, comment.id));
          } else {
            // Sync the specific comment
            await this.syncGrantComments(grant.id, issue.number);
          }
        }
      }

      console.log(`Webhook processed successfully for issue #${issue.number}`);
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedGithubSync = new EnhancedGitHubGrantsSync();

// Auto-sync every hour if enabled
if (process.env.ENABLE_GITHUB_AUTO_SYNC === 'true') {
  const syncInterval = parseInt(process.env.GITHUB_SYNC_INTERVAL || '3600000'); // Default 1 hour
  
  setInterval(async () => {
    try {
      console.log('Running scheduled enhanced GitHub grants sync...');
      await enhancedGithubSync.syncAllGrants();
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  }, syncInterval);

  // Run initial sync on startup
  enhancedGithubSync.syncAllGrants().catch(console.error);
}

