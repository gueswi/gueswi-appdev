import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  role: text("role", { enum: ["owner", "admin", "user"] }).default("user").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tenants table
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry"),
  employeeCount: text("employee_count"),
  estimatedExtensions: integer("estimated_extensions"),
  plan: text("plan", { enum: ["starter", "growth"] }).default("starter").notNull(),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).default("inactive").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Extensions table
export const extensions = pgTable("extensions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull(),
  userId: uuid("user_id").references(() => users.id),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  status: text("status", { enum: ["active", "inactive"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bank transfers table (VE)
export const bankTransfers = pgTable("bank_transfers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  referenceNumber: text("reference_number").notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  bank: text("bank").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  transferDate: timestamp("transfer_date").notNull(),
  transferTime: text("transfer_time").notNull(),
  purpose: text("purpose").notNull(),
  comments: text("comments"),
  receiptUrl: text("receipt_url"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  adminComments: text("admin_comments"),
  processedAt: timestamp("processed_at"),
  processedBy: uuid("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Call records (mock)
export const callRecords = pgTable("call_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  extensionId: uuid("extension_id").references(() => extensions.id),
  duration: integer("duration"), // in seconds
  callType: text("call_type", { enum: ["incoming", "outgoing", "internal"] }).notNull(),
  aiProcessed: boolean("ai_processed").default(false),
  aiDuration: integer("ai_duration"), // AI processing duration in seconds
  cost: decimal("cost", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI metrics table
export const aiMetrics = pgTable("ai_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  date: timestamp("date").notNull(),
  totalSeconds: integer("total_seconds").default(0),
  totalCalls: integer("total_calls").default(0),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).default("0"),
  language: text("language").default("es"),
  success_rate: decimal("success_rate", { precision: 5, scale: 2 }).default("0"),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  extensions: many(extensions),
  bankTransfers: many(bankTransfers),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  extensions: many(extensions),
  bankTransfers: many(bankTransfers),
  callRecords: many(callRecords),
  aiMetrics: many(aiMetrics),
}));

export const extensionsRelations = relations(extensions, ({ one, many }) => ({
  user: one(users, {
    fields: [extensions.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [extensions.tenantId],
    references: [tenants.id],
  }),
  callRecords: many(callRecords),
}));

export const bankTransfersRelations = relations(bankTransfers, ({ one }) => ({
  user: one(users, {
    fields: [bankTransfers.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [bankTransfers.tenantId],
    references: [tenants.id],
  }),
  processedByUser: one(users, {
    fields: [bankTransfers.processedBy],
    references: [users.id],
  }),
}));

export const callRecordsRelations = relations(callRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [callRecords.tenantId],
    references: [tenants.id],
  }),
  extension: one(extensions, {
    fields: [callRecords.extensionId],
    references: [extensions.id],
  }),
}));

export const aiMetricsRelations = relations(aiMetrics, ({ one }) => ({
  tenant: one(tenants, {
    fields: [aiMetrics.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
});

export const insertTenantSchema = createInsertSchema(tenants).pick({
  name: true,
  industry: true,
  employeeCount: true,
  estimatedExtensions: true,
  plan: true,
});

export const insertBankTransferSchema = createInsertSchema(bankTransfers).pick({
  referenceNumber: true,
  bank: true,
  amount: true,
  transferDate: true,
  transferTime: true,
  purpose: true,
  comments: true,
  receiptUrl: true,
});

export const insertExtensionSchema = createInsertSchema(extensions).pick({
  number: true,
  userId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type BankTransfer = typeof bankTransfers.$inferSelect;
export type InsertBankTransfer = z.infer<typeof insertBankTransferSchema>;
export type Extension = typeof extensions.$inferSelect;
export type InsertExtension = z.infer<typeof insertExtensionSchema>;
export type CallRecord = typeof callRecords.$inferSelect;
export type AiMetric = typeof aiMetrics.$inferSelect;
