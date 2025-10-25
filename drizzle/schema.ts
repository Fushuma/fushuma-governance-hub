import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, index, bigint, json, boolean, unique } from "drizzle-orm/mysql-core";

/**
 * Enhanced database schema with indexes for performance and soft deletes
 * Indexes added on frequently queried fields
 */

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  roleIdx: index("idx_role").on(table.role),
  emailIdx: index("idx_email").on(table.email),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Launchpad Projects with indexes and soft deletes
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
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  statusIdx: index("idx_launchpad_status").on(table.status),
  submittedByIdx: index("idx_launchpad_submitted_by").on(table.submittedBy),
  createdAtIdx: index("idx_launchpad_created_at").on(table.createdAt),
  statusCreatedIdx: index("idx_launchpad_status_created").on(table.status, table.createdAt),
}));

export type LaunchpadProject = typeof launchpadProjects.$inferSelect;
export type InsertLaunchpadProject = typeof launchpadProjects.$inferInsert;

// Development Grants with indexes and soft deletes
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
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  statusIdx: index("idx_grant_status").on(table.status),
  submittedByIdx: index("idx_grant_submitted_by").on(table.submittedBy),
  createdAtIdx: index("idx_grant_created_at").on(table.createdAt),
  statusCreatedIdx: index("idx_grant_status_created").on(table.status, table.createdAt),
}));

export type DevelopmentGrant = typeof developmentGrants.$inferSelect;
export type InsertDevelopmentGrant = typeof developmentGrants.$inferInsert;

// Grant Milestones with indexes
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
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  grantIdIdx: index("idx_milestone_grant_id").on(table.grantId),
  statusIdx: index("idx_milestone_status").on(table.status),
}));

export type GrantMilestone = typeof grantMilestones.$inferSelect;
export type InsertGrantMilestone = typeof grantMilestones.$inferInsert;

// News Feed Items with indexes
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
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  sourceIdx: index("idx_news_source").on(table.source),
  publishedAtIdx: index("idx_news_published_at").on(table.publishedAt),
  categoryIdx: index("idx_news_category").on(table.category),
}));

export type NewsFeedItem = typeof newsFeed.$inferSelect;
export type InsertNewsFeedItem = typeof newsFeed.$inferInsert;

// Ecosystem Projects Directory with indexes and soft deletes
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
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  categoryIdx: index("idx_ecosystem_category").on(table.category),
  launchpadProjectIdIdx: index("idx_ecosystem_launchpad_id").on(table.launchpadProjectId),
  grantIdIdx: index("idx_ecosystem_grant_id").on(table.grantId),
}));

export type EcosystemProject = typeof ecosystemProjects.$inferSelect;
export type InsertEcosystemProject = typeof ecosystemProjects.$inferInsert;

// Community Content with indexes and soft deletes
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
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  contentTypeIdx: index("idx_community_content_type").on(table.contentType),
  upvotesIdx: index("idx_community_upvotes").on(table.upvotes),
  submittedByIdx: index("idx_community_submitted_by").on(table.submittedBy),
}));

export type CommunityContent = typeof communityContent.$inferSelect;
export type InsertCommunityContent = typeof communityContent.$inferInsert;

// Votes with indexes
export const votes = mysqlTable("votes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  proposalType: mysqlEnum("proposalType", ["launchpad", "grant"]).notNull(),
  proposalId: int("proposalId").notNull(),
  voteChoice: mysqlEnum("voteChoice", ["for", "against"]).notNull(),
  votingPower: int("votingPower").notNull(),
  transactionHash: varchar("transactionHash", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userProposalIdx: index("idx_vote_user_proposal").on(table.userId, table.proposalType, table.proposalId),
  proposalIdx: index("idx_vote_proposal").on(table.proposalType, table.proposalId),
}));

export type Vote = typeof votes.$inferSelect;
export type InsertVote = typeof votes.$inferInsert;

// Governance Proposals with indexes
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
  isEncrypted: boolean("isEncrypted").default(false),
  encryptedDataUri: varchar("encryptedDataUri", { length: 500 }),
  metadataHash: varchar("metadataHash", { length: 66 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
}, (table) => ({
  statusIdx: index("idx_proposal_status").on(table.status),
  proposerIdx: index("idx_proposal_proposer").on(table.proposer),
  endDateIdx: index("idx_proposal_end_date").on(table.endDate),
  statusEndDateIdx: index("idx_proposal_status_end_date").on(table.status, table.endDate),
}));

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;

