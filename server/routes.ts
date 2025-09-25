import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { insertTenantSchema, insertBankTransferSchema, insertExtensionSchema } from "@shared/schema";
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
  // Setup authentication
  setupAuth(app);

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

      const transferData = {
        ...req.body,
        userId: req.user.id,
        tenantId: req.user.tenantId || "",
        receiptUrl: (req as any).file?.path,
        transferDate: new Date(req.body.transferDate + 'T' + req.body.transferTime),
      };

      const validatedTransfer = insertBankTransferSchema.parse(transferData);
      const transfer = await storage.createBankTransfer(validatedTransfer);
      
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
      const fromDate = new Date(from as string);
      const toDate = new Date(to as string);
      
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

      const extensionData = {
        ...req.body,
        tenantId: req.user.tenantId || "",
      };

      const validatedExtension = insertExtensionSchema.parse(extensionData);
      const extension = await storage.createExtension(validatedExtension);

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

  const httpServer = createServer(app);

  return httpServer;
}
