import { mysqlTable, int, varchar, text, timestamp, index } from "drizzle-orm/mysql-core";

// GitHub issue comments for grants
export const grantComments = mysqlTable("grant_comments", {
  id: int("id").autoincrement().primaryKey(),
  grantId: int("grantId").notNull(),
  githubCommentId: int("githubCommentId").notNull().unique(),
  author: varchar("author", { length: 255 }).notNull(),
  authorAvatar: varchar("authorAvatar", { length: 500 }),
  body: text("body").notNull(),
  bodyHtml: text("bodyHtml"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  reactions: text("reactions"), // JSON string of reactions
}, (table) => ({
  grantIdIdx: index("idx_grant_comment_grant_id").on(table.grantId),
  githubCommentIdIdx: index("idx_grant_comment_github_id").on(table.githubCommentId),
  createdAtIdx: index("idx_grant_comment_created_at").on(table.createdAt),
}));

export type GrantComment = typeof grantComments.$inferSelect;
export type InsertGrantComment = typeof grantComments.$inferInsert;

