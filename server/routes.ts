import type { Express } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Extend Server type to include wsHandler
interface ServerWithWebSocket extends Server {
  wsHandler?: {
    broadcast: (channel: string, data: any) => void;
  };
}
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import {
  createPaypalOrder,
  capturePaypalOrder,
  loadPaypalDefault,
} from "./paypal";
import {
  insertTenantSchema,
  insertBankTransferSchema,
  insertExtensionSchema,
  insertIvrMenuSchema,
  insertQueueSchema,
  insertRecordingSchema,
  insertPipelineStageSchema,
  insertLeadSchema,
  insertLeadActivitySchema,
} from "@shared/schema";
import * as schema from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import multer from "multer";

// Stripe setup with config loader
import config from "./config";

const hasValidStripeKey = config.stripe.secretKey !== "sk_test_development_key";
let stripe: Stripe | null = null;
if (hasValidStripeKey) {
  stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

// Multer setup for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, and PDF files are allowed.",
        ),
      );
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server and setup WebSocket support
  const server = createServer(app) as ServerWithWebSocket;

  // Mock WebSocket handler for softphone (dev implementation)
  const wsHandler = {
    broadcast: (channel: string, data: any) => {
      console.log(`📡 WebSocket broadcast [${channel}]:`, data);
      // TODO: Implement real WebSocket broadcasting when WebSocket server is added
    },
  };

  // Attach WebSocket handler to server
  server.wsHandler = wsHandler;

  // Setup authentication
  setupAuth(app);

  // Bootstrap middleware - automatically create tenant for users without one
  app.use("/api", async (req, res, next) => {
    // Skip bootstrap for public routes
    const publicRoutes = [
      "/api/login",
      "/api/register",
      "/api/system/mode",
      "/api/logout",
    ];
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
        const { user, tenant } = await storage.bootstrapUserTenant(
          req.user.id,
          req.user.email,
        );

        // Update req.user with new tenant info
        req.user = user;

        console.log(
          `✅ Tenant bootstrap completed: ${tenant.id} for ${user.email}`,
        );
      } catch (error) {
        console.error("❌ Bootstrap failed:", error);
        return res.status(500).json({
          code: "BOOTSTRAP_FAILED",
          message: "Failed to create tenant workspace",
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
        return res
          .status(401)
          .json({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      if (req.user.role !== "owner") {
        return res
          .status(403)
          .json({ code: "FORBIDDEN", message: "Owner role required" });
      }

      await storage.resetTenantData(req.user.tenantId);

      res.json({
        success: true,
        message: `Tenant data reset and reseeded for: ${req.user.tenantId}`,
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
        status: "ringing",
      });

      // Emit WebSocket event for ringing
      if (server.wsHandler) {
        server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
          type: "call_status",
          conversationId: conversation.id,
          callId,
          status: "ringing",
          phoneNumber: to,
        });
      }

      // Mock call progression after 2 seconds
      setTimeout(async () => {
        try {
          // Update conversation status in database
          await storage.updateConversationStatus(conversation.id, "answered");

          // Broadcast WebSocket event
          if (server.wsHandler) {
            server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
              type: "call_status",
              conversationId: conversation.id,
              callId,
              status: "answered",
              phoneNumber: to,
            });
          }
        } catch (error) {
          console.error("❌ Error updating call status:", error);
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
      const activeConversation = await storage.getActiveConversation(
        req.user.tenantId,
        req.user.id,
      );

      console.log(
        `🔍 Status: Active conversation check:`,
        activeConversation
          ? `${activeConversation.id} (${activeConversation.status})`
          : "none",
      );

      if (!activeConversation) {
        return res.json(null); // No active call - clean state
      }

      // Return call status data
      res.json({
        number: activeConversation.phoneNumber,
        status: activeConversation.status,
        duration: Math.floor(
          (Date.now() - new Date(activeConversation.createdAt).getTime()) /
            1000,
        ),
        conversationId: activeConversation.id,
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
          type: "call_mute",
          conversationId,
          muted,
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
          type: "call_hold",
          conversationId,
          held,
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

      // Update conversation status (idempotent - safe to call multiple times)
      await storage.endConversationById(conversationId);

      console.log(`✅ Hangup: Conversation ${conversationId} ended`);

      // Emit WebSocket event
      if (server.wsHandler) {
        server.wsHandler.broadcast(`tenant:${req.user.tenantId}`, {
          type: "ended",
          conversationId,
        });
      }

      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(
    "/api/softphone/calls/:conversationId/transfer",
    async (req, res) => {
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
            type: "call_transfer",
            conversationId,
            transferTo: to,
          });
        }

        res.json({ success: true, conversationId, transferTo: to });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    },
  );

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
      const conversation = await storage.getConversationWithMessages(
        id,
        req.user.tenantId,
      );

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
        parseInt(pageSize as string),
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
          message: "Running in development mode - Stripe not configured",
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
  app.post("/api/create-subscription", async (req, res) => {
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
          message: "Running in development mode - Stripe not configured",
        });
      }

      const subscription = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId,
      );

      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent
          ?.client_secret,
      });

      return;
    }

    try {
      if (!stripe) {
        return res.json({
          subscriptionId: "sub_mock_development",
          clientSecret: "pi_mock_development_secret",
          mock: true,
          message: "Running in development mode - Stripe not configured",
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
          message: `Missing Stripe price ID for ${plan} plan. Configure STRIPE_${plan.toUpperCase()}_PRICE_ID environment variable.`,
        });
      }

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price: priceIds[plan as keyof typeof priceIds] || priceIds.growth,
          },
        ],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);

      res.send({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent
          ?.client_secret,
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
  app.post(
    "/api/bank-transfers",
    upload.single("receipt"),
    async (req, res) => {
      try {
        if (!req.isAuthenticated()) {
          return res.sendStatus(401);
        }

        const validatedTransfer = insertBankTransferSchema.parse({
          referenceNumber: req.body.referenceNumber,
          bank: req.body.bank,
          amount: req.body.amount,
          transferDate: new Date(
            req.body.transferDate + "T" + req.body.transferTime,
          ),
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
    },
  );

  app.get("/api/bank-transfers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }

      if (req.user.role === "admin" || req.user.role === "owner") {
        const transfers = await storage.getAllPendingTransfers();
        res.json(transfers);
      } else {
        const transfers = await storage.getBankTransfersByTenant(
          req.user.tenantId!,
        );
        res.json(transfers);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/bank-transfers/:id", async (req, res) => {
    try {
      if (
        !req.isAuthenticated() ||
        (req.user.role !== "admin" && req.user.role !== "owner")
      ) {
        return res.sendStatus(403);
      }

      const { id } = req.params;
      const { status, adminComments } = req.body;

      const transfer = await storage.updateTransferStatus(
        id,
        status,
        adminComments,
        req.user.id,
      );

      // If approved, activate tenant or credit balance
      if (status === "approved") {
        // TODO: Implement tenant activation logic
        await storage.updateTenantStatus(transfer.tenantId, "active");
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
      environment: config.isDevelopment ? "development" : "production",
      webhooks: {
        stripe: config.webhooks.stripeEndpoint,
        paypal: config.webhooks.paypalEndpoint,
      },
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
      const fromDate = from
        ? new Date(from as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date();

      // Validate dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const data = await storage.getConsumptionData(
        req.user.tenantId,
        fromDate,
        toDate,
      );
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Advanced metrics dashboard
  app.get("/api/metrics/dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user.tenantId) {
        return res.sendStatus(401);
      }

      const metrics = await storage.getAdvancedMetrics(req.user.tenantId);
      res.json(metrics);
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
        status: "provisioned",
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
        status: "active",
      };

      res.json(ivrConfig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // TTS (Text-to-Speech) synthesis endpoint
  // Production-ready TTS with provider support and development fallback
  app.post("/api/ivr/tts", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { text, voice } = req.body;
      if (!text || typeof text !== "string" || text.trim().length < 10) {
        return res
          .status(400)
          .json({ message: "Text must be at least 10 characters" });
      }
      if (!voice || typeof voice !== "object") {
        return res
          .status(400)
          .json({ message: "Voice configuration is required" });
      }

      // Generate unique audio ID
      const audioId = `ivr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Determine file extension based on TTS provider
      const ttsProvider = process.env.TTS_PROVIDER || "mock";
      const fileExtension = ttsProvider === "elevenlabs" ? "mp3" : "wav";
      const fileName = `${audioId}.${fileExtension}`;

      // Full path for TTS output
      const uploadsDir = path.resolve("uploads/ivr");
      const absPath = path.join(uploadsDir, fileName);

      // Use the new TTS system
      const { synthesizeTTS } = await import("./tts/index.js");

      const result = await synthesizeTTS({
        text: text.trim(),
        voice: {
          gender: voice.gender || "mujer",
          style: voice.style || "amable",
        },
        outPath: absPath,
      });

      console.log(
        `🔊 TTS synthesized: ${ttsProvider} → ${result.url} (${result.durationSec}s)`,
      );

      return res.json({
        url: result.url,
        duration: result.durationSec,
        voice,
        text,
        audioId,
        provider: ttsProvider !== "mock" ? ttsProvider : "development",
      });
    } catch (err: any) {
      console.error("❌ IVR TTS error:", err);
      return res
        .status(500)
        .json({ message: err?.message || "TTS synthesis failed" });
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
        language: "es",
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
        parseInt(pageSize as string),
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
      const extension = await storage.updateExtension(
        req.params.id,
        extensionData,
      );
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
        parseInt(pageSize as string),
      );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  // Gateway OpenAI para Twilio Voice AI
  app.post("/api/ai-gateway", async (req, res) => {
    try {
      const { messages, context } = req.body;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Eres un asistente virtual de Gueswi. Responde de forma concisa (máximo 2-3 frases) y natural. Si el cliente quiere hablar con un humano, indica que vas a transferir la llamada.",
              },
              ...messages,
            ],
            max_tokens: 150,
            temperature: 0.7,
          }),
        },
      );

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      res.json({
        response: aiMessage,
        actions: aiMessage.toLowerCase().includes("transferir")
          ? ["transfer"]
          : [],
      });
    } catch (error: any) {
      console.log(`AI Gateway error: ${error.message}`);
      res.status(500).json({ error: "AI processing failed" });
    }
  });

  // Pipeline CRM endpoints
  app.get("/api/pipeline/stages", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const stages = await db
        .select()
        .from(schema.pipelineStages)
        .where(eq(schema.pipelineStages.tenantId, req.user.tenantId))
        .orderBy(schema.pipelineStages.order);

      res.json(stages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pipeline/leads", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const leads = await db
        .select()
        .from(schema.leads)
        .where(eq(schema.leads.tenantId, req.user.tenantId))
        .orderBy(desc(schema.leads.createdAt));

      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/pipeline/leads/:id/move", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;
      const { stageId } = req.body;

      const oldLead = await db
        .select()
        .from(schema.leads)
        .where(
          and(
            eq(schema.leads.id, id),
            eq(schema.leads.tenantId, req.user.tenantId),
          ),
        )
        .limit(1);

      if (!oldLead.length) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const stage = await db
        .select()
        .from(schema.pipelineStages)
        .where(eq(schema.pipelineStages.id, stageId))
        .limit(1);

      await db
        .update(schema.leads)
        .set({ stageId, updatedAt: new Date() })
        .where(
          and(
            eq(schema.leads.id, id),
            eq(schema.leads.tenantId, req.user.tenantId),
          ),
        );

      // Crear actividad de cambio de etapa
      await db.insert(schema.leadActivities).values({
        leadId: id,
        userId: req.user.id,
        type: "stage_change",
        description: `Lead movido a ${stage[0]?.name || stageId}`,
        metadata: { oldStageId: oldLead[0].stageId, newStageId: stageId },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // CRUD de stages
  app.post("/api/pipeline/stages", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const validatedData = schema.insertPipelineStageSchema.parse(req.body);
      
      const [stage] = await db
        .insert(schema.pipelineStages)
        .values({
          ...validatedData,
          tenantId: req.user.tenantId,
        })
        .returning();

      res.json(stage);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/pipeline/stages/reorder", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      console.log("🔧 Reorder request body:", JSON.stringify(req.body));
      const { stages } = req.body;
      
      if (!stages || !Array.isArray(stages)) {
        return res.status(400).json({ error: "Invalid stages array" });
      }

      // Update each stage's order
      for (const stage of stages) {
        await db
          .update(schema.pipelineStages)
          .set({ order: stage.order })
          .where(
            and(
              eq(schema.pipelineStages.id, stage.id),
              eq(schema.pipelineStages.tenantId, req.user.tenantId)
            )
          );
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("❌ Reorder error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/pipeline/stages/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;
      const { name, color } = req.body;

      // Build update object with only provided fields
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;

      // If no fields to update, return current stage
      if (Object.keys(updateData).length === 0) {
        const [stage] = await db
          .select()
          .from(schema.pipelineStages)
          .where(
            and(
              eq(schema.pipelineStages.id, id),
              eq(schema.pipelineStages.tenantId, req.user.tenantId),
            ),
          )
          .limit(1);
        
        if (!stage) {
          return res.status(404).json({ error: "Stage not found" });
        }
        
        return res.json(stage);
      }

      const [updated] = await db
        .update(schema.pipelineStages)
        .set(updateData)
        .where(
          and(
            eq(schema.pipelineStages.id, id),
            eq(schema.pipelineStages.tenantId, req.user.tenantId),
          ),
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Stage not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pipeline/stages/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;

      // Verificar que no sea una etapa fija
      const [stage] = await db
        .select()
        .from(schema.pipelineStages)
        .where(
          and(
            eq(schema.pipelineStages.id, id),
            eq(schema.pipelineStages.tenantId, req.user.tenantId),
          ),
        )
        .limit(1);

      if (!stage) {
        return res.status(404).json({ error: "Stage not found" });
      }

      if (stage.isFixed) {
        return res.status(400).json({ error: "Cannot delete fixed stages (Won/Lost)" });
      }

      // Verificar si hay leads en esta etapa
      const leadsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.leads)
        .where(eq(schema.leads.stageId, id));

      if (Number(leadsCount[0]?.count) > 0) {
        return res.status(400).json({ 
          error: "Cannot delete stage with leads. Move or delete leads first." 
        });
      }

      await db
        .delete(schema.pipelineStages)
        .where(
          and(
            eq(schema.pipelineStages.id, id),
            eq(schema.pipelineStages.tenantId, req.user.tenantId),
          ),
        );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // CRUD de leads
  app.post("/api/pipeline/leads", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const validationResult = schema.insertLeadSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error("Lead validation error:", validationResult.error.format());
        return res.status(400).json({ 
          error: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")
        });
      }

      // Convertir y limpiar datos
      const processedData: any = { ...validationResult.data };
      
      // Convertir value de number a string si es necesario (para decimal en BD)
      if (typeof processedData.value === 'number') {
        processedData.value = processedData.value.toString();
      }
      
      // Convertir strings de fecha a objetos Date
      if (processedData.expectedCloseDate && typeof processedData.expectedCloseDate === 'string') {
        const date = new Date(processedData.expectedCloseDate);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ error: "Invalid expectedCloseDate format" });
        }
        processedData.expectedCloseDate = date;
      }

      const [lead] = await db
        .insert(schema.leads)
        .values({
          ...processedData,
          tenantId: req.user.tenantId,
        })
        .returning();

      // Crear actividad de creación
      await db.insert(schema.leadActivities).values({
        leadId: lead.id,
        userId: req.user.id,
        type: "note",
        description: "Lead creado",
      });

      res.json(lead);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/pipeline/leads/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;

      const [lead] = await db
        .select()
        .from(schema.leads)
        .where(
          and(
            eq(schema.leads.id, id),
            eq(schema.leads.tenantId, req.user.tenantId),
          ),
        )
        .limit(1);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Obtener actividades
      const activities = await db
        .select()
        .from(schema.leadActivities)
        .where(eq(schema.leadActivities.leadId, id))
        .orderBy(desc(schema.leadActivities.createdAt));

      res.json({ ...lead, activities });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/pipeline/leads/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validar que hay datos para actualizar
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No data provided for update" });
      }

      // Convertir strings de fecha a objetos Date
      const processedData = { ...updateData };
      if (processedData.closedAt && typeof processedData.closedAt === 'string') {
        processedData.closedAt = new Date(processedData.closedAt);
      }
      if (processedData.expectedCloseDate && typeof processedData.expectedCloseDate === 'string') {
        processedData.expectedCloseDate = new Date(processedData.expectedCloseDate);
      }

      const [updated] = await db
        .update(schema.leads)
        .set({ ...processedData, updatedAt: new Date() })
        .where(
          and(
            eq(schema.leads.id, id),
            eq(schema.leads.tenantId, req.user.tenantId),
          ),
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Crear actividad de edición
      await db.insert(schema.leadActivities).values({
        leadId: id,
        userId: req.user.id,
        type: "note",
        description: "Lead actualizado",
        metadata: updateData,
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/pipeline/leads/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;

      // Eliminar actividades primero
      await db
        .delete(schema.leadActivities)
        .where(eq(schema.leadActivities.leadId, id));

      // Eliminar lead
      await db
        .delete(schema.leads)
        .where(
          and(
            eq(schema.leads.id, id),
            eq(schema.leads.tenantId, req.user.tenantId),
          ),
        );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/pipeline/leads/:id/activities", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;

      // Verificar que el lead pertenece al tenant del usuario
      const lead = await db
        .select()
        .from(schema.leads)
        .where(
          and(
            eq(schema.leads.id, id),
            eq(schema.leads.tenantId, req.user.tenantId),
          ),
        )
        .limit(1);

      if (!lead.length) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Obtener actividades del lead ordenadas por fecha de creación (más recientes primero)
      const activities = await db
        .select()
        .from(schema.leadActivities)
        .where(eq(schema.leadActivities.leadId, id))
        .orderBy(desc(schema.leadActivities.createdAt));

      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/pipeline/leads/:id/activities", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      const { id } = req.params;
      const validatedData = schema.insertLeadActivitySchema.parse(req.body);

      const [activity] = await db
        .insert(schema.leadActivities)
        .values({
          ...validatedData,
          leadId: id,
          userId: req.user.id,
        })
        .returning();

      res.json(activity);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Métricas del pipeline
  app.get("/api/pipeline/metrics", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.tenantId) {
      return res.sendStatus(401);
    }

    try {
      // Valor total del pipeline
      const totalValue = await db
        .select({ 
          sum: sql<string>`COALESCE(SUM(${schema.leads.value}), 0)` 
        })
        .from(schema.leads)
        .where(eq(schema.leads.tenantId, req.user.tenantId));

      // Contar leads ganados y totales
      const wonStage = await db
        .select()
        .from(schema.pipelineStages)
        .where(
          and(
            eq(schema.pipelineStages.tenantId, req.user.tenantId),
            eq(schema.pipelineStages.isFixed, true),
            sql`${schema.pipelineStages.name} ILIKE '%ganado%'`
          ),
        )
        .limit(1);

      const wonCount = wonStage.length > 0 
        ? await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.leads)
            .where(eq(schema.leads.stageId, wonStage[0].id))
        : [{ count: 0 }];

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.leads)
        .where(eq(schema.leads.tenantId, req.user.tenantId));

      const conversionRate = Number(totalCount[0]?.count) > 0
        ? (Number(wonCount[0]?.count) / Number(totalCount[0]?.count)) * 100
        : 0;

      // Tiempo promedio de cierre (en días)
      const avgClosingTime = wonStage.length > 0
        ? await db
            .select({
              avg: sql<number>`AVG(EXTRACT(EPOCH FROM (${schema.leads.closedAt} - ${schema.leads.createdAt})) / 86400)`,
            })
            .from(schema.leads)
            .where(
              and(
                eq(schema.leads.stageId, wonStage[0].id),
                sql`${schema.leads.closedAt} IS NOT NULL`,
              ),
            )
        : [{ avg: 0 }];

      // Valor ganado
      const wonValue = wonStage.length > 0
        ? await db
            .select({ 
              sum: sql<string>`COALESCE(SUM(${schema.leads.value}), 0)` 
            })
            .from(schema.leads)
            .where(eq(schema.leads.stageId, wonStage[0].id))
        : [{ sum: '0' }];

      // Etapa "Perdido" y valor perdido
      const lostStage = await db
        .select()
        .from(schema.pipelineStages)
        .where(
          and(
            eq(schema.pipelineStages.tenantId, req.user.tenantId),
            eq(schema.pipelineStages.isFixed, true),
            sql`${schema.pipelineStages.name} ILIKE '%perdido%'`
          ),
        )
        .limit(1);

      const lostValue = lostStage.length > 0
        ? await db
            .select({ 
              sum: sql<string>`COALESCE(SUM(${schema.leads.value}), 0)` 
            })
            .from(schema.leads)
            .where(eq(schema.leads.stageId, lostStage[0].id))
        : [{ sum: '0' }];

      res.json({
        totalValue: Number(totalValue[0]?.sum || 0),
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgClosingDays: Math.round(Number(avgClosingTime[0]?.avg || 0)),
        wonCount: Number(wonCount[0]?.count || 0),
        wonValue: Number(wonValue[0]?.sum || 0),
        lostValue: Number(lostValue[0]?.sum || 0),
        totalCount: Number(totalCount[0]?.count || 0),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/webhook/twilio-voice", (req, res) => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say language="es-MX" voice="Polly.Lupe-Neural">
      Hola, soy el asistente virtual de Gueswi. ¿En qué puedo ayudarte?
    </Say>
    <Gather 
      input="speech" 
      language="es-ES"
      speechTimeout="auto"
      action="/webhook/twilio-process-speech"
      method="POST">
    </Gather>
    <Say language="es-MX" voice="Polly.Lupe-Neural">
      No te escuché. Por favor, llama de nuevo.
    </Say>
  </Response>`;

    res.type("text/xml");
    res.send(twiml);
  });

  // Procesar respuesta del usuario
  app.post("/webhook/twilio-process-speech", async (req, res) => {
    const userSpeech = req.body.SpeechResult || "";

    try {
      // Llamar a OpenAI
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Eres un asistente de Gueswi. Responde en máximo 2 frases.",
              },
              {
                role: "user",
                content: userSpeech,
              },
            ],
            max_tokens: 100,
          }),
        },
      );

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say language="es-MX" voice="Polly.Lupe-Neural">${aiResponse}</Say>
    <Gather 
      input="speech" 
      language="es-ES"
      speechTimeout="auto"
      action="/webhook/twilio-process-speech"
      method="POST">
    </Gather>
    <Say language="es-MX" voice="Polly.Lupe-Neural">Gracias por llamar. Hasta pronto.</Say>
  </Response>`;

      res.type("text/xml");
      res.send(twiml);
    } catch (error: any) {
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say language="es-MX" voice="Polly.Lupe-Neural">
      Lo siento, tengo problemas técnicos. Por favor llama más tarde.
    </Say>
  </Response>`;
      res.type("text/xml");
      res.send(errorTwiml);
    }
  });
  return server;
}
