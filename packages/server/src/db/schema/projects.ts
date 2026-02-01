/**
 * Projects schema
 */

import { pgTable, text, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.js';

/** Project status enum values */
export const projectStatusValues = ['active', 'archived', 'error'] as const;

/** Projects table */
export const projects = pgTable('projects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  ownerId: varchar('owner_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  config: jsonb('config'), // ProjectConfig JSON
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Project members (many-to-many) */
export const projectMembers = pgTable('project_members', {
  projectId: varchar('project_id', { length: 36 }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('member'), // 'admin', 'member', 'viewer'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Project relations */
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  members: many(projectMembers),
}));

/** Project member relations */
export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

/** Project type */
export type DbProject = typeof projects.$inferSelect;
export type NewDbProject = typeof projects.$inferInsert;

/** Project member type */
export type DbProjectMember = typeof projectMembers.$inferSelect;
export type NewDbProjectMember = typeof projectMembers.$inferInsert;
