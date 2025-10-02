import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, uuid, jsonb, date, numeric, primaryKey, unique } from "drizzle-orm/pg-core";
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
  greetingText: text("greeting_text"),
  greetingAudioUrl: text("greeting_audio_url"),
  greetingVoiceGender: text("greeting_voice_gender", { enum: ["hombre", "mujer"] }),
  greetingVoiceStyle: text("greeting_voice_style", { enum: ["neutral", "amable", "energetico"] }),
  menuOptions: jsonb("menu_options").default(sql`'[]'::jsonb`),
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

// Conversations table (softphone)
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  extensionId: uuid("extension_id").references(() => extensions.id),
  userId: uuid("user_id").references(() => users.id),
  callId: text("call_id").notNull(),
  phoneNumber: text("phone_number"),
  status: text("status", { enum: ["active", "ended", "ringing", "answered"] }).default("ringing").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  duration: integer("duration").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table (call conversation feed)
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  from: text("from", { enum: ["customer", "agent", "ai"] }).notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
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
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
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
  greetingText: true,
  greetingAudioUrl: true,
  greetingVoiceGender: true,
  greetingVoiceStyle: true,
  menuOptions: true,
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
  status: true,
  notes: true,
}).partial({ extensionId: true, userId: true, phoneNumber: true, notes: true });

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  from: true,
  content: true,
});

