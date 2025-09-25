/**
 * Configuration loader for payment services and email
 * Supports test/live mode selection for Stripe and PayPal
 */

export type PaymentMode = 'test' | 'live';
export type PayPalMode = 'sandbox' | 'live';

interface StripeConfig {
  mode: PaymentMode;
  publicKey: string;
  secretKey: string;
  webhookSecret?: string;
}

interface PayPalConfig {
  mode: PayPalMode;
  clientId: string;
  clientSecret: string;
  webhookId?: string;
}

interface EmailConfig {
  provider: 'postmark' | 'smtp';
  postmark?: {
    apiKey: string;
    fromEmail: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
}

interface WebhookConfig {
  baseUrl: string;
  stripeEndpoint: string;
  paypalEndpoint: string;
}

interface AppConfig {
  stripe: StripeConfig;
  paypal: PayPalConfig;
  email: EmailConfig;
  webhooks: WebhookConfig;
  isDevelopment: boolean;
  isTestMode: boolean;
}

function getStripeConfig(): StripeConfig {
  const mode = (process.env.STRIPE_MODE || 'test') as PaymentMode;
  
  const publicKey = mode === 'live' 
    ? process.env.VITE_STRIPE_PUBLIC_KEY_LIVE || process.env.VITE_STRIPE_PUBLIC_KEY
    : process.env.VITE_STRIPE_PUBLIC_KEY_TEST || process.env.VITE_STRIPE_PUBLIC_KEY;
    
  const secretKey = mode === 'live'
    ? process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;

  const webhookSecret = mode === 'live'
    ? process.env.STRIPE_WEBHOOK_SECRET_LIVE
    : process.env.STRIPE_WEBHOOK_SECRET_TEST;

  if (!publicKey || !secretKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing Stripe ${mode} mode credentials`);
    }
    console.warn(`⚠️ Missing Stripe ${mode} mode credentials - using development fallbacks`);
  }

  return {
    mode,
    publicKey: publicKey || 'pk_test_development_key',
    secretKey: secretKey || 'sk_test_development_key',
    webhookSecret
  };
}

function getPayPalConfig(): PayPalConfig {
  const mode = (process.env.PAYPAL_MODE || 'sandbox') as PayPalMode;
  
  const clientId = mode === 'live' 
    ? process.env.PAYPAL_CLIENT_ID_LIVE || process.env.PAYPAL_CLIENT_ID
    : process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID;
    
  const clientSecret = mode === 'live'
    ? process.env.PAYPAL_CLIENT_SECRET_LIVE || process.env.PAYPAL_CLIENT_SECRET
    : process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET;

  const webhookId = mode === 'live'
    ? process.env.PAYPAL_WEBHOOK_ID_LIVE
    : process.env.PAYPAL_WEBHOOK_ID_SANDBOX;

  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing PayPal ${mode} mode credentials`);
    }
    console.warn(`⚠️ Missing PayPal ${mode} mode credentials - using development fallbacks`);
  }

  return {
    mode,
    clientId: clientId || 'development_client_id',
    clientSecret: clientSecret || 'development_client_secret',
    webhookId
  };
}

function getEmailConfig(): EmailConfig {
  const postmarkApiKey = process.env.POSTMARK_API_KEY;
  
  if (postmarkApiKey) {
    return {
      provider: 'postmark',
      postmark: {
        apiKey: postmarkApiKey,
        fromEmail: process.env.POSTMARK_FROM_EMAIL || 'noreply@gueswi.com'
      }
    };
  }
  
  // Fallback to SMTP
  return {
    provider: 'smtp',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'noreply@gueswi.com'
    }
  };
}

function getWebhookConfig(): WebhookConfig {
  const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://your-app.replit.app';
  
  return {
    baseUrl,
    stripeEndpoint: `${baseUrl}/api/webhooks/stripe`,
    paypalEndpoint: `${baseUrl}/api/webhooks/paypal`
  };
}

// Initialize configuration
const config: AppConfig = {
  stripe: getStripeConfig(),
  paypal: getPayPalConfig(),
  email: getEmailConfig(),
  webhooks: getWebhookConfig(),
  isDevelopment: process.env.NODE_ENV === 'development',
  isTestMode: (process.env.STRIPE_MODE || 'test') === 'test' || (process.env.PAYPAL_MODE || 'sandbox') === 'sandbox'
};

// Log configuration on startup
console.log('🔧 Configuration loaded:');
console.log(`  Stripe: ${config.stripe.mode} mode`);
console.log(`  PayPal: ${config.paypal.mode} mode`);
console.log(`  Email: ${config.email.provider} provider`);
console.log(`  Webhooks: ${config.webhooks.baseUrl}`);
console.log(`  Environment: ${config.isDevelopment ? 'development' : 'production'}`);

export default config;
export type { AppConfig, StripeConfig, PayPalConfig, EmailConfig, WebhookConfig };