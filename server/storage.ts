import { 
  users, 
  tenants, 
  extensions, 
  bankTransfers, 
  callRecords, 
  aiMetrics,
  ivrMenus,
  queues,
  recordings,
  conversations,
  messages,
  mentions,
  views,
  type User, 
  type InsertUser, 
  type Tenant, 
  type InsertTenant, 
  type BankTransfer, 
  type InsertBankTransfer,
  type Extension,
  type InsertExtension,
  type CallRecord,
  type AiMetric,
  type IvrMenu,
  type InsertIvrMenu,
  type Queue,
  type InsertQueue,
  type Recording,
  type InsertRecording,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Mention,
  type InsertMention,
  type View,
  type InsertView
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, count, sum, sql, isNull } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: any;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getTenantUsers(tenantId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  updateUserStripeInfo(id: string, customerId: string, subscriptionId: string): Promise<User>;
  
  // Tenant methods
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenantStatus(id: string, status: "active" | "inactive" | "suspended"): Promise<Tenant>;
  
  // Extension methods
  getExtensionsByTenant(tenantId: string): Promise<Extension[]>;
  createExtension(extension: InsertExtension & { tenantId: string }): Promise<Extension>;
  
  // Bank transfer methods
  getBankTransfersByTenant(tenantId: string): Promise<BankTransfer[]>;
  getAllPendingTransfers(): Promise<BankTransfer[]>;
  createBankTransfer(transfer: InsertBankTransfer & { userId: string; tenantId: string }): Promise<BankTransfer>;
  updateTransferStatus(id: string, status: "approved" | "rejected", adminComments?: string, processedBy?: string): Promise<BankTransfer>;
  
  // Analytics methods
  getTenantStats(tenantId: string): Promise<{
    activeCalls: number;
    aiMinutes: number;
    extensions: number;
    monthlyCost: number;
  }>;
  
  getConsumptionData(tenantId: string, from: Date, to: Date): Promise<{
    voiceMinutes: CallRecord[];
    aiMinutes: AiMetric[];
  }>;

  // Telephony methods
  getExtensions(tenantId: string, status?: string, q?: string, page?: number, pageSize?: number): Promise<{
    data: Extension[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  updateExtension(id: string, data: Partial<InsertExtension>): Promise<Extension>;
  deleteExtension(id: string): Promise<void>;
  resetExtensionPin(id: string): Promise<Extension>;
  
  getIvrs(tenantId: string): Promise<IvrMenu[]>;
  createIvr(ivr: InsertIvrMenu & { tenantId: string }): Promise<IvrMenu>;
  updateIvr(id: string, data: Partial<InsertIvrMenu>): Promise<IvrMenu>;
  
  getQueues(tenantId: string): Promise<Queue[]>;
  createQueue(queue: InsertQueue & { tenantId: string }): Promise<Queue>;
  updateQueue(id: string, data: Partial<InsertQueue>): Promise<Queue>;
  
  getRecordings(tenantId: string, from?: Date, to?: Date, page?: number, pageSize?: number): Promise<{
    data: Recording[];
    total: number;
    page: number;
    pageSize: number;
  }>;

  // Bootstrap methods
  bootstrapUserTenant(userId: string, userEmail: string): Promise<{ user: User; tenant: Tenant }>;
  seedDemoData(tenantId: string): Promise<void>;
  resetTenantData(tenantId: string): Promise<void>;
  
  // Conversation methods (softphone)
  createConversation(conversation: InsertConversation & { tenantId: string }): Promise<Conversation>;
  endConversation(callId: string): Promise<void>;
  updateConversationNotes(callId: string, notes: string): Promise<Conversation>;
  getConversationWithMessages(id: string, tenantId: string): Promise<(Conversation & { messages: Message[] }) | undefined>;
  getConversations(tenantId: string, page?: number, pageSize?: number, type?: string, search?: string): Promise<{
    data: Conversation[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  
  // Message methods
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message>;
  
  // Omnichannel conversation methods
  updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation>;
  assignConversation(id: string, assigneeId?: string): Promise<Conversation>;
  closeConversation(id: string): Promise<Conversation>;
  reopenConversation(id: string): Promise<Conversation>;
  addConversationTags(id: string, tags: string[]): Promise<Conversation>;
  removeConversationTag(id: string, tag: string): Promise<Conversation>;
  
  // Views methods (saved filters)
  getViews(tenantId: string, userId?: string): Promise<View[]>;
  createView(view: InsertView & { tenantId: string }): Promise<View>;
  updateView(id: string, data: Partial<InsertView>): Promise<View>;
  deleteView(id: string): Promise<void>;
  
  // Mentions methods
  getMentionsByMessage(messageId: string): Promise<Mention[]>;
  getMentionsByUser(userId: string, tenantId: string): Promise<Mention[]>;
  createMention(mention: InsertMention): Promise<Mention>;
  deleteMention(id: string): Promise<void>;
  
  // Conversation count for badge
  getConversationCount(tenantId: string, hours?: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, customerId: string, subscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId, 
        stripeSubscriptionId: subscriptionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getTenantUsers(tenantId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(users.firstName, users.lastName, users.username);
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values(insertTenant)
      .returning();
    return tenant;
  }

  async updateTenantStatus(id: string, status: "active" | "inactive" | "suspended"): Promise<Tenant> {
    const [tenant] = await db
      .update(tenants)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  async getExtensionsByTenant(tenantId: string): Promise<Extension[]> {
    return await db.select().from(extensions).where(eq(extensions.tenantId, tenantId));
  }

  async createExtension(extension: InsertExtension & { tenantId: string; sipPassword?: string }): Promise<Extension> {
    // Ensure sipPassword is provided or generate one
    const extensionData = {
      ...extension,
      sipPassword: extension.sipPassword || Math.random().toString(36).substr(2, 12),
    };
    const [newExtension] = await db
      .insert(extensions)
      .values(extensionData)
      .returning();
    return newExtension;
  }

  async getBankTransfersByTenant(tenantId: string): Promise<BankTransfer[]> {
    return await db
      .select()
      .from(bankTransfers)
      .where(eq(bankTransfers.tenantId, tenantId))
      .orderBy(desc(bankTransfers.createdAt));
  }

  async getAllPendingTransfers(): Promise<BankTransfer[]> {
    return await db
      .select()
      .from(bankTransfers)
      .where(eq(bankTransfers.status, "pending"))
      .orderBy(desc(bankTransfers.createdAt));
  }

  async createBankTransfer(transfer: InsertBankTransfer & { userId: string; tenantId: string }): Promise<BankTransfer> {
    const [newTransfer] = await db
      .insert(bankTransfers)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  async updateTransferStatus(
    id: string, 
    status: "approved" | "rejected", 
    adminComments?: string, 
    processedBy?: string
  ): Promise<BankTransfer> {
    const [transfer] = await db
      .update(bankTransfers)
      .set({ 
        status, 
        adminComments, 
        processedBy, 
        processedAt: new Date() 
      })
      .where(eq(bankTransfers.id, id))
      .returning();
    return transfer;
  }

  async getTenantStats(tenantId: string): Promise<{
    activeCalls: number;
    aiMinutes: number;
    extensions: number;
    monthlyCost: number;
  }> {
    // Get active extensions count
    const [extensionCount] = await db
      .select({ count: count() })
      .from(extensions)
      .where(and(eq(extensions.tenantId, tenantId), eq(extensions.status, "ACTIVE")));

    // Get today's AI metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [aiData] = await db
      .select({ 
        totalSeconds: sum(aiMetrics.totalSeconds),
        totalCalls: sum(aiMetrics.totalCalls) 
      })
      .from(aiMetrics)
      .where(and(
        eq(aiMetrics.tenantId, tenantId),
        gte(aiMetrics.date, today)
      ));

    // Mock active calls (would come from real-time PBX data)
    const activeCalls = Math.floor(Math.random() * 50);
    
    // Mock monthly cost calculation
    const monthlyCost = 25.00; // Based on Growth plan

    return {
      activeCalls,
      aiMinutes: Math.floor((Number(aiData.totalSeconds) || 0) / 60),
      extensions: extensionCount.count,
      monthlyCost,
    };
  }

  async getConsumptionData(tenantId: string, from: Date, to: Date): Promise<{
    voiceMinutes: CallRecord[];
    aiMinutes: AiMetric[];
  }> {
    const voiceMinutes = await db
      .select()
      .from(callRecords)
      .where(and(
        eq(callRecords.tenantId, tenantId),
        gte(callRecords.createdAt, from),
        lte(callRecords.createdAt, to)
      ))
      .orderBy(callRecords.createdAt);

    const aiMinutes = await db
      .select()
      .from(aiMetrics)
      .where(and(
        eq(aiMetrics.tenantId, tenantId),
        gte(aiMetrics.date, from),
        lte(aiMetrics.date, to)
      ))
      .orderBy(aiMetrics.date);

    return { voiceMinutes, aiMinutes };
  }

  // Telephony methods implementation
  async getExtensions(tenantId: string, status?: string, q?: string, page: number = 1, pageSize: number = 10): Promise<{
    data: Extension[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    let query = db.select().from(extensions).where(eq(extensions.tenantId, tenantId));
    
    const conditions = [eq(extensions.tenantId, tenantId)];
    
    if (status) {
      conditions.push(eq(extensions.status, status as "ACTIVE" | "INACTIVE"));
    }
    
    if (q) {
      // Search in number or userName
      conditions.push(
        sql`(${extensions.number} ILIKE ${`%${q}%`} OR ${extensions.userName} ILIKE ${`%${q}%`})`
      );
    }
    
    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    const [totalCount] = await db
      .select({ count: count() })
      .from(extensions)
      .where(whereCondition);
    
    const data = await db
      .select()
      .from(extensions)
      .where(whereCondition)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(extensions.createdAt);
    
    return {
      data,
      total: totalCount.count,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount.count / pageSize),
    };
  }

  async updateExtension(id: string, data: Partial<InsertExtension>): Promise<Extension> {
    const [updated] = await db
      .update(extensions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(extensions.id, id))
      .returning();
    return updated;
  }

  async deleteExtension(id: string): Promise<void> {
    await db.delete(extensions).where(eq(extensions.id, id));
  }

  async resetExtensionPin(id: string): Promise<Extension> {
    const newPassword = Math.random().toString(36).substr(2, 12);
    const [updated] = await db
      .update(extensions)
      .set({ sipPassword: newPassword, updatedAt: new Date() })
      .where(eq(extensions.id, id))
      .returning();
    return updated;
  }

  async getIvrs(tenantId: string): Promise<IvrMenu[]> {
    return await db
      .select()
      .from(ivrMenus)
      .where(eq(ivrMenus.tenantId, tenantId))
      .orderBy(ivrMenus.createdAt);
  }

  async createIvr(ivr: InsertIvrMenu & { tenantId: string }): Promise<IvrMenu> {
    const [created] = await db.insert(ivrMenus).values(ivr).returning();
    return created;
  }

  async updateIvr(id: string, data: Partial<InsertIvrMenu>): Promise<IvrMenu> {
    const [updated] = await db
      .update(ivrMenus)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ivrMenus.id, id))
      .returning();
    return updated;
  }

  async getQueues(tenantId: string): Promise<Queue[]> {
    return await db
      .select()
      .from(queues)
      .where(eq(queues.tenantId, tenantId))
      .orderBy(queues.createdAt);
  }

  async createQueue(queue: InsertQueue & { tenantId: string }): Promise<Queue> {
    const [created] = await db.insert(queues).values(queue).returning();
    return created;
  }

  async updateQueue(id: string, data: Partial<InsertQueue>): Promise<Queue> {
    const [updated] = await db
      .update(queues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(queues.id, id))
      .returning();
    return updated;
  }

  async getRecordings(tenantId: string, from?: Date, to?: Date, page: number = 1, pageSize: number = 10): Promise<{
    data: Recording[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const conditions = [eq(recordings.tenantId, tenantId)];
    
    if (from) {
      conditions.push(gte(recordings.startedAt, from));
    }
    
    if (to) {
      conditions.push(lte(recordings.startedAt, to));
    }
    
    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    const [totalCount] = await db
      .select({ count: count() })
      .from(recordings)
      .where(whereCondition);
    
    const data = await db
      .select()
      .from(recordings)
      .where(whereCondition)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(recordings.startedAt));
    
    return {
      data,
      total: totalCount.count,
      page,
      pageSize,
    };
  }

  // Bootstrap & Seed Methods
  async bootstrapUserTenant(userId: string, userEmail: string): Promise<{ user: User; tenant: Tenant }> {
    // Check if user already has a tenant
    const currentUser = await this.getUser(userId);
    if (currentUser?.tenantId) {
      const tenant = await this.getTenant(currentUser.tenantId);
      if (tenant) {
        return { user: currentUser, tenant };
      }
    }

    // Create tenant with user-based naming
    const userName = userEmail.split('@')[0];
    const tenantData = {
      name: `${userName}-tenant`,
      industry: "Virtual PBX Demo",
      employeeCount: "10",
      estimatedExtensions: 8,
      plan: "starter" as const,
      status: "active" as const
    };

    const tenant = await this.createTenant(tenantData);
    
    // Update user with tenant and owner role
    const user = await db
      .update(users)
      .set({ 
        tenantId: tenant.id,
        role: "owner",
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    const updatedUser = user[0];

    console.log(`✅ Bootstrap completed for user: ${updatedUser.id}/${updatedUser.email}/${updatedUser.role}/${updatedUser.tenantId}`);
    
    // Seed demo data for the new tenant
    await this.seedDemoData(tenant.id);
    
    return { user: updatedUser, tenant };
  }

  async seedDemoData(tenantId: string): Promise<void> {
    console.log(`🌱 Seeding demo data for tenant: ${tenantId}`);

    // 1. Create 8 Extensions (4 active, 4 inactive)
    const extensionsData = [
      { number: "1001", userName: "Recepción", status: "ACTIVE" as const },
      { number: "1002", userName: "Ventas - Juan", status: "ACTIVE" as const },
      { number: "1003", userName: "Soporte - María", status: "ACTIVE" as const },
      { number: "1004", userName: "Gerencia", status: "ACTIVE" as const },
      { number: "1005", userName: "Ext. Libre 1", status: "INACTIVE" as const },
      { number: "1006", userName: "Ext. Libre 2", status: "INACTIVE" as const },
      { number: "1007", userName: "Ext. Libre 3", status: "INACTIVE" as const },
      { number: "1008", userName: "Ext. Libre 4", status: "INACTIVE" as const }
    ];

    for (const extData of extensionsData) {
      await this.createExtension({
        ...extData,
        tenantId,
        sipPassword: Math.random().toString(36).substr(2, 12)
      });
    }

    // 2. Create 1 IVR Menu
    await this.createIvr({
      name: "Principal",
      options: [
        { key: "1", action: "queue", target: "ventas", description: "Queue Ventas" },
        { key: "2", action: "queue", target: "soporte", description: "Queue Soporte" },
        { key: "default", action: "ai_agent", target: "demo", description: "Agente IA demo" }
      ],
      tenantId
    });

    // 3. Create 2 Queues  
    await this.createQueue({
      name: "Ventas",
      tenantId
    });

    await this.createQueue({
      name: "Soporte", 
      tenantId
    });

    // 4. Create 3 Demo Recordings
    const recordingsData = [
      {
        callId: "demo-call-001",
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        durationSec: 145,
        sizeBytes: 2345678,
        url: "/public/samples/demo-call.mp3"
      },
      {
        callId: "demo-call-002", 
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        durationSec: 230,
        sizeBytes: 3456789,
        url: "/public/samples/demo-call.mp3"
      },
      {
        callId: "demo-call-003",
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        durationSec: 89,
        sizeBytes: 1234567,
        url: "/public/samples/demo-call.mp3"
      }
    ];

    for (const recData of recordingsData) {
      await db.insert(recordings).values({
        ...recData,
        tenantId
      });
    }

    console.log(`✅ Demo data seeded successfully for tenant: ${tenantId}`);
  }

  async resetTenantData(tenantId: string): Promise<void> {
    console.log(`🗑️  Resetting data for tenant: ${tenantId}`);
    
    // Delete existing data
    await db.delete(recordings).where(eq(recordings.tenantId, tenantId));
    await db.delete(queues).where(eq(queues.tenantId, tenantId));
    await db.delete(ivrMenus).where(eq(ivrMenus.tenantId, tenantId));
    await db.delete(extensions).where(eq(extensions.tenantId, tenantId));
    
    // Reseed demo data
    await this.seedDemoData(tenantId);
    
    console.log(`✅ Tenant data reset and reseeded: ${tenantId}`);
  }

  // Conversation methods (softphone implementation)
  async createConversation(conversation: InsertConversation & { tenantId: string }): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async endConversation(callId: string): Promise<void> {
    const endedAt = new Date();
    await db
      .update(conversations)
      .set({ 
        status: 'ended', 
        endedAt,
        updatedAt: endedAt
      })
      .where(eq(conversations.callId, callId));
  }

  // End conversation by conversationId (for softphone controls)
  async endConversationById(conversationId: string): Promise<void> {
    const endedAt = new Date();
    await db
      .update(conversations)
      .set({ 
        status: 'ended', 
        endedAt,
        updatedAt: endedAt
      })
      .where(eq(conversations.id, conversationId));
  }

  async updateConversationNotes(callId: string, notes: string): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        notes,
        updatedAt: new Date()
      })
      .where(eq(conversations.callId, callId))
      .returning();
    
    return updatedConversation;
  }

  async getConversationWithMessages(id: string, tenantId: string): Promise<(Conversation & { messages: Message[] }) | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.tenantId, tenantId)));

    if (!conversation) return undefined;

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.timestamp);

    return {
      ...conversation,
      messages: conversationMessages
    };
  }

  // Get active conversation for softphone - STRICT FILTERING
  async getActiveConversation(tenantId: string, userId: string): Promise<Conversation | undefined> {
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.tenantId, tenantId),
          eq(conversations.userId, userId),
          // ONLY active calls: ringing or answered
          sql`${conversations.status} IN ('ringing', 'answered')`,
          // NOT ended (endedAt IS NULL)
          isNull(conversations.endedAt),
          // Freshness guard: only recently updated calls (30s)
          gte(conversations.updatedAt, thirtySecsAgo)
        )
      )
      .orderBy(desc(conversations.createdAt));

    console.log(`🔍 DB Query: Active conversation filter - status IN ('ringing','answered'), endedAt IS NULL, updatedAt > ${thirtySecsAgo.toISOString()}`);
    return conversation;
  }

  // Update conversation status - ALWAYS update updatedAt
  async updateConversationStatus(conversationId: string, status: "active" | "ended" | "ringing" | "answered"): Promise<void> {
    const now = new Date();
    await db
      .update(conversations)
      .set({ 
        status,
        updatedAt: now
      })
      .where(eq(conversations.id, conversationId));
    
    console.log(`📝 DB: Conversation ${conversationId} status updated to '${status}' at ${now.toISOString()}`);
  }

  async getConversations(tenantId: string, page = 1, pageSize = 10, type?: string, search?: string): Promise<{
    data: Conversation[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const whereConditions = [eq(conversations.tenantId, tenantId)];
    
    // Add type filter if specified (for now, all conversations are call type)
    if (type === 'call') {
      // All conversations in our system are calls, so no additional filter needed
      // This parameter is ready for future expansion (e.g., chat, email)
    }

    // Add search filter if specified (search by phone number or call ID)
    if (search?.trim()) {
      whereConditions.push(
        // Use SQL ILIKE for case-insensitive search on phone number OR call ID
        sql`(${conversations.phoneNumber} ILIKE ${'%' + search.trim() + '%'} OR ${conversations.callId} ILIKE ${'%' + search.trim() + '%'})`
      );
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(conversations)
      .where(and(...whereConditions));

    const conversationData = await db
      .select()
      .from(conversations)
      .where(and(...whereConditions))
      .orderBy(desc(conversations.createdAt))
      .limit(pageSize)
      .offset(offset);

    const total = totalResult.count;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: conversationData,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Omnichannel conversation methods implementation
  async updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message> {
    const [updatedMessage] = await db
      .update(messages)
      .set({ ...data, createdAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage;
  }

  async updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  async assignConversation(id: string, assigneeId?: string): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        assigneeId,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  async closeConversation(id: string): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        status: "closed",
        endedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  async reopenConversation(id: string): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        status: "open",
        endedAt: null,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  async addConversationTags(id: string, tags: string[]): Promise<Conversation> {
    // Get current conversation to merge tags
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const currentTags = conversation.tags || [];
    const newTags = Array.from(new Set([...currentTags, ...tags]));

    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        tags: newTags,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  async removeConversationTag(id: string, tag: string): Promise<Conversation> {
    // Get current conversation to filter tags
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const currentTags = conversation.tags || [];
    const newTags = currentTags.filter(t => t !== tag);

    const [updatedConversation] = await db
      .update(conversations)
      .set({ 
        tags: newTags,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  // Views methods implementation
  async getViews(tenantId: string, userId?: string): Promise<View[]> {
    const whereConditions = [eq(views.tenantId, tenantId)];
    
    if (userId) {
      whereConditions.push(
        // Get views owned by user OR shared views
        sql`(${views.ownerId} = ${userId} OR ${views.shared} = true)`
      );
    }

    const viewsData = await db
      .select()
      .from(views)
      .where(and(...whereConditions))
      .orderBy(views.name);

    return viewsData;
  }

  async createView(view: InsertView & { tenantId: string }): Promise<View> {
    const [newView] = await db
      .insert(views)
      .values(view)
      .returning();
    return newView;
  }

  async updateView(id: string, data: Partial<InsertView>): Promise<View> {
    const [updatedView] = await db
      .update(views)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(views.id, id))
      .returning();
    return updatedView;
  }

  async deleteView(id: string): Promise<void> {
    await db
      .delete(views)
      .where(eq(views.id, id));
  }

  // Mentions methods implementation
  async getMentionsByMessage(messageId: string): Promise<Mention[]> {
    const mentionsData = await db
      .select()
      .from(mentions)
      .where(eq(mentions.messageId, messageId))
      .orderBy(mentions.createdAt);

    return mentionsData;
  }

  async getMentionsByUser(userId: string, tenantId: string): Promise<Mention[]> {
    const mentionsData = await db
      .select()
      .from(mentions)
      .innerJoin(messages, eq(mentions.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(mentions.userId, userId),
        eq(conversations.tenantId, tenantId)
      ))
      .orderBy(desc(mentions.createdAt));

    return mentionsData.map(row => row.mentions);
  }

  async createMention(mention: InsertMention): Promise<Mention> {
    const [newMention] = await db
      .insert(mentions)
      .values(mention)
      .returning();
    return newMention;
  }

  async deleteMention(id: string): Promise<void> {
    await db
      .delete(mentions)
      .where(eq(mentions.id, id));
  }

  async getConversationCount(tenantId: string, hours = 24): Promise<number> {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    const [result] = await db
      .select({ count: count() })
      .from(conversations)
      .where(and(
        eq(conversations.tenantId, tenantId),
        gte(conversations.createdAt, since)
      ));

    return result.count;
  }
}

export const storage = new DatabaseStorage();
