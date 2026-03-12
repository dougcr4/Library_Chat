import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectTypeEnum = pgEnum("project_type", ["furniture", "building"]);
export const projectStatusEnum = pgEnum("project_status", ["queued", "processing", "rendering", "complete", "error"]);

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: projectTypeEnum("type").notNull(),
  styleId: text("style_id"),
  itemId: text("item_id"),
  prompt: text("prompt").notNull(),
  status: projectStatusEnum("status").notNull().default("queued"),
  modelOutput: text("model_output"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  ollamaUrl: text("ollama_url").notNull().default("http://localhost:11434"),
  ollamaModel: text("ollama_model").notNull().default("qwen2.5"),
  openWebUiUrl: text("open_web_ui_url").notNull().default("http://localhost:3001"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Settings = typeof settingsTable.$inferSelect;
