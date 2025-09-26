import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { 
  insertTenantSchema, 
  insertBankTransferSchema, 
  insertExtensionSchema,
  insertIvrMenuSchema,
  insertQueueSchema,
  insertRecordingSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";

// Stripe setup with config loader
import config from './config';

const hasValidStripeKey = config.stripe.secretKey !== 'sk_test_development_key';
let stripe: Stripe | null = null;
if (hasValidStripeKey) {
  stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

// Multer setup for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server and setup WebSocket support
  const server = createServer(app);
  
  // Mock WebSocket handler for softphone (dev implementation)
  const wsHandler = {
    broadcast: (channel: string, data: any) => {
      console.log(`📡 WebSocket broadcast [${channel}]:`, data);
      // TODO: Implement real WebSocket broadcasting when WebSocket server is added
    }
  };
  
  // Attach WebSocket handler to server
  (server as any).wsHandler = wsHandler;

  // Setup authentication
  setupAuth(app);

  // Bootstrap middleware - automatically create tenant for users without one
  app.use("/api", async (req, res, next) => {
    // Skip bootstrap for public routes
    const publicRoutes = ["/api/login", "/api/register", "/api/system/mode", "/api/logout"];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    // Skip if not authenticated
    if (!req.isAuthenticated() || !req.user) {
      return next();
    }

    // Check if user needs tenant bootstrap
    if (!req.user.tenantId) {
      try {
        console.log(`🚀 Bootstrapping tenant for user: ${req.user.email}`);
        const { user, tenant } = await storage.bootstrapUserTenant(req.user.id, req.user.email);
        
        // Update req.user with new tenant info
        req.user = user;
        
        console.log(`✅ Tenant bootstrap completed: ${tenant.id} for ${user.email}`);
      } catch (error) {
        console.error("❌ Bootstrap failed:", error);
        return res.status(500).json({ 
          code: "BOOTSTRAP_FAILED", 
          message: "Failed to create tenant workspace" 
        });
      }
    }

    next();
  });

  // WhoAmI endpoint - returns current user session info
  app.get("/api/whoami", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { id, email, role, tenantId } = req.user;
      res.json({ id, email, role, tenantId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dev seed reset endpoint (owner only)
  app.post("/api/dev/seed/reset", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      if (req.user.role !== "owner") {
        return res.status(403).json({ code: "FORBIDDEN", message: "Owner role required" });
      }

      await storage.resetTenantData(req.user.tenantId);
      
      res.json({ 
        success: true, 
        message: `Tenant data reset and reseeded for: ${req.user.tenantId}` 
      });
    } catch (error: any) {
      console.error("❌ Seed reset failed:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Softphone API endpoints (mock)
  app.post("/api/softphone/calls/dial", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { to } = req.body;
      if (!to) {
        return res.status(400).json({ message: "Phone number required" });
      }

      // Create new conversation
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const conversation = await storage.createConversation({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        callId,
        phoneNumber: to,
        status: "ringing"
      });

      // Emit WebSocket event for ringing
      if (server.wsHandler) {
        server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
          type: 'call_status',
          conversationId: conversation.id,
          callId,
          status: 'ringing',
          phoneNumber: to
        });
      }

      // Mock call progression after 2 seconds
      setTimeout(async () => {
        try {
          // Update conversation status in database
          await storage.updateConversationStatus(conversation.id, 'answered');
          
          // Broadcast WebSocket event
          if (server.wsHandler) {
            server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
              type: 'call_status',
              conversationId: conversation.id,
              callId,
              status: 'answered',
              phoneNumber: to
            });
          }
        } catch (error) {
          console.error('❌ Error updating call status:', error);
        }
      }, 2000);

      res.json({ callId, status: "ringing", conversationId: conversation.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get current call status
  app.get("/api/softphone/status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get active conversation for this user
      const activeConversation = await storage.getActiveConversation(req.user.tenantId, req.user.id);
      
      console.log(`🔍 Status: Active conversation check:`, activeConversation ? `${activeConversation.id} (${activeConversation.status})` : 'none');
      
      if (!activeConversation) {
        return res.json(null); // No active call
      }

      // Return call status data
      res.json({
        number: activeConversation.phoneNumber,
        status: activeConversation.status,
        duration: Math.floor((Date.now() - new Date(activeConversation.createdAt).getTime()) / 1000),
        conversationId: activeConversation.id
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/softphone/calls/:conversationId/mute", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { conversationId } = req.params;
      const { muted } = req.body;

      // Emit WebSocket event
      if (server.wsHandler) {
        server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
          type: 'call_mute',
          conversationId,
          muted
        });
      }

      res.json({ success: true, conversationId, muted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/softphone/calls/:conversationId/hold", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { conversationId } = req.params;
      const { held } = req.body;

      // Emit WebSocket event
      if (server.wsHandler) {
        server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
          type: 'call_hold',
          conversationId,
          held
        });
      }

      res.json({ success: true, conversationId, held });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/softphone/calls/:conversationId/hangup", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { conversationId } = req.params;
      
      console.log(`🔧 Hangup: Ending conversation ${conversationId}`);
      
      // Update conversation status
      await storage.endConversationById(conversationId);
      
      console.log(`✅ Hangup: Conversation ${conversationId} ended`);

      // Emit WebSocket event
      if (server.wsHandler) {
        server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
          type: 'call_status',
          conversationId,
          status: 'ended'
        });
      }

      res.json({ success: true, conversationId, status: "ended" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/softphone/calls/:conversationId/transfer", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { conversationId } = req.params;
      const { to } = req.body;

      if (!to) {
        return res.status(400).json({ message: "Transfer target required" });
      }

      // Emit WebSocket event
      if (server.wsHandler) {
        server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
          type: 'call_transfer',
          conversationId,
          transferTo: to
        });
      }

      res.json({ success: true, conversationId, transferTo: to });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/calls/:callId/notes", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { callId } = req.params;
      const { notes } = req.body;

      await storage.updateConversationNotes(callId, notes);

      res.json({ success: true, callId, notes });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get conversation details
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { id } = req.params;
      const conversation = await storage.getConversationWithMessages(id, req.user.tenantId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // List conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { page = 1, pageSize = 10 } = req.query;
      const conversations = await storage.getConversations(
        req.user.tenantId, 
        parseInt(page as string), 
        parseInt(pageSize as string)
      );

      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PayPal routes
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      if (!stripe) {
        return res.json({ 
          clientSecret: "pi_mock_development_secret",
          mock: true,
          message: "Running in development mode - Stripe not configured"
        });
      }

      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user.id,
          tenantId: req.user.tenantId || "",
        },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Subscription route
  app.post('/api/create-subscription', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    let user = req.user;
    const { plan } = req.body; // starter or growth

    if (user.stripeSubscriptionId) {
      if (!stripe) {
        return res.json({
          subscriptionId: "sub_mock_development",
          clientSecret: "pi_mock_development_secret",
          mock: true,
          message: "Running in development mode - Stripe not configured"
        });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });

      return;
    }

    try {
      if (!stripe) {
        return res.json({
          subscriptionId: "sub_mock_development",
          clientSecret: "pi_mock_development_secret",
          mock: true,
          message: "Running in development mode - Stripe not configured"
        });
      }

      let customer;
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id,
            tenantId: user.tenantId || "",
          },
        });
      }

      // Price IDs for plans - use environment variables or return mock data in test mode
      const priceIds = {
        starter: process.env.STRIPE_STARTER_PRICE_ID,
        growth: process.env.STRIPE_GROWTH_PRICE_ID,
      };

      // If no price IDs configured, return mock response instead of trying to create subscription
      if (!priceIds[plan as keyof typeof priceIds]) {
        return res.json({
          subscriptionId: "sub_mock_development",
          clientSecret: "pi_mock_development_secret",
          mock: true,
          message: `Missing Stripe price ID for ${plan} plan. Configure STRIPE_${plan.toUpperCase()}_PRICE_ID environment variable.`
        });
      }

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceIds[plan as keyof typeof priceIds] || priceIds.growth,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);

      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      return res.status(400).send({ error: { message: error.message } });
    }
  });

  // Onboarding completion
  app.post("/api/complete-onboarding", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      const { tenantData, selectedPlan } = req.body;
      
      // Validate tenant data
      const validatedTenant = insertTenantSchema.parse({
        ...tenantData,
        plan: selectedPlan,
      });

      // Create tenant
      const tenant = await storage.createTenant(validatedTenant);
      
      // TODO: Update user with tenant ID - would need to add this method to storage
      
      res.json({ success: true, tenant });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Bank transfer routes
  app.post("/api/bank-transfers", upload.single('receipt'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      const validatedTransfer = insertBankTransferSchema.parse({
        referenceNumber: req.body.referenceNumber,
        bank: req.body.bank,
        amount: req.body.amount,
        transferDate: new Date(req.body.transferDate + 'T' + req.body.transferTime),
        transferTime: req.body.transferTime,
        purpose: req.body.purpose,
        comments: req.body.comments,
        receiptUrl: (req as any).file?.path,
      });
      
      const transferWithIds = {
        ...validatedTransfer,
        userId: req.user.id,
        tenantId: req.user.tenantId || "",
      };
      
      const transfer = await storage.createBankTransfer(transferWithIds);
      
      res.json(transfer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/bank-transfers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      if (req.user.role === 'admin' || req.user.role === 'owner') {
        const transfers = await storage.getAllPendingTransfers();
        res.json(transfers);
      } else {
        const transfers = await storage.getBankTransfersByTenant(req.user.tenantId!);
        res.json(transfers);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bank-transfers/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
        return res.sendStatus(403);
      }

      const { id } = req.params;
      const { status, adminComments } = req.body;
      
      const transfer = await storage.updateTransferStatus(id, status, adminComments, req.user.id);
      
      // If approved, activate tenant or credit balance
      if (status === 'approved') {
        // TODO: Implement tenant activation logic
        await storage.updateTenantStatus(transfer.tenantId, 'active');
      }
      
      res.json(transfer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // System mode information endpoint (no auth required for banner display)
  app.get("/api/system/mode", (req, res) => {
    res.json({
      stripeMode: config.stripe.mode,
      paypalMode: config.paypal.mode,
      isTestMode: config.isTestMode,
      environment: config.isDevelopment ? 'development' : 'production',
      webhooks: {
        stripe: config.webhooks.stripeEndpoint,
        paypal: config.webhooks.paypalEndpoint,
      }
    });
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const stats = await storage.getTenantStats(req.user.tenantId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Consumption data
  app.get("/api/dashboard/consumption", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const { from, to } = req.query;
      
      // Provide default date range if not specified (last 30 days)
      const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date();
      
      // Validate dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const data = await storage.getConsumptionData(req.user.tenantId, fromDate, toDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PBX Provisioning endpoints (mock)
  app.post("/api/provision/tenant", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      // Mock PBX tenant provisioning
      const tenantConfig = {
        tenantId: req.user.tenantId,
        pbxId: `pbx_${Math.random().toString(36).substr(2, 9)}`,
        sipDomain: `${req.user.tenantId}.gueswi.com`,
        status: 'provisioned',
      };

      // TODO: Integrate with real PBX provisioning API
      res.json(tenantConfig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/provision/extension", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const validatedExtension = insertExtensionSchema.parse({
        number: req.body.number,
        userName: req.body.userName,
        userId: req.body.userId,
        status: req.body.status,
      });
      
      const extensionWithTenant = {
        ...validatedExtension,
        tenantId: req.user.tenantId || "",
        sipPassword: Math.random().toString(36).substr(2, 12),
      };
      
      const extension = await storage.createExtension(extensionWithTenant);

      // Mock SIP account creation
      const sipConfig = {
        extension: extension.number,
        sipUsername: extension.number,
        sipPassword: Math.random().toString(36).substr(2, 12),
        sipServer: `${req.user.tenantId}.gueswi.com`,
      };

      res.json({ extension, sipConfig });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/provision/ivr", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      // Mock IVR provisioning
      const ivrConfig = {
        ivrId: `ivr_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: req.user.tenantId,
        menu: req.body.menu || {},
        status: 'active',
      };

      res.json(ivrConfig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI metrics endpoints
  app.get("/api/ai/metrics", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const { from, to } = req.query;
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);

      // Mock AI metrics data
      const metrics = {
        totalSeconds: Math.floor(Math.random() * 10000),
        totalCalls: Math.floor(Math.random() * 500),
        totalCost: Math.random() * 100,
        successRate: 85 + Math.random() * 10,
        language: 'es',
        period: { from: fromDate, to: toDate },
      };

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Telephony API endpoints (tenant-scoped)
  
  // Extensions endpoints
  app.get("/api/extensions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const { status, q, page = 1, pageSize = 10 } = req.query;
      const result = await storage.getExtensions(
        req.user.tenantId,
        status as string,
        q as string,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extensions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const validatedExtension = insertExtensionSchema.parse(req.body);
      const extensionWithTenant = {
        ...validatedExtension,
        tenantId: req.user.tenantId,
        sipPassword: Math.random().toString(36).substr(2, 12),
      };
      
      const extension = await storage.createExtension(extensionWithTenant);
      res.json(extension);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/extensions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const extensionData = insertExtensionSchema.partial().parse(req.body);
      const extension = await storage.updateExtension(req.params.id, extensionData);
      res.json(extension);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/extensions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      await storage.deleteExtension(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/extensions/:id/reset-pin", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const extension = await storage.resetExtensionPin(req.params.id);
      res.json({ extension, newPin: extension.sipPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // IVR endpoints
  app.get("/api/ivrs", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const ivrs = await storage.getIvrs(req.user.tenantId);
      res.json(ivrs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ivrs", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const validatedIvr = insertIvrMenuSchema.parse(req.body);
      const ivrWithTenant = {
        ...validatedIvr,
        tenantId: req.user.tenantId,
      };
      
      const ivr = await storage.createIvr(ivrWithTenant);
      res.json(ivr);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/ivrs/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const ivrData = insertIvrMenuSchema.partial().parse(req.body);
      const ivr = await storage.updateIvr(req.params.id, ivrData);
      res.json(ivr);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Queue endpoints
  app.get("/api/queues", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const queues = await storage.getQueues(req.user.tenantId);
      res.json(queues);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/queues", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const queueData = insertQueueSchema.parse(req.body);
      const queueWithTenant = {
        ...queueData,
        tenantId: req.user.tenantId,
      };
      
      const queue = await storage.createQueue(queueWithTenant);
      res.json(queue);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/queues/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const queueData = insertQueueSchema.partial().parse(req.body);
      const queue = await storage.updateQueue(req.params.id, queueData);
      res.json(queue);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Recordings endpoints
  app.get("/api/recordings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const { from, to, page = 1, pageSize = 10 } = req.query;
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string) : undefined;
      
      const result = await storage.getRecordings(
        req.user.tenantId,
        fromDate,
        toDate,
        parseInt(page as string),
        parseInt(pageSize as string)
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return server;
}
