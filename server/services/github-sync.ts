import { Octokit } from '@octokit/rest';
import { db } from '../db';
import { developmentGrants, grantMilestones } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

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
}

export class GitHubGrantsSync {
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
   * Parse grant information from issue body
   */
  parseGrantIssue(issue: GitHubIssue) {
    const body = issue.body || '';
    
    // Extract amount requested (look for patterns like "$10,000" or "10000 FUMA")
    const amountMatch = body.match(/\$?([\d,]+)\s*(FUMA|USD)?/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // Extract category from labels
    const categoryLabels = ['infrastructure', 'defi', 'nft', 'gaming', 'tooling', 'education'];
    const category = issue.labels.find(label => 
      categoryLabels.includes(label.name.toLowerCase())
    )?.name || 'other';

    // Determine status from labels and state
    let status: 'pending' | 'approved' | 'rejected' | 'completed' = 'pending';
    if (issue.state === 'closed') {
      const hasApprovedLabel = issue.labels.some(l => l.name.toLowerCase().includes('approved'));
      const hasRejectedLabel = issue.labels.some(l => l.name.toLowerCase().includes('rejected'));
      const hasCompletedLabel = issue.labels.some(l => l.name.toLowerCase().includes('completed'));
      
      if (hasCompletedLabel) status = 'completed';
      else if (hasApprovedLabel) status = 'approved';
      else if (hasRejectedLabel) status = 'rejected';
    } else {
      const hasApprovedLabel = issue.labels.some(l => l.name.toLowerCase().includes('approved'));
      if (hasApprovedLabel) status = 'approved';
    }

    // Extract team information
    const teamMatch = body.match(/##\s*Team\s*\n([\s\S]*?)(?=\n##|$)/i);
    const team = teamMatch ? teamMatch[1].trim().substring(0, 500) : '';

    // Extract description
    const descMatch = body.match(/##\s*Description\s*\n([\s\S]*?)(?=\n##|$)/i);
    const description = descMatch ? descMatch[1].trim() : body.substring(0, 1000);

    return {
      githubIssueNumber: issue.number,
      title: issue.title,
      description,
      amount,
      category,
      status,
      applicant: issue.user?.login || 'unknown',
      applicantAvatar: issue.user?.avatar_url || '',
      team,
      githubUrl: issue.html_url,
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
        where: eq(developmentGrants.githubIssueUrl, grantData.githubUrl),
      });

      if (existing) {
        // Update existing grant
        await db
          .update(developmentGrants)
          .set({
            title: grantData.title,
            description: grantData.description,
            applicantName: grantData.applicant,
            fundingRequest: grantData.amount,
            status: grantData.status as any,
            githubIssueUrl: grantData.githubUrl,
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
            applicantName: grantData.applicant,
            contactInfo: '',
            valueProposition: grantData.description,
            deliverables: '',
            roadmap: '',
            fundingRequest: grantData.amount,
            status: grantData.status as any,
            submittedBy: 1, // System user
            githubIssueUrl: grantData.githubUrl,
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
   * Sync all grants from GitHub
   */
  async syncAllGrants(): Promise<{ synced: number; errors: number }> {
    console.log('Starting GitHub grants sync...');
    
    try {
      const issues = await this.fetchGrantIssues();
      console.log(`Found ${issues.length} issues in GitHub`);

      let synced = 0;
      let errors = 0;

      for (const issue of issues) {
        try {
          const grantData = this.parseGrantIssue(issue);
          await this.upsertGrant(grantData);
          synced++;
        } catch (error) {
          console.error(`Error syncing issue #${issue.number}:`, error);
          errors++;
        }
      }

      console.log(`Sync complete: ${synced} synced, ${errors} errors`);
      return { synced, errors };
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
      const { action, issue } = payload;

      if (!issue) {
        console.log('Webhook payload does not contain issue data');
        return;
      }

      console.log(`Received webhook: ${action} for issue #${issue.number}`);

      // Only sync if it's a relevant action
      const relevantActions = ['opened', 'edited', 'closed', 'reopened', 'labeled', 'unlabeled'];
      if (!relevantActions.includes(action)) {
        console.log(`Ignoring action: ${action}`);
        return;
      }

      const grantData = this.parseGrantIssue(issue);
      await this.upsertGrant(grantData);

      console.log(`Webhook processed successfully for issue #${issue.number}`);
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const githubSync = new GitHubGrantsSync();

// Auto-sync every hour if enabled
if (process.env.ENABLE_GITHUB_AUTO_SYNC === 'true') {
  const syncInterval = parseInt(process.env.GITHUB_SYNC_INTERVAL || '3600000'); // Default 1 hour
  
  setInterval(async () => {
    try {
      console.log('Running scheduled GitHub grants sync...');
      await githubSync.syncAllGrants();
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  }, syncInterval);

  // Run initial sync on startup
  githubSync.syncAllGrants().catch(console.error);
}

