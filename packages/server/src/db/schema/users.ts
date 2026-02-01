/**
 * Users and authentication schema
 */

import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/** Users table */
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** API tokens table */
export const apiTokens = pgTable('api_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  tokenHash: text('token_hash').notNull(), // Hashed token value
  tokenPrefix: varchar('token_prefix', { length: 16 }).notNull(), // First chars for identification
  scopes: text('scopes').notNull(), // JSON array of scopes
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** User relations */
export const usersRelations = relations(users, ({ many }) => ({
  apiTokens: many(apiTokens),
}));

/** API token relations */
export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
}));

/** User type */
export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;

/** API token type */
export type DbApiToken = typeof apiTokens.$inferSelect;
export type NewDbApiToken = typeof apiTokens.$inferInsert;
