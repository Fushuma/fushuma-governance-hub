#!/usr/bin/env tsx
/**
 * Test script for GitHub grants sync
 * Usage: tsx scripts/test-github-sync.ts
 */

import { config } from 'dotenv';
import { EnhancedGitHubGrantsSync } from '../server/services/github-sync-enhanced';

// Load environment variables
config();

async function main() {
  console.log('Starting GitHub grants sync test...\n');

  if (!process.env.GITHUB_TOKEN) {
    console.error('Error: GITHUB_TOKEN environment variable is not set');
    console.log('Please set GITHUB_TOKEN in your .env file');
    process.exit(1);
  }

  const sync = new EnhancedGitHubGrantsSync();

  try {
    // Test fetching issues
    console.log('1. Fetching grant issues from GitHub...');
    const issues = await sync.fetchGrantIssues();
    console.log(`   ✓ Found ${issues.length} issues\n`);

    if (issues.length > 0) {
      const firstIssue = issues[0];
      console.log('2. Sample issue:');
      console.log(`   - Number: #${firstIssue.number}`);
      console.log(`   - Title: ${firstIssue.title}`);
      console.log(`   - State: ${firstIssue.state}`);
      console.log(`   - Comments: ${firstIssue.comments}`);
      console.log(`   - URL: ${firstIssue.html_url}\n`);

      // Test fetching comments
      if (firstIssue.comments > 0) {
        console.log('3. Fetching comments for first issue...');
        const comments = await sync.fetchIssueComments(firstIssue.number);
        console.log(`   ✓ Found ${comments.length} comments\n`);

        if (comments.length > 0) {
          const firstComment = comments[0];
          console.log('4. Sample comment:');
          console.log(`   - Author: ${firstComment.user?.login}`);
          console.log(`   - Created: ${firstComment.created_at}`);
          console.log(`   - Body preview: ${firstComment.body.substring(0, 100)}...`);
          if (firstComment.reactions) {
            console.log(`   - Reactions: ${JSON.stringify(firstComment.reactions)}\n`);
          }
        }
      }

      // Test parsing
      console.log('5. Testing issue parsing...');
      const parsed = sync.parseGrantIssue(firstIssue);
      console.log(`   - Parsed title: ${parsed.title}`);
      console.log(`   - Parsed amount: ${parsed.amount} FUMA`);
      console.log(`   - Parsed status: ${parsed.status}`);
      console.log(`   - Parsed applicant: ${parsed.applicant}\n`);
    }

    console.log('6. Running full sync (this will update the database)...');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const result = await sync.syncAllGrants();
    console.log(`\n✓ Sync complete!`);
    console.log(`   - Grants synced: ${result.synced}`);
    console.log(`   - Comments synced: ${result.commentsSynced}`);
    console.log(`   - Errors: ${result.errors}`);

  } catch (error) {
    console.error('\n✗ Error during sync:', error);
    process.exit(1);
  }
}

main();

