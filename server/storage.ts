import { 
  users, 
  tenants, 
  extensions, 
  bankTransfers, 
  callRecords, 
  aiMetrics,
  type User, 
  type InsertUser, 
  type Tenant, 
  type InsertTenant, 
  type BankTransfer, 
  type InsertBankTransfer,
  type Extension,
  type InsertExtension,
  type CallRecord,
  type AiMetric
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, count, sum } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: any;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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

  async createExtension(extension: InsertExtension & { tenantId: string }): Promise<Extension> {
    const [newExtension] = await db
      .insert(extensions)
      .values(extension)
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
      .where(and(eq(extensions.tenantId, tenantId), eq(extensions.status, "active")));

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
}

export const storage = new DatabaseStorage();
