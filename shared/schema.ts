import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publicId: varchar("public_id").notNull().unique().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(),
  objectPath: text("object_path").notNull(),
  publicId: varchar("public_id").default(sql`gen_random_uuid()`),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileId: varchar("file_id").notNull(),
  parentId: varchar("parent_id"),
  name: text("name").notNull(),
  email: text("email"),
  content: text("content").notNull(),
  tag: text("tag").notNull().default("To Do"), // "To Do", "In Progress", "Resolved"
  // Location metadata - only one will be used depending on file type
  positionX: integer("position_x"), // For images (stored as percentage * 100 for precision)
  positionY: integer("position_y"), // For images (stored as percentage * 100 for precision)
  timestamp: integer("timestamp"), // For videos (in seconds)
  page: integer("page"), // For PDFs
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectViews = pgTable("project_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  projectId: varchar("project_id").notNull(),
  lastViewedAt: timestamp("last_viewed_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  projectId: true,
  name: true,
  originalName: true,
  mimeType: true,
  size: true,
  objectPath: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  fileId: true,
  parentId: true,
  name: true,
  email: true,
  content: true,
  tag: true,
  positionX: true,
  positionY: true,
  timestamp: true,
  page: true,
});

export const insertProjectViewSchema = createInsertSchema(projectViews).pick({
  userId: true,
  projectId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertProjectView = z.infer<typeof insertProjectViewSchema>;
export type ProjectView = typeof projectViews.$inferSelect;
