import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Launchpad Projects
export const launchpadProjects = mysqlTable("launchpad_projects", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  teamBackground: text("teamBackground"),
  tokenomics: text("tokenomics"),
  roadmap: text("roadmap"),
  fundingAmount: int("fundingAmount").notNull(),
  airdropAllocation: int("airdropAllocation"),
  status: mysqlEnum("status", ["submitted", "review", "voting", "approved", "fundraising", "launched", "rejected"]).default("submitted").notNull(),
  submittedBy: int("submittedBy").notNull(),
  votesFor: int("votesFor").default(0),
  votesAgainst: int("votesAgainst").default(0),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  tokenSymbol: varchar("tokenSymbol", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LaunchpadProject = typeof launchpadProjects.$inferSelect;
export type InsertLaunchpadProject = typeof launchpadProjects.$inferInsert;

// Development Grants
export const developmentGrants = mysqlTable("development_grants", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  applicantName: varchar("applicantName", { length: 255 }).notNull(),
  contactInfo: varchar("contactInfo", { length: 255 }),
  description: text("description").notNull(),
  valueProposition: text("valueProposition").notNull(),
  deliverables: text("deliverables").notNull(),
  roadmap: text("roadmap").notNull(),
  fundingRequest: int("fundingRequest").notNull(),
  receivingWallet: varchar("receivingWallet", { length: 100 }),
  status: mysqlEnum("status", ["submitted", "review", "approved", "in_progress", "completed", "rejected"]).default("submitted").notNull(),
  submittedBy: int("submittedBy").notNull(),
  githubIssueUrl: varchar("githubIssueUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DevelopmentGrant = typeof developmentGrants.$inferSelect;
export type InsertDevelopmentGrant = typeof developmentGrants.$inferInsert;

// Grant Milestones
export const grantMilestones = mysqlTable("grant_milestones", {
  id: int("id").autoincrement().primaryKey(),
  grantId: int("grantId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "submitted", "approved", "paid"]).default("pending").notNull(),
  proofOfWork: text("proofOfWork"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrantMilestone = typeof grantMilestones.$inferSelect;
export type InsertGrantMilestone = typeof grantMilestones.$inferInsert;

// News Feed Items
export const newsFeed = mysqlTable("news_feed", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  excerpt: text("excerpt"),
  source: mysqlEnum("source", ["official", "telegram", "github", "partner", "community"]).notNull(),
  category: varchar("category", { length: 100 }),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  imageUrl: varchar("imageUrl", { length: 1000 }),
  publishedAt: timestamp("publishedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewsFeedItem = typeof newsFeed.$inferSelect;
export type InsertNewsFeedItem = typeof newsFeed.$inferInsert;

// Ecosystem Projects Directory
export const ecosystemProjects = mysqlTable("ecosystem_projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["launchpad_alumni", "grant_recipient", "core_initiative"]).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  logoUrl: varchar("logoUrl", { length: 500 }),
  tokenSymbol: varchar("tokenSymbol", { length: 20 }),
  fundingAmount: int("fundingAmount"),
  airdropDetails: text("airdropDetails"),
  status: varchar("status", { length: 50 }),
  socialLinks: text("socialLinks"),
  launchpadProjectId: int("launchpadProjectId"),
  grantId: int("grantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EcosystemProject = typeof ecosystemProjects.$inferSelect;
export type InsertEcosystemProject = typeof ecosystemProjects.$inferInsert;

// Community Content
export const communityContent = mysqlTable("community_content", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  contentType: mysqlEnum("contentType", ["article", "video", "thread", "reddit"]).notNull(),
  contentUrl: varchar("contentUrl", { length: 1000 }).notNull(),
  authorName: varchar("authorName", { length: 255 }),
  excerpt: text("excerpt"),
  upvotes: int("upvotes").default(0),
  featured: int("featured").default(0),
  submittedBy: int("submittedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommunityContent = typeof communityContent.$inferSelect;
export type InsertCommunityContent = typeof communityContent.$inferInsert;

// Votes (for governance)
export const votes = mysqlTable("votes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  proposalType: mysqlEnum("proposalType", ["launchpad", "grant"]).notNull(),
  proposalId: int("proposalId").notNull(),
  voteChoice: mysqlEnum("voteChoice", ["for", "against"]).notNull(),
  votingPower: int("votingPower").notNull(),
  transactionHash: varchar("transactionHash", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

// Governance Proposals
export const proposals = mysqlTable("proposals", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  proposer: varchar("proposer", { length: 100 }).notNull(),
  proposerUserId: int("proposerUserId"),
  status: mysqlEnum("status", ["pending", "active", "passed", "rejected", "executed", "cancelled"]).default("pending").notNull(),
  votesFor: int("votesFor").default(0).notNull(),
  votesAgainst: int("votesAgainst").default(0).notNull(),
  totalVotes: int("totalVotes").default(0).notNull(),
  quorum: int("quorum").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  executionDate: timestamp("executionDate"),
  transactionHash: varchar("transactionHash", { length: 100 }),
  contractAddress: varchar("contractAddress", { length: 100 }),
  proposalId: int("proposalId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;

// Proposal Votes
export const proposalVotes = mysqlTable("proposal_votes", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  userId: int("userId").notNull(),
  voterAddress: varchar("voterAddress", { length: 100 }).notNull(),
  voteChoice: mysqlEnum("voteChoice", ["for", "against", "abstain"]).notNull(),
  votingPower: int("votingPower").notNull(),
  transactionHash: varchar("transactionHash", { length: 100 }),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProposalVote = typeof proposalVotes.$inferSelect;
export type InsertProposalVote = typeof proposalVotes.$inferInsert;