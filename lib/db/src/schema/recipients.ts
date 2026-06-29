import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recipientsTable = pgTable("recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  domain: text("domain"),
  organization: text("organization"),
  metadata: jsonb("metadata").$type<Record<string, string>>(),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecipientSchema = createInsertSchema(recipientsTable).omit({ id: true, createdAt: true });
export type InsertRecipient = z.infer<typeof insertRecipientSchema>;
export type Recipient = typeof recipientsTable.$inferSelect;
