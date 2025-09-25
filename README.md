# Gueswi - SaaS Virtual PBX Platform

Gueswi is a modern SaaS virtual PBX (Private Branch Exchange) platform with AI integration, designed to provide intelligent call management, IVR automation, extension management, and analytics for businesses.

## Features

- **Multi-tenant Architecture** - Secure tenant isolation with role-based access control
- **Intelligent Payment Processing** - Mode-based configuration supporting Stripe and PayPal
- **Advanced Authentication** - Session-based auth with passport.js and bcrypt encryption
- **Email Integration** - Postmark API with SMTP fallback for reliable email delivery
- **Modern UI/UX** - Gueswi design system with responsive layouts and accessibility
- **Dashboard Analytics** - KPI cards and metrics visualization
- **Extension Management** - Complete PBX functionality (prepared for integration)
- **AI Services** - Ready for STT/TTS/LLM integration

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter routing
- **Backend**: Express.js + TypeScript, Passport.js authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Payment**: Stripe + PayPal with intelligent mode switching
- **Email**: Postmark API with SMTP fallback
- **Styling**: Gueswi design system (#0652CC primary, #132661 navy, Onest typography)

## Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd gueswi
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**
   ```bash
   npm run db:push
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Payment Configuration System

Gueswi features a sophisticated mode-based payment configuration system that allows seamless switching between test and production environments:

### Mode Selection
- **STRIPE_MODE**: `test` or `live` - Controls which Stripe credentials to use
- **PAYPAL_MODE**: `sandbox` or `live` - Controls which PayPal environment to use

### Stripe Configuration
```bash
# Set the mode
STRIPE_MODE=test  # Use 'live' for production

# Test credentials (used when STRIPE_MODE=test)
TESTING_STRIPE_SECRET_KEY=sk_test_...
TESTING_VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Live credentials (used when STRIPE_MODE=live)
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Price IDs for subscription plans
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
```

### PayPal Configuration
```bash
# Set the mode
PAYPAL_MODE=sandbox  # Use 'live' for production

# Sandbox credentials (used when PAYPAL_MODE=sandbox)
PAYPAL_CLIENT_ID_SANDBOX=your_sandbox_client_id
PAYPAL_CLIENT_SECRET_SANDBOX=your_sandbox_client_secret

# Live credentials (used when PAYPAL_MODE=live)
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_client_secret
```

### Email Service Configuration
```bash
# Postmark (preferred - automatically used when POSTMARK_API_KEY is configured)
POSTMARK_API_KEY=your-postmark-api-key
POSTMARK_FROM_EMAIL=noreply@yourdomain.com

# SMTP fallback (automatically used when POSTMARK_API_KEY is not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

### Development Features
The system automatically handles development scenarios:
- Missing credentials trigger development mode with mock responses
- Mode banner in header shows current configuration status (Test/Sandbox vs Live)
- Clear error messages guide configuration setup
- Graceful fallbacks prevent application crashes

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user` - Get current user

### System Configuration
- `GET /api/system/mode` - Get current payment/email mode configuration

### Payments
- `POST /api/create-payment-intent` - Create Stripe payment intent
- `POST /api/create-subscription` - Create subscription
- `POST /api/paypal/setup` - Setup PayPal integration
- `POST /api/paypal/order` - Create PayPal order

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/paypal` - PayPal webhook handler

## Database Schema

### Core Tables
- **users** - User accounts with encrypted passwords
- **tenants** - Multi-tenant organization support
- **user_tenants** - User-tenant relationships with roles
- **extensions** - PBX extension management
- **bank_transfers** - Manual payment processing
- **call_records** - Call logging and analytics
- **ai_metrics** - AI service usage tracking

## Development Guidelines

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   └── lib/            # Client utilities
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   ├── config.ts       # Configuration management
│   └── storage.ts      # Database operations
├── shared/             # Shared types and schemas
└── uploads/            # File storage
```

### Testing
The platform includes comprehensive testing capabilities:
- **Payment sandbox testing** - Automated Stripe/PayPal flow verification
- **Authentication testing** - User registration and login flows
- **Error handling verification** - Graceful degradation testing
- **UI/UX testing** - Playwright-based end-to-end testing

### Code Standards
- TypeScript strict mode for type safety
- Proper error handling with user-friendly messages
- Responsive design with mobile-first approach
- Accessibility compliance (WCAG AA)
- SEO optimization with proper meta tags

## Deployment

### Environment Setup
1. Set `STRIPE_MODE=live` and `PAYPAL_MODE=live` for production
2. Configure production database credentials
3. Set up proper webhook URLs with `WEBHOOK_BASE_URL`
4. Configure production email provider (Postmark recommended)

### Webhook Configuration
- **Stripe**: `{WEBHOOK_BASE_URL}/api/webhooks/stripe`
- **PayPal**: `{WEBHOOK_BASE_URL}/api/webhooks/paypal`

## Security Features

- Session-based authentication with PostgreSQL session store
- Password encryption using Node.js crypto (scrypt)
- CORS protection with configurable origins
- Rate limiting on API endpoints
- SQL injection prevention through parameterized queries
- XSS protection with proper input sanitization

## AI Integration (Prepared)

The platform is prepared for AI service integration:
- STT (Speech-to-Text) service endpoints
- TTS (Text-to-Speech) capabilities
- LLM integration for intelligent call routing
- AI metrics tracking and analytics

## Support

For technical issues or questions:
1. Check the console for configuration guidance
2. Verify environment variables in `.env`
3. Review server logs for detailed error information
4. Use development mode for testing payment flows

## License

Private - All rights reserved

---

Built with ❤️ using modern web technologies and the Gueswi design system.