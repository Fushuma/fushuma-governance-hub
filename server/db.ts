import { eq, and, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import * as schemaPhase2 from "../drizzle/schema-phase2";
import { 
  InsertUser, users,
  launchpadProjects, InsertLaunchpadProject,
  developmentGrants, InsertDevelopmentGrant,
  grantMilestones, InsertGrantMilestone,
  grantComments,
  newsFeed, InsertNewsFeedItem,
  ecosystemProjects, InsertEcosystemProject,
  communityContent, InsertCommunityContent,
  votes, InsertVote,
  proposals, InsertProposal,
  proposalVotes, InsertProposalVote
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: 'default' });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Merge both schemas
const fullSchema = { ...schema, ...schemaPhase2 };

// Export synchronous db instance for services (assumes DB is already initialized)
export const db = drizzle(process.env.DATABASE_URL!, { schema: fullSchema, mode: 'default' });

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Launchpad Projects
export async function getAllLaunchpadProjects(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(launchpadProjects)
    .where(isNull(launchpadProjects.deletedAt))
    .orderBy(desc(launchpadProjects.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getLaunchpadProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(launchpadProjects).where(eq(launchpadProjects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLaunchpadProject(project: InsertLaunchpadProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(launchpadProjects).values(project);
  return result;
}

export async function updateLaunchpadProjectStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(launchpadProjects).set({ status: status as any }).where(eq(launchpadProjects.id, id));
}

// Development Grants
export async function getAllDevelopmentGrants(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(developmentGrants)
    .where(isNull(developmentGrants.deletedAt))
    .orderBy(desc(developmentGrants.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getDevelopmentGrantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(developmentGrants).where(eq(developmentGrants.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDevelopmentGrant(grant: InsertDevelopmentGrant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(developmentGrants).values(grant);
  return result;
}

export async function updateDevelopmentGrantStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(developmentGrants).set({ status: status as any }).where(eq(developmentGrants.id, id));
}

// Grant Milestones
export async function getMilestonesByGrantId(grantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(grantMilestones).where(eq(grantMilestones.grantId, grantId));
}

export async function createGrantMilestone(milestone: InsertGrantMilestone) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(grantMilestones).values(milestone);
  return result;
}

export async function updateMilestoneStatus(id: number, status: string, proofOfWork?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (proofOfWork) updateData.proofOfWork = proofOfWork;
  if (status === 'approved') updateData.completedAt = new Date();
  await db.update(grantMilestones).set(updateData).where(eq(grantMilestones.id, id));
}

// Grant Comments
export async function getGrantComments(grantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(grantComments)
    .where(eq(grantComments.grantId, grantId))
    .orderBy(grantComments.createdAt);
}

export async function addGrantComment(comment: {
  grantId: number;
  author: string;
  authorAvatar: string | null;
  body: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(grantComments).values({
    grantId: comment.grantId,
    githubCommentId: null,
    author: comment.author,
    authorAvatar: comment.authorAvatar,
    body: comment.body,
    reactions: null
  });
  
  return result;
}

// News Feed
export async function getAllNewsFeed(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(newsFeed).orderBy(desc(newsFeed.publishedAt)).limit(limit);
}

export async function createNewsFeedItem(item: InsertNewsFeedItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(newsFeed).values(item);
  return result;
}

// Ecosystem Projects
export async function getAllEcosystemProjects(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ecosystemProjects)
    .where(isNull(ecosystemProjects.deletedAt))
    .orderBy(desc(ecosystemProjects.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getEcosystemProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ecosystemProjects).where(eq(ecosystemProjects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEcosystemProject(project: InsertEcosystemProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ecosystemProjects).values(project);
  return result;
}

// Community Content
export async function getAllCommunityContent(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(communityContent)
    .where(isNull(communityContent.deletedAt))
    .orderBy(desc(communityContent.upvotes))
    .limit(limit)
    .offset(offset);
}

export async function createCommunityContent(content: InsertCommunityContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(communityContent).values(content);
  return result;
}

export async function upvoteCommunityContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const content = await db.select().from(communityContent).where(eq(communityContent.id, id)).limit(1);
  if (content.length > 0 && content[0]) {
    await db.update(communityContent).set({ upvotes: (content[0].upvotes || 0) + 1 }).where(eq(communityContent.id, id));
  }
}

// Votes
export async function createVote(vote: InsertVote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(votes).values(vote);
  return result;
}

export async function getUserVote(userId: number, proposalType: string, proposalId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(votes)
    .where(and(
      eq(votes.userId, userId),
      eq(votes.proposalType, proposalType as any),
      eq(votes.proposalId, proposalId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Governance Proposals
export async function getAllProposals(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(proposals)
    .where(isNull(proposals.deletedAt))
    .orderBy(desc(proposals.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getActiveProposals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(proposals)
    .where(and(
      eq(proposals.status, 'active'),
      isNull(proposals.deletedAt)
    ))
    .orderBy(desc(proposals.endDate));
}

export async function getProposalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProposal(proposal: InsertProposal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(proposals).values(proposal);
  return result;
}

export async function updateProposalStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(proposals).set({ status: status as any }).where(eq(proposals.id, id));
}

export async function updateProposalVotes(id: number, votesFor: number, votesAgainst: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const totalVotes = votesFor + votesAgainst;
  await db.update(proposals).set({ votesFor, votesAgainst, totalVotes }).where(eq(proposals.id, id));
}

// Proposal Votes
export async function createProposalVote(vote: InsertProposalVote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(proposalVotes).values(vote);
  return result;
}

export async function getProposalVote(userId: number, proposalId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(proposalVotes)
    .where(and(
      eq(proposalVotes.userId, userId),
      eq(proposalVotes.proposalId, proposalId)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProposalVotes(proposalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(proposalVotes)
    .where(eq(proposalVotes.proposalId, proposalId))
    .orderBy(desc(proposalVotes.createdAt));
}


// Soft Delete Functions
export async function softDeleteLaunchpadProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(launchpadProjects)
    .set({ deletedAt: new Date() })
    .where(eq(launchpadProjects.id, id));
}

export async function softDeleteDevelopmentGrant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(developmentGrants)
    .set({ deletedAt: new Date() })
    .where(eq(developmentGrants.id, id));
}

export async function softDeleteEcosystemProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ecosystemProjects)
    .set({ deletedAt: new Date() })
    .where(eq(ecosystemProjects.id, id));
}

export async function softDeleteCommunityContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(communityContent)
    .set({ deletedAt: new Date() })
    .where(eq(communityContent.id, id));
}

export async function softDeleteProposal(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(proposals)
    .set({ deletedAt: new Date() })
    .where(eq(proposals.id, id));
}

