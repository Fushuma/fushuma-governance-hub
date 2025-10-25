import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  getAllProposals, 
  getActiveProposals, 
  createProposal,
  getAllNewsFeed,
  getAllCommunityContent
} from './db';

describe('Database Queries', () => {
  describe('Proposals', () => {
    it('should get all proposals', async () => {
      const proposals = await getAllProposals();
      expect(Array.isArray(proposals)).toBe(true);
    });

    it('should get active proposals', async () => {
      const proposals = await getActiveProposals();
      expect(Array.isArray(proposals)).toBe(true);
      proposals.forEach(proposal => {
        expect(proposal.status).toBe('active');
      });
    });

    it('should create a proposal with required fields', async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const proposalData = {
        title: 'Test Proposal for Unit Testing',
        description: 'This is a test proposal created during unit testing to verify database functionality.',
        proposer: '0x1234567890123456789012345678901234567890',
        proposerUserId: 1,
        quorum: 100000,
        startDate,
        endDate,
      };

      const result = await createProposal(proposalData);
      expect(result).toBeDefined();
    });
  });

  describe('News Feed', () => {
    it('should get news feed ordered by date descending', async () => {
      const news = await getAllNewsFeed(10);
      expect(Array.isArray(news)).toBe(true);
      
      // Check if ordered by date descending
      if (news.length > 1) {
        for (let i = 0; i < news.length - 1; i++) {
          const current = new Date(news[i].publishedAt).getTime();
          const next = new Date(news[i + 1].publishedAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  describe('Community Content', () => {
    it('should get community content ordered by upvotes descending', async () => {
      const content = await getAllCommunityContent();
      expect(Array.isArray(content)).toBe(true);
      
      // Check if ordered by upvotes descending
      if (content.length > 1) {
        for (let i = 0; i < content.length - 1; i++) {
          const currentUpvotes = content[i].upvotes || 0;
          const nextUpvotes = content[i + 1].upvotes || 0;
          expect(currentUpvotes).toBeGreaterThanOrEqual(nextUpvotes);
        }
      }
    });
  });
});