// Pipeline CRM
export const pipelines = pgTable("pipelines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  pipelineId: uuid("pipeline_id").notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  color: text("color").default("#3b82f6"),
  isFixed: boolean("is_fixed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  pipelineId: uuid("pipeline_id").notNull(),
  stageId: uuid("stage_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  value: decimal("value", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  probability: integer("probability").default(50),
  source: text("source"),
  sourceId: text("source_id"),
  assignedTo: uuid("assigned_to"),
  expectedCloseDate: timestamp("expected_close_date"),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadActivities = pgTable("lead_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull(),
  userId: uuid("user_id"),
  type: text("type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================== CALENDARIO Y RESERVAS ====================

// 1. Locaciones físicas del negocio
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  timezone: text("timezone").notNull().default("UTC"),
  phone: text("phone"),
  email: text("email"),
  settings: jsonb("settings"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Servicios ofrecidos
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  capacity: integer("capacity").default(1),
  bufferTime: integer("buffer_time").default(0),
  color: text("color").default("#3b82f6"),
  slotDuration: integer("slot_duration"),
  depositRequired: boolean("deposit_required").default(false),
  allowRecurring: boolean("allow_recurring").default(false),
  customFields: jsonb("custom_fields"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Relación many-to-many: servicio puede estar en múltiples locaciones
export const serviceLocations = pgTable("service_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueServiceLocation: unique().on(table.serviceId, table.locationId),
}));

// 4. Personal/empleados que brindan servicios
export const staffMembers = pgTable("staff_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  color: text("color").default("#3b82f6"),
  locationId: uuid("location_id").references(() => locations.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 5. Relación many-to-many: staff member puede ofrecer múltiples servicios
export const staffServices = pgTable("staff_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id").notNull().references(() => staffMembers.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueStaffService: unique().on(table.staffId, table.serviceId),
}));

// 6. Reglas de disponibilidad (horarios de trabajo)
export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id").notNull().references(() => staffMembers.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  serviceId: uuid("service_id").references(() => services.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Excepciones de disponibilidad (vacaciones, días festivos)
export const availabilityExceptions = pgTable("availability_exceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id").notNull().references(() => staffMembers.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  isAvailable: boolean("is_available").default(false),
  startTime: text("start_time"),
  endTime: text("end_time"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 8. Citas/appointments
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  staffId: uuid("staff_id").notNull().references(() => staffMembers.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  customFields: jsonb("custom_fields"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull(),
  status: text("status").notNull().default("pending"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  parentAppointmentId: uuid("parent_appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  videoMeetingUrl: text("video_meeting_url"),
  reminderSent24h: boolean("reminder_sent_24h").default(false),
  reminderSent1h: boolean("reminder_sent_1h").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 9. Lista de espera
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  staffId: uuid("staff_id").references(() => staffMembers.id),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  preferredDate: date("preferred_date"),
  preferredTimeSlot: text("preferred_time_slot"),
  status: text("status").default("waiting"),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// 10. Configuración de notificaciones
export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  template: text("template").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calendar Relations
export const locationsRelations = relations(locations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [locations.tenantId],
    references: [tenants.id],
  }),
  serviceLocations: many(serviceLocations),
  appointments: many(appointments),
  waitlist: many(waitlist),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [services.tenantId],
    references: [tenants.id],
  }),
  serviceLocations: many(serviceLocations),
  staffServices: many(staffServices),
  appointments: many(appointments),
  waitlist: many(waitlist),
}));

export const serviceLocationsRelations = relations(serviceLocations, ({ one }) => ({
  service: one(services, {
    fields: [serviceLocations.serviceId],
    references: [services.id],
  }),
  location: one(locations, {
    fields: [serviceLocations.locationId],
    references: [locations.id],
  }),
}));

export const staffMembersRelations = relations(staffMembers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [staffMembers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [staffMembers.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [staffMembers.locationId],
    references: [locations.id],
  }),
  staffServices: many(staffServices),
  availabilityRules: many(availabilityRules),
  availabilityExceptions: many(availabilityExceptions),
  appointments: many(appointments),
}));

export const staffServicesRelations = relations(staffServices, ({ one }) => ({
  staff: one(staffMembers, {
    fields: [staffServices.staffId],
    references: [staffMembers.id],
  }),
  service: one(services, {
    fields: [staffServices.serviceId],
    references: [services.id],
  }),
}));

export const availabilityRulesRelations = relations(availabilityRules, ({ one }) => ({
  staff: one(staffMembers, {
    fields: [availabilityRules.staffId],
    references: [staffMembers.id],
  }),
  service: one(services, {
    fields: [availabilityRules.serviceId],
    references: [services.id],
  }),
}));

export const availabilityExceptionsRelations = relations(availabilityExceptions, ({ one }) => ({
  staff: one(staffMembers, {
    fields: [availabilityExceptions.staffId],
    references: [staffMembers.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  staff: one(staffMembers, {
    fields: [appointments.staffId],
    references: [staffMembers.id],
  }),
  location: one(locations, {
    fields: [appointments.locationId],
    references: [locations.id],
  }),
  parentAppointment: one(appointments, {
    fields: [appointments.parentAppointmentId],
    references: [appointments.id],
  }),
}));

export const waitlistRelations = relations(waitlist, ({ one }) => ({
  tenant: one(tenants, {
    fields: [waitlist.tenantId],
    references: [tenants.id],
  }),
  service: one(services, {
    fields: [waitlist.serviceId],
    references: [services.id],
  }),
  staff: one(staffMembers, {
    fields: [waitlist.staffId],
    references: [staffMembers.id],
  }),
  location: one(locations, {
    fields: [waitlist.locationId],
    references: [locations.id],
  }),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationTemplates.tenantId],
    references: [tenants.id],
  }),
}));

export const insertPipelineSchema = createInsertSchema(pipelines).pick({
  name: true,
  description: true,
}).partial({ description: true });

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).pick({
  pipelineId: true,
  name: true,
  order: true,
  color: true,
  isFixed: true,
}).partial({ color: true, isFixed: true });

export const insertLeadSchema = createInsertSchema(leads).pick({
  pipelineId: true,
  stageId: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  value: true,
  currency: true,
  probability: true,
  source: true,
  sourceId: true,
  assignedTo: true,
  expectedCloseDate: true,
  notes: true,
  tags: true,
}).extend({
  value: z.union([z.string(), z.number()]).optional().nullable(),
  expectedCloseDate: z.union([z.date(), z.string()]).optional().nullable(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
}).partial({ 
  email: true, 
  phone: true, 
  company: true, 
  value: true, 
  currency: true, 
  probability: true, 
  source: true, 
  sourceId: true, 
  assignedTo: true, 
  expectedCloseDate: true, 
  notes: true, 
  tags: true 
});

export const insertLeadActivitySchema = createInsertSchema(leadActivities).pick({
  leadId: true,
  userId: true,
  type: true,
  description: true,
  metadata: true,
}).partial({ userId: true, metadata: true });

// Calendar Insert Schemas
export const insertLocationSchema = createInsertSchema(locations).pick({
  name: true,
  address: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  timezone: true,
  phone: true,
  email: true,
  settings: true,
  isActive: true,
}).partial({ address: true, city: true, state: true, country: true, postalCode: true, phone: true, email: true, settings: true, isActive: true });

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  description: true,
  duration: true,
  price: true,
  currency: true,
  capacity: true,
  bufferTime: true,
  color: true,
  slotDuration: true,
  depositRequired: true,
  allowRecurring: true,
  customFields: true,
  isActive: true,
}).partial({ description: true, price: true, currency: true, capacity: true, bufferTime: true, color: true, slotDuration: true, depositRequired: true, allowRecurring: true, customFields: true, isActive: true });

export const insertServiceLocationSchema = createInsertSchema(serviceLocations).pick({
  serviceId: true,
  locationId: true,
});

export const insertStaffMemberSchema = createInsertSchema(staffMembers).pick({
  userId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  color: true,
  locationId: true,
  isActive: true,
}).partial({ userId: true, email: true, phone: true, role: true, color: true, locationId: true, isActive: true });

export const insertStaffServiceSchema = createInsertSchema(staffServices).pick({
  staffId: true,
  serviceId: true,
});

export const insertAvailabilityRuleSchema = createInsertSchema(availabilityRules).pick({
  staffId: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  serviceId: true,
}).partial({ serviceId: true });

export const insertAvailabilityExceptionSchema = createInsertSchema(availabilityExceptions).pick({
  staffId: true,
  date: true,
  isAvailable: true,
  startTime: true,
  endTime: true,
  reason: true,
}).partial({ isAvailable: true, startTime: true, endTime: true, reason: true });

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  serviceId: true,
  staffId: true,
  locationId: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  customFields: true,
  startTime: true,
  endTime: true,
  timezone: true,
  status: true,
  isRecurring: true,
  recurrenceRule: true,
  parentAppointmentId: true,
  notes: true,
  cancelReason: true,
  videoMeetingUrl: true,
}).partial({ customerEmail: true, customFields: true, status: true, isRecurring: true, recurrenceRule: true, parentAppointmentId: true, notes: true, cancelReason: true, videoMeetingUrl: true });

export const insertWaitlistSchema = createInsertSchema(waitlist).pick({
  serviceId: true,
  staffId: true,
  locationId: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  preferredDate: true,
  preferredTimeSlot: true,
  status: true,
}).partial({ staffId: true, customerEmail: true, preferredDate: true, preferredTimeSlot: true, status: true });

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).pick({
  type: true,
  channel: true,
  subject: true,
  template: true,
  isActive: true,
}).partial({ subject: true, isActive: true });

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
export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceLocation = typeof serviceLocations.$inferSelect;
export type InsertServiceLocation = z.infer<typeof insertServiceLocationSchema>;
export type StaffMember = typeof staffMembers.$inferSelect;
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffService = typeof staffServices.$inferSelect;
export type InsertStaffService = z.infer<typeof insertStaffServiceSchema>;
export type AvailabilityRule = typeof availabilityRules.$inferSelect;
export type InsertAvailabilityRule = z.infer<typeof insertAvailabilityRuleSchema>;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;
export type InsertAvailabilityException = z.infer<typeof insertAvailabilityExceptionSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
