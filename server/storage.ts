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
  type InsertRecording
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, count, sum, sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: any;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
}

export const storage = new DatabaseStorage();
