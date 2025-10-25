import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Launchpad router
  launchpad: router({
    list: publicProcedure.query(async () => {
      const { getAllLaunchpadProjects } = await import('./db');
      return getAllLaunchpadProjects();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getLaunchpadProjectById } = await import('./db');
        return getLaunchpadProjectById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string(),
        teamBackground: z.string().optional(),
        tokenomics: z.string().optional(),
        roadmap: z.string().optional(),
        fundingAmount: z.number(),
        airdropAllocation: z.number().optional(),
        websiteUrl: z.string().optional(),
        tokenSymbol: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createLaunchpadProject } = await import('./db');
        return createLaunchpadProject({
          ...input,
          submittedBy: ctx.user.id,
        });
      }),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        const { updateLaunchpadProjectStatus } = await import('./db');
        return updateLaunchpadProjectStatus(input.id, input.status);
      }),
    vote: protectedProcedure
      .input(z.object({ projectId: z.number(), support: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { createVote } = await import('./db');
        return createVote({
          userId: ctx.user.id,
          proposalId: input.projectId,
          proposalType: 'launchpad' as const,
          voteChoice: input.support ? 'for' as const : 'against' as const,
          votingPower: 1,
        });
      }),
    getUserVote: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getUserVote } = await import('./db');
        return getUserVote(ctx.user.id, 'launchpad', input.projectId);
      }),
  }),

  // Grants router
  grants: router({
    list: publicProcedure.query(async () => {
      const { getAllDevelopmentGrants } = await import('./db');
      return getAllDevelopmentGrants();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getDevelopmentGrantById } = await import('./db');
        return getDevelopmentGrantById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        applicantName: z.string(),
        contactInfo: z.string().optional(),
        description: z.string(),
        valueProposition: z.string(),
        deliverables: z.string(),
        roadmap: z.string(),
        fundingRequest: z.number(),
        receivingWallet: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createDevelopmentGrant } = await import('./db');
        return createDevelopmentGrant({
          ...input,
          submittedBy: ctx.user.id,
        });
      }),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.string() }))
      .mutation(async ({ input }) => {
        const { updateDevelopmentGrantStatus } = await import('./db');
        return updateDevelopmentGrantStatus(input.id, input.status);
      }),
    getMilestones: publicProcedure
      .input(z.object({ grantId: z.number() }))
      .query(async ({ input }) => {
        const { getMilestonesByGrantId } = await import('./db');
        return getMilestonesByGrantId(input.grantId);
      }),
    createMilestone: protectedProcedure
      .input(z.object({
        grantId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        amount: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { createGrantMilestone } = await import('./db');
        return createGrantMilestone(input);
      }),
    updateMilestone: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string(),
        proofOfWork: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateMilestoneStatus } = await import('./db');
        return updateMilestoneStatus(input.id, input.status, input.proofOfWork);
      }),
  }),

  // News router
  news: router({
    list: publicProcedure.query(async () => {
      const { getAllNewsFeed } = await import('./db');
      return getAllNewsFeed();
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        source: z.enum(["official", "telegram", "github", "partner", "community"]),
        category: z.string().optional(),
        sourceUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        publishedAt: z.date(),
      }))
      .mutation(async ({ input }) => {
        const { createNewsFeedItem } = await import('./db');
        return createNewsFeedItem(input);
      }),
  }),

  // Ecosystem router
  ecosystem: router({
    list: publicProcedure.query(async () => {
      const { getAllEcosystemProjects } = await import('./db');
      return getAllEcosystemProjects();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getEcosystemProjectById } = await import('./db');
        return getEcosystemProjectById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string(),
        category: z.enum(["launchpad_alumni", "grant_recipient", "core_initiative"]),
        websiteUrl: z.string().optional(),
        logoUrl: z.string().optional(),
        tokenSymbol: z.string().optional(),
        fundingAmount: z.number().optional(),
        airdropDetails: z.string().optional(),
        status: z.string().optional(),
        socialLinks: z.string().optional(),
        launchpadProjectId: z.number().optional(),
        grantId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createEcosystemProject } = await import('./db');
        return createEcosystemProject(input);
      }),
  }),

  // Community router
  community: router({
    list: publicProcedure.query(async () => {
      const { getAllCommunityContent } = await import('./db');
      return getAllCommunityContent();
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        contentType: z.enum(["article", "video", "thread", "reddit"]),
        contentUrl: z.string(),
        authorName: z.string().optional(),
        excerpt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCommunityContent } = await import('./db');
        return createCommunityContent({
          ...input,
          submittedBy: ctx.user.id,
        });
      }),
    upvote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { upvoteCommunityContent } = await import('./db');
        return upvoteCommunityContent(input.id);
      }),
  }),

  // Governance Proposals router
  governance: router({
    list: publicProcedure.query(async () => {
      const { getAllProposals } = await import('./db');
      return getAllProposals();
    }),
    active: publicProcedure.query(async () => {
      const { getActiveProposals } = await import('./db');
      return getActiveProposals();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getProposalById } = await import('./db');
        return getProposalById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(10).max(500),
        description: z.string().min(50),
        proposer: z.string(),
        quorum: z.number().positive(),
        startDate: z.date(),
        endDate: z.date(),
        transactionHash: z.string().optional(),
        contractAddress: z.string().optional(),
        proposalId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createProposal } = await import('./db');
        return createProposal({
          ...input,
          proposerUserId: ctx.user.id,
        });
      }),
    vote: protectedProcedure
      .input(z.object({
        proposalId: z.number(),
        voteChoice: z.enum(["for", "against", "abstain"]),
        voterAddress: z.string(),
        votingPower: z.number().positive(),
        transactionHash: z.string().optional(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createProposalVote, getProposalVote, getProposalById, updateProposalVotes } = await import('./db');
        
        // Check if user already voted
        const existingVote = await getProposalVote(ctx.user.id, input.proposalId);
        if (existingVote) {
          throw new Error("You have already voted on this proposal");
        }
        
        // Get current proposal
        const proposal = await getProposalById(input.proposalId);
        if (!proposal) {
          throw new Error("Proposal not found");
        }
        
        // Create vote
        await createProposalVote({
          ...input,
          userId: ctx.user.id,
        });
        
        // Update proposal vote counts
        let newVotesFor = proposal.votesFor || 0;
        let newVotesAgainst = proposal.votesAgainst || 0;
        
        if (input.voteChoice === "for") {
          newVotesFor += input.votingPower;
        } else if (input.voteChoice === "against") {
          newVotesAgainst += input.votingPower;
        }
        
        await updateProposalVotes(input.proposalId, newVotesFor, newVotesAgainst);
        
        return { success: true };
      }),
    getUserVote: protectedProcedure
      .input(z.object({ proposalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getProposalVote } = await import('./db');
        return getProposalVote(ctx.user.id, input.proposalId);
      }),
    getVotes: publicProcedure
      .input(z.object({ proposalId: z.number() }))
      .query(async ({ input }) => {
        const { getProposalVotes } = await import('./db');
        return getProposalVotes(input.proposalId);
      }),
  }),

  // Voting router
  voting: router({
    vote: protectedProcedure
      .input(z.object({
        proposalType: z.enum(["launchpad", "grant"]),
        proposalId: z.number(),
        voteChoice: z.enum(["for", "against"]),
        votingPower: z.number(),
        transactionHash: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createVote, getUserVote } = await import('./db');
        // Check if user already voted
        const existingVote = await getUserVote(ctx.user.id, input.proposalType, input.proposalId);
        if (existingVote) {
          throw new Error("You have already voted on this proposal");
        }
        return createVote({
          ...input,
          userId: ctx.user.id,
        });
      }),
    getUserVote: protectedProcedure
      .input(z.object({
        proposalType: z.enum(["launchpad", "grant"]),
        proposalId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserVote } = await import('./db');
        return getUserVote(ctx.user.id, input.proposalType, input.proposalId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
