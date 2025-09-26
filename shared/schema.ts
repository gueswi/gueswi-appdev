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
  defaultExtension: uuid("default_extension"),
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

// Extensions table (enhanced for telephony)
export const extensions = pgTable("extensions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  number: text("number").notNull(),
  userName: text("user_name").notNull(),
  userId: uuid("user_id").references(() => users.id),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  status: text("status", { enum: ["ACTIVE", "INACTIVE"] }).default("ACTIVE").notNull(),
  lastSeenAt: timestamp("last_seen_at"),
  sipPassword: text("sip_password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// IVR Menu table
export const ivrMenus = pgTable("ivr_menus", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  greetingUrl: text("greeting_url"),
  options: jsonb("options").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Queue table
export const queues = pgTable("queues", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  waiting: integer("waiting").default(0).notNull(),
  avgWaitSec: integer("avg_wait_sec").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recording table
export const recordings = pgTable("recordings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  callId: text("call_id").notNull(),
  startedAt: timestamp("started_at").notNull(),
  durationSec: integer("duration_sec").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations table (omnichannel inbox)
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  extensionId: uuid("extension_id").references(() => extensions.id),
  userId: uuid("user_id").references(() => users.id),
  callId: text("call_id"),
  phoneNumber: text("phone_number"),
  // Omnichannel fields
  channel: text("channel", { enum: ["voice", "whatsapp", "instagram", "facebook", "email", "webchat"] }).default("voice").notNull(),
  status: text("status", { enum: ["open", "pending", "closed", "active", "ended", "ringing", "answered"] }).default("open").notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id),
  teamId: uuid("team_id"), // Could reference a future teams table
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).default("normal"),
  tags: text("tags").array().default(sql`'{}'`),
  customFields: jsonb("custom_fields").default("{}"),
  // Legacy voice fields
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table (omnichannel conversation feed)
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  type: text("type", { enum: ["text", "note", "event", "transcript", "attachment"] }).default("text").notNull(),
  role: text("role", { enum: ["customer", "agent", "ai", "system"] }).default("customer").notNull(),
  text: text("text").default("").notNull(),
  attachments: jsonb("attachments").default("[]"),
  // Legacy fields for backward compatibility
  from: text("from", { enum: ["customer", "agent", "ai"] }),
  content: text("content"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Mentions table (for @mentions in messages)
export const mentions = pgTable("mentions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid("message_id").references(() => messages.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Views table (saved filters for inbox)
export const views = pgTable("views", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  name: text("name").notNull(),
  query: jsonb("query").notNull(),
  shared: boolean("shared").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  defaultExtensionRef: one(extensions, {
    fields: [users.defaultExtension],
    references: [extensions.id],
  }),
  extensions: many(extensions),
  bankTransfers: many(bankTransfers),
  conversations: many(conversations),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  extensions: many(extensions),
  bankTransfers: many(bankTransfers),
  callRecords: many(callRecords),
  aiMetrics: many(aiMetrics),
  ivrMenus: many(ivrMenus),
  queues: many(queues),
  recordings: many(recordings),
  conversations: many(conversations),
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

export const ivrMenusRelations = relations(ivrMenus, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ivrMenus.tenantId],
    references: [tenants.id],
  }),
}));

export const queuesRelations = relations(queues, ({ one }) => ({
  tenant: one(tenants, {
    fields: [queues.tenantId],
    references: [tenants.id],
  }),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [recordings.tenantId],
    references: [tenants.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [conversations.tenantId],
    references: [tenants.id],
  }),
  extension: one(extensions, {
    fields: [conversations.extensionId],
    references: [extensions.id],
  }),
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [conversations.assigneeId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  mentions: many(mentions),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  message: one(messages, {
    fields: [mentions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [mentions.userId],
    references: [users.id],
  }),
}));

export const viewsRelations = relations(views, ({ one }) => ({
  tenant: one(tenants, {
    fields: [views.tenantId],
    references: [tenants.id],
  }),
  owner: one(users, {
    fields: [views.ownerId],
    references: [users.id],
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
  userName: true,
  userId: true,
  status: true,
  sipPassword: true,
}).partial({ sipPassword: true });

export const insertIvrMenuSchema = createInsertSchema(ivrMenus).pick({
  name: true,
  greetingUrl: true,
  options: true,
});

export const insertQueueSchema = createInsertSchema(queues).pick({
  name: true,
  waiting: true,
  avgWaitSec: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  callId: true,
  startedAt: true,
  durationSec: true,
  sizeBytes: true,
  url: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  extensionId: true,
  userId: true,
  callId: true,
  phoneNumber: true,
  channel: true,
  status: true,
  assigneeId: true,
  teamId: true,
  priority: true,
  tags: true,
  customFields: true,
  notes: true,
}).partial({ 
  extensionId: true, 
  userId: true, 
  callId: true,
  phoneNumber: true,
  assigneeId: true,
  teamId: true,
  priority: true,
  tags: true,
  customFields: true,
  notes: true 
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  type: true,
  role: true,
  text: true,
  attachments: true,
  // Legacy fields for backward compatibility
  from: true,
  content: true,
}).partial({ attachments: true, from: true, content: true });

export const insertMentionSchema = createInsertSchema(mentions).pick({
  messageId: true,
  userId: true,
});

export const insertViewSchema = createInsertSchema(views).pick({
  ownerId: true,
  name: true,
  query: true,
  shared: true,
}).partial({ ownerId: true, shared: true });

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
export type IvrMenu = typeof ivrMenus.$inferSelect;
export type InsertIvrMenu = z.infer<typeof insertIvrMenuSchema>;
export type Queue = typeof queues.$inferSelect;
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Mention = typeof mentions.$inferSelect;
export type InsertMention = z.infer<typeof insertMentionSchema>;
export type View = typeof views.$inferSelect;
export type InsertView = z.infer<typeof insertViewSchema>;
