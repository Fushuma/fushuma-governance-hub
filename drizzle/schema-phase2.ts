import { mysqlTable, int, varchar, text, timestamp, bigint, mysqlEnum, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Epochs table - tracks governance epochs
 */
export const epochs = mysqlTable("epochs", {
  number: int("number").primaryKey(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  votingStartTime: timestamp("votingStartTime").notNull(),
  votingEndTime: timestamp("votingEndTime").notNull(),
  distributionTime: timestamp("distributionTime").notNull(),
  status: mysqlEnum("status", ["upcoming", "voting", "distribution", "completed"]).notNull(),
  totalVotingPower: bigint("totalVotingPower", { mode: "number" }).default(0),
  totalDistributed: bigint("totalDistributed", { mode: "number" }).default(0),
  proposalsCount: int("proposalsCount").default(0),
  votersCount: int("votersCount").default(0),
  finalized: boolean("finalized").default(false),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
});

/**
 * Gauges table - tracks all gauges for resource allocation
 */
export const gauges = mysqlTable("gauges", {
  id: int("id").autoincrement().primaryKey(),
  gaugeId: int("gaugeId").notNull().unique(), // On-chain gauge ID
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  gaugeType: mysqlEnum("gaugeType", ["grant", "treasury", "parameter"]).notNull(),
  contractAddress: varchar("contractAddress", { length: 42 }).notNull().unique(),
  weight: bigint("weight", { mode: "number" }).default(0),
  totalVotes: bigint("totalVotes", { mode: "number" }).default(0),
  isActive: boolean("isActive").default(true),
  addedAtEpoch: int("addedAtEpoch").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

/**
 * Gauge votes table - tracks user votes on gauges
 */
export const gaugeVotes = mysqlTable("gauge_votes", {
  id: int("id").autoincrement().primaryKey(),
  gaugeId: int("gaugeId").notNull(),
  userId: int("userId"),
  voterAddress: varchar("voterAddress", { length: 42 }).notNull(),
  veNftId: int("veNftId").notNull(),
  weight: int("weight").notNull(), // Weight in basis points (0-10000)
  votingPower: bigint("votingPower", { mode: "number" }).notNull(),
  epoch: int("epoch").notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }),
  createdAt: timestamp("createdAt").defaultNow(),
});

/**
 * Gauge distributions table - tracks resource distributions to gauges
 */
export const gaugeDistributions = mysqlTable("gauge_distributions", {
  id: int("id").autoincrement().primaryKey(),
  gaugeId: int("gaugeId").notNull(),
  epoch: int("epoch").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  weight: int("weight").notNull(), // Relative weight in basis points
  distributedAt: timestamp("distributedAt").notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }),
  claimed: boolean("claimed").default(false),
  claimedAt: timestamp("claimedAt"),
  metadata: json("metadata"),
});

/**
 * Grants table - tracks development grants linked to gauges
 */
export const grants = mysqlTable("grants", {
  id: int("id").autoincrement().primaryKey(),
  gaugeId: int("gaugeId"), // Link to gauge if applicable
  grantId: int("grantId").notNull(), // On-chain grant ID
  recipient: varchar("recipient", { length: 42 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  totalAmount: bigint("totalAmount", { mode: "number" }).notNull(),
  claimedAmount: bigint("claimedAmount", { mode: "number" }).default(0),
  startEpoch: int("startEpoch").notNull(),
  vestingEpochs: int("vestingEpochs").notNull(),
  isActive: boolean("isActive").default(true),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

/**
 * Grant claims table - tracks grant fund claims
 */
export const grantClaims = mysqlTable("grant_claims", {
  id: int("id").autoincrement().primaryKey(),
  grantId: int("grantId").notNull(),
  epoch: int("epoch").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  recipient: varchar("recipient", { length: 42 }).notNull(),
  transactionHash: varchar("transactionHash", { length: 66 }),
  claimedAt: timestamp("claimedAt").defaultNow(),
});

/**
 * News table - enhanced version with Telegram integration
 */
export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  excerpt: text("excerpt"),
  author: varchar("author", { length: 255 }),
  publishedAt: timestamp("publishedAt").notNull(),
  source: mysqlEnum("source", ["telegram", "manual", "github", "official"]).notNull(),
  sourceId: varchar("sourceId", { length: 255 }), // Telegram message ID
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  category: varchar("category", { length: 100 }),
  tags: json("tags"), // Array of tags
  isPinned: boolean("isPinned").default(false),
  viewCount: int("viewCount").default(0),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

/**
 * Proposal drafts table - tracks proposal creation wizard progress
 */
export const proposalDrafts = mysqlTable("proposal_drafts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }),
  summary: text("summary"),
  description: text("description"),
  proposalType: mysqlEnum("proposalType", ["parameter_change", "treasury_allocation", "grant_funding", "general"]),
  category: varchar("category", { length: 100 }),
  tags: json("tags"),
  actions: json("actions"), // On-chain actions
  votingConfig: json("votingConfig"), // Voting configuration
  currentStep: int("currentStep").default(1),
  isComplete: boolean("isComplete").default(false),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

/**
 * Telegram sync state table - tracks Telegram synchronization
 */
export const telegramSyncState = mysqlTable("telegram_sync_state", {
  id: int("id").autoincrement().primaryKey(),
  channelId: varchar("channelId", { length: 255 }).notNull().unique(),
  lastMessageId: varchar("lastMessageId", { length: 255 }),
  lastSyncAt: timestamp("lastSyncAt"),
  messagesSynced: int("messagesSynced").default(0),
  errorCount: int("errorCount").default(0),
  lastError: text("lastError"),
  isActive: boolean("isActive").default(true),
  metadata: json("metadata"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// Export types for TypeScript
export type Epoch = typeof epochs.$inferSelect;
export type NewEpoch = typeof epochs.$inferInsert;

export type Gauge = typeof gauges.$inferSelect;
export type NewGauge = typeof gauges.$inferInsert;

export type GaugeVote = typeof gaugeVotes.$inferSelect;
export type NewGaugeVote = typeof gaugeVotes.$inferInsert;

export type GaugeDistribution = typeof gaugeDistributions.$inferSelect;
export type NewGaugeDistribution = typeof gaugeDistributions.$inferInsert;

export type Grant = typeof grants.$inferSelect;
export type NewGrant = typeof grants.$inferInsert;

export type GrantClaim = typeof grantClaims.$inferSelect;
export type NewGrantClaim = typeof grantClaims.$inferInsert;

export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;

export type ProposalDraft = typeof proposalDrafts.$inferSelect;
export type NewProposalDraft = typeof proposalDrafts.$inferInsert;

export type TelegramSyncState = typeof telegramSyncState.$inferSelect;
export type NewTelegramSyncState = typeof telegramSyncState.$inferInsert;