// Proposal Votes with indexes
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
}, (table) => ({
  proposalIdIdx: index("idx_proposal_vote_proposal_id").on(table.proposalId),
  userProposalIdx: index("idx_proposal_vote_user_proposal").on(table.userId, table.proposalId),
}));

export type ProposalVote = typeof proposalVotes.$inferSelect;
export type InsertProposalVote = typeof proposalVotes.$inferInsert;

// Blockchain Events - for indexing on-chain events
export const blockchainEvents = mysqlTable("blockchain_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  contractAddress: varchar("contractAddress", { length: 42 }).notNull(),
  blockNumber: bigint("blockNumber", { mode: "number" }).notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }).notNull(),
  eventData: json("eventData").notNull(),
  processedAt: timestamp("processedAt").defaultNow(),
}, (table) => ({
  blockNumberIdx: index("idx_block_number").on(table.blockNumber),
  contractIdx: index("idx_contract_address").on(table.contractAddress),
  eventTypeIdx: index("idx_event_type").on(table.eventType),
  txHashIdx: index("idx_transaction_hash").on(table.transactionHash),
}));

export type BlockchainEvent = typeof blockchainEvents.$inferSelect;
export type InsertBlockchainEvent = typeof blockchainEvents.$inferInsert;

// Indexer State - tracks last processed block for each contract
export const indexerState = mysqlTable("indexer_state", {
  id: int("id").autoincrement().primaryKey(),
  contractAddress: varchar("contractAddress", { length: 42 }).notNull().unique(),
  lastProcessedBlock: bigint("lastProcessedBlock", { mode: "number" }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type IndexerState = typeof indexerState.$inferSelect;
export type InsertIndexerState = typeof indexerState.$inferInsert;

// Delegates - for delegation tracking
export const delegates = mysqlTable("delegates", {
  id: int("id").autoincrement().primaryKey(),
  address: varchar("address", { length: 42 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  bio: text("bio"),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  twitterHandle: varchar("twitterHandle", { length: 100 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  verified: boolean("verified").default(false),
  votingPower: bigint("votingPower", { mode: "number" }).default(0),
  delegatorCount: int("delegatorCount").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  addressIdx: index("idx_delegate_address").on(table.address),
  votingPowerIdx: index("idx_delegate_voting_power").on(table.votingPower),
}));

export type Delegate = typeof delegates.$inferSelect;
export type InsertDelegate = typeof delegates.$inferInsert;

// Delegations - tracks delegation history
export const delegations = mysqlTable("delegations", {
  id: int("id").autoincrement().primaryKey(),
  delegator: varchar("delegator", { length: 42 }).notNull(),
  delegate: varchar("delegate", { length: 42 }).notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }).notNull(),
  blockNumber: bigint("blockNumber", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  delegatorIdx: index("idx_delegator").on(table.delegator),
  delegateIdx: index("idx_delegate").on(table.delegate),
  uniqueDelegation: unique("unique_delegation").on(table.delegator, table.delegate),
}));

export type Delegation = typeof delegations.$inferSelect;
export type InsertDelegation = typeof delegations.$inferInsert;

// Token Prices - for price tracking
export const tokenPrices = mysqlTable("token_prices", {
  id: int("id").autoincrement().primaryKey(),
  tokenAddress: varchar("tokenAddress", { length: 42 }).notNull(),
  tokenSymbol: varchar("tokenSymbol", { length: 20 }).notNull(),
  priceUsd: varchar("priceUsd", { length: 50 }).notNull(),
  volume24h: varchar("volume24h", { length: 50 }),
  marketCap: varchar("marketCap", { length: 50 }),
  priceChange24h: varchar("priceChange24h", { length: 20 }),
  source: varchar("source", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  tokenAddressIdx: index("idx_token_address").on(table.tokenAddress),
  createdAtIdx: index("idx_token_price_created_at").on(table.createdAt),
  tokenTimeIdx: index("idx_token_time").on(table.tokenAddress, table.createdAt),
}));

export type TokenPrice = typeof tokenPrices.$inferSelect;
export type InsertTokenPrice = typeof tokenPrices.$inferInsert;

