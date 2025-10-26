import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { delegatesRouter } from "./routers/delegates";
import { ratesRouter } from "./routers/rates";
import { encryptionRouter } from "./routers/encryption";
import { blockchainRouter } from "./routers/blockchain";
import { analyticsRouter } from "./routers/analytics";
import { githubRouter } from "./routers/github";
import { epochRouter } from "./routers/epoch";
import { gaugeRouter } from "./routers/gauge";
import { newsRouter as newsRouterV2 } from "./routers/news";
import { z } from "zod";
import {
  generateNonce,
  generateSignInMessage,
  verifyNonce,
  verifyWalletSignature,
  isValidEthereumAddress,
} from "./_core/web3Auth";
import { upsertUser } from "./db";
import { SignJWT } from "jose";
import { ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./_core/env";
import {
  ethereumAddressSchema,
  urlSchema,
  fundingAmountSchema,
  titleSchema,
  descriptionSchema,
  paginationSchema,
  tokenSymbolSchema,
  nameSchema,
  contactInfoSchema,
  votingPowerSchema,
  transactionHashSchema,
  launchpadStatusSchema,
  grantStatusSchema,
} from "./validation";

export const appRouter = router({
  system: systemRouter,
  delegates: delegatesRouter,
  rates: ratesRouter,
  encryption: encryptionRouter,
  blockchain: blockchainRouter,
  analytics: analyticsRouter,
  github: githubRouter,
  epoch: epochRouter,
  gauge: gaugeRouter,
  newsV2: newsRouterV2,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    
    // Web3 Authentication
    getNonce: publicProcedure
      .input(z.object({ address: z.string() }))
      .mutation(({ input }) => {
        const { address } = input;
        
        if (!isValidEthereumAddress(address)) {
          throw new Error("Invalid Ethereum address");
        }
        
        const nonce = generateNonce(address);
        const message = generateSignInMessage(address, nonce);
        
        return {
          nonce,
          message,
        };
      }),
    
    verifySignature: publicProcedure
      .input(z.object({
        address: z.string(),
        signature: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { address, signature, message } = input;
        
        if (!isValidEthereumAddress(address)) {
          throw new Error("Invalid Ethereum address");
        }
        
        // Verify signature
        const isValidSignature = verifyWalletSignature(message, signature, address);
        if (!isValidSignature) {
          throw new Error("Invalid signature");
        }
        
        // Extract nonce from message
        const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
        if (!nonceMatch) {
          throw new Error("Invalid message format");
        }
        const nonce = nonceMatch[1];
        
        // Verify nonce
        const isValidNonce = verifyNonce(address, nonce);
        if (!isValidNonce) {
          throw new Error("Invalid or expired nonce");
        }
        
        // Create or update user
        await upsertUser({
          openId: address.toLowerCase(),
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          email: null,
          loginMethod: "wallet",
          lastSignedIn: new Date(),
        });
        
        // Create session token
        const secret = new TextEncoder().encode(ENV.jwtSecret);
        const sessionToken = await new SignJWT({
          openId: address.toLowerCase(),
          appId: ENV.appId,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime(Math.floor(Date.now() / 1000) + ONE_YEAR_MS / 1000)
          .sign(secret);
        
        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        return {
          success: true,
          address: address.toLowerCase(),
        };
      }),
  }),

  // Launchpad router with validation and pagination
  launchpad: router({
    list: publicProcedure
      .input(paginationSchema.optional())
      .query(async ({ input }) => {
        const { getAllLaunchpadProjects } = await import('./db');
        const limit = input?.limit || 20;
        const offset = input?.offset || 0;
        return getAllLaunchpadProjects(limit, offset);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getLaunchpadProjectById } = await import('./db');
        return getLaunchpadProjectById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: titleSchema,
        description: descriptionSchema,
        teamBackground: z.string().max(10000).optional(),
        tokenomics: z.string().max(10000).optional(),
        roadmap: z.string().max(10000).optional(),
        fundingAmount: fundingAmountSchema,
        airdropAllocation: z.number().int().min(0).optional(),
        websiteUrl: urlSchema.optional(),
        tokenSymbol: tokenSymbolSchema.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createLaunchpadProject } = await import('./db');
        return createLaunchpadProject({
          ...input,
          submittedBy: ctx.user.id,
        });
      }),
    updateStatus: adminProcedure
      .input(z.object({ 
        id: z.number().int().positive(), 
        status: launchpadStatusSchema,
      }))
      .mutation(async ({ input }) => {
        const { updateLaunchpadProjectStatus } = await import('./db');
        return updateLaunchpadProjectStatus(input.id, input.status);
      }),
    vote: protectedProcedure
      .input(z.object({ 
        projectId: z.number().int().positive(), 
        support: z.boolean(),
      }))
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
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getUserVote } = await import('./db');
        return getUserVote(ctx.user.id, 'launchpad', input.projectId);
      }),
  }),

  // Grants router with validation and pagination
  grants: router({
    list: publicProcedure
      .input(paginationSchema.optional())
      .query(async ({ input }) => {
        const { getAllDevelopmentGrants } = await import('./db');
        const limit = input?.limit || 20;
        const offset = input?.offset || 0;
        return getAllDevelopmentGrants(limit, offset);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getDevelopmentGrantById } = await import('./db');
        return getDevelopmentGrantById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: titleSchema,
        applicantName: nameSchema,
        contactInfo: contactInfoSchema.optional(),
        description: descriptionSchema,
        valueProposition: z.string().min(50).max(5000),
        deliverables: z.string().min(50).max(5000),
        roadmap: z.string().min(50).max(5000),
        fundingRequest: fundingAmountSchema,
        receivingWallet: ethereumAddressSchema.optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createDevelopmentGrant } = await import('./db');
        return createDevelopmentGrant({
          ...input,
          submittedBy: ctx.user.id,
        });
      }),
    updateStatus: adminProcedure
      .input(z.object({ 
        id: z.number().int().positive(), 
        status: grantStatusSchema,
      }))
      .mutation(async ({ input }) => {
        const { updateDevelopmentGrantStatus } = await import('./db');
        return updateDevelopmentGrantStatus(input.id, input.status);
      }),
    getMilestones: publicProcedure
      .input(z.object({ grantId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getMilestonesByGrantId } = await import('./db');
        return getMilestonesByGrantId(input.grantId);
      }),
    createMilestone: protectedProcedure
      .input(z.object({
        grantId: z.number().int().positive(),
        title: titleSchema,
        description: z.string().max(5000).optional(),
        amount: fundingAmountSchema,
      }))
      .mutation(async ({ input }) => {
        const { createGrantMilestone } = await import('./db');
        return createGrantMilestone(input);
      }),
    updateMilestone: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["pending", "in_progress", "submitted", "approved", "paid"]),
        proofOfWork: z.string().max(5000).optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateMilestoneStatus } = await import('./db');
        return updateMilestoneStatus(input.id, input.status, input.proofOfWork);
      }),
    getComments: publicProcedure
      .input(z.object({ grantId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getGrantComments } = await import('./db');
        return getGrantComments(input.grantId);
      }),
  }),

  // News router with validation
  news: router({
    list: publicProcedure
      .input(paginationSchema.optional())
      .query(async ({ input }) => {
        const { getAllNewsFeed } = await import('./db');
        const limit = input?.limit || 50;
        return getAllNewsFeed(limit);
      }),
    create: protectedProcedure
      .input(z.object({
        title: titleSchema,
        content: z.string().max(50000).optional(),
        excerpt: z.string().max(500).optional(),
        source: z.enum(["official", "telegram", "github", "partner", "community"]),
        category: z.string().max(100).optional(),
        sourceUrl: urlSchema.optional(),
        imageUrl: urlSchema.optional(),
        publishedAt: z.date(),
      }))
      .mutation(async ({ input }) => {
        const { createNewsFeedItem } = await import('./db');
        return createNewsFeedItem(input);
      }),
  }),

  // Ecosystem router with validation and pagination
  ecosystem: router({
    list: publicProcedure
      .input(paginationSchema.optional())
      .query(async ({ input }) => {
        const { getAllEcosystemProjects } = await import('./db');
        const limit = input?.limit || 20;
        const offset = input?.offset || 0;
        return getAllEcosystemProjects(limit, offset);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getEcosystemProjectById } = await import('./db');
        return getEcosystemProjectById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: nameSchema,
        description: descriptionSchema,
        category: z.enum(["launchpad_alumni", "grant_recipient", "core_initiative"]),
        websiteUrl: urlSchema.optional(),
        logoUrl: urlSchema.optional(),
        tokenSymbol: tokenSymbolSchema.optional(),
        fundingAmount: fundingAmountSchema.optional(),
        airdropDetails: z.string().max(5000).optional(),
        status: z.string().max(50).optional(),
        socialLinks: z.string().max(2000).optional(),
        launchpadProjectId: z.number().int().positive().optional(),
        grantId: z.number().int().positive().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createEcosystemProject } = await import('./db');
        return createEcosystemProject(input);
      }),
  }),

  // Community router with validation and pagination
  community: router({
    list: publicProcedure
      .input(paginationSchema.optional())
      .query(async ({ input }) => {
        const { getAllCommunityContent } = await import('./db');
        const limit = input?.limit || 20;
        const offset = input?.offset || 0;
        return getAllCommunityContent(limit, offset);
      }),
    create: protectedProcedure
      .input(z.object({
        title: titleSchema,
        contentType: z.enum(["article", "video", "thread", "reddit"]),
        contentUrl: urlSchema,
        authorName: nameSchema.optional(),
        excerpt: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createCommunityContent } = await import('./db');
        return createCommunityContent({
          ...input,
          submittedBy: ctx.user.id,
        });
      }),
    upvote: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const { upvoteCommunityContent } = await import('./db');
        return upvoteCommunityContent(input.id);
      }),
  }),

  // Governance Proposals router with validation and pagination
  governance: router({
    list: publicProcedure
      .input(paginationSchema.optional())
      .query(async ({ input }) => {
        const { getAllProposals } = await import('./db');
        const limit = input?.limit || 20;
        const offset = input?.offset || 0;
        return getAllProposals(limit, offset);
      }),
    active: publicProcedure.query(async () => {
      const { getActiveProposals } = await import('./db');
      return getActiveProposals();
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getProposalById } = await import('./db');
        return getProposalById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        title: titleSchema,
        description: descriptionSchema,
        proposer: ethereumAddressSchema,
        quorum: z.number().int().positive(),
        startDate: z.date(),
        endDate: z.date(),
        transactionHash: transactionHashSchema.optional(),
        contractAddress: ethereumAddressSchema.optional(),
        proposalId: z.number().int().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createProposal } = await import('./db');
        // Validate date range
        if (input.endDate <= input.startDate) {
          throw new Error("End date must be after start date");
        }
        return createProposal({
          ...input,
          proposerUserId: ctx.user.id,
        });
      }),
    vote: protectedProcedure
      .input(z.object({
        proposalId: z.number().int().positive(),
        voteChoice: z.enum(["for", "against", "abstain"]),
        voterAddress: ethereumAddressSchema,
        votingPower: votingPowerSchema,
        transactionHash: transactionHashSchema.optional(),
        reason: z.string().max(2000).optional(),
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
      .input(z.object({ proposalId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const { getProposalVote } = await import('./db');
        return getProposalVote(ctx.user.id, input.proposalId);
      }),
    getVotes: publicProcedure
      .input(z.object({ proposalId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const { getProposalVotes } = await import('./db');
        return getProposalVotes(input.proposalId);
      }),
  }),

  // Voting router with validation
  voting: router({
    vote: protectedProcedure
      .input(z.object({
        proposalType: z.enum(["launchpad", "grant"]),
        proposalId: z.number().int().positive(),
        voteChoice: z.enum(["for", "against"]),
        votingPower: votingPowerSchema,
        transactionHash: transactionHashSchema.optional(),
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
        proposalId: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserVote } = await import('./db');
        return getUserVote(ctx.user.id, input.proposalType, input.proposalId);
      }),
  }),
});

export type AppRouter = typeof appRouter;

