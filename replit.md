# Overview

Gueswi is a SaaS centralita virtual (virtual PBX) with AI integration, built as a full-stack application. The platform provides intelligent call management, IVR automation, extension management, and analytics for businesses. It features a modern React frontend with TypeScript, an Express.js backend with PostgreSQL database, and integrations with payment providers (Stripe/PayPal) for subscription management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18 with TypeScript** - Modern component-based UI using functional components and hooks
- **Vite** - Build tool for fast development and optimized production builds
- **Tailwind CSS + shadcn/ui** - Utility-first styling with pre-built accessible components
- **Wouter** - Lightweight client-side routing for navigation
- **React Hook Form + Zod** - Form handling with schema validation
- **TanStack Query** - Server state management and data fetching
- **Onest Font** - Custom Google Fonts integration for brand consistency

## Backend Architecture
- **Express.js** - Node.js web framework for REST API endpoints
- **TypeScript** - Type safety across the entire backend
- **Passport.js with Local Strategy** - Authentication with session-based auth
- **Express Session** - Session management with PostgreSQL store
- **File Upload Support** - Multer middleware for handling file uploads (bank transfer receipts)
- **CORS and Security** - Proper middleware setup for cross-origin requests

## Database Layer
- **PostgreSQL with Neon** - Cloud-hosted PostgreSQL database
- **Drizzle ORM** - Type-safe database interactions with schema-first approach
- **Schema Design** - Multi-tenant architecture with users, tenants, extensions, bank transfers, call records, and AI metrics tables
- **Migrations** - Database versioning through Drizzle Kit

## Authentication & Authorization
- **Session-based Authentication** - Secure login system with encrypted passwords using scrypt
- **Role-based Access Control** - User roles (owner, admin, user) with different permissions
- **Protected Routes** - Client-side route protection with authentication checks
- **Multi-tenant Support** - Users belong to tenants with isolated data access

## Payment Processing
- **Dual Payment Integration** - Both Stripe and PayPal support for subscription payments
- **Bank Transfer Support** - Manual payment processing with file upload and admin approval workflow
- **Subscription Management** - Integration with Stripe for recurring billing
- **Payment Method Selection** - Users can choose between credit card, PayPal, or bank transfer

## UI/UX Design System
- **Gueswi Design System** - Custom design tokens and component library based on shadcn/ui
- **Accessible Components** - AA-compliant components with proper focus management
- **Responsive Design** - Mobile-first approach with responsive layouts
- **Custom Color Palette** - Primary (#0652CC) and navy (#132661) brand colors
- **Component Library** - Reusable UI components including MetricCard, EmptyState, forms, and navigation

## Development & Build
- **Monorepo Structure** - Shared types and schemas between client and server
- **Path Mapping** - TypeScript path aliases for clean imports
- **Environment Configuration** - Separate development and production configurations
- **Build Process** - Vite for frontend, esbuild for backend bundling

# External Dependencies

## Payment Services
- **Stripe** - Primary payment processor for credit card payments and subscription management
- **PayPal** - Alternative payment method with PayPal SDK integration

## Database & Infrastructure
- **Neon Database** - Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support** - For real-time features (prepared for future AI agent integration)

## Authentication & Security
- **Express Session Store** - PostgreSQL-backed session storage for scalability
- **Crypto Module** - Node.js native crypto for password hashing with scrypt

## UI & Styling
- **Google Fonts (Onest)** - Custom font family for brand consistency
- **Radix UI Primitives** - Accessible component primitives for complex UI elements
- **Lucide React** - Icon library for consistent iconography

## Development Tools
- **Drizzle Kit** - Database migration and introspection tooling
- **Replit Plugins** - Development environment integration with error overlays and dev tools

## Third-party Integrations (Prepared)
- **AI Agent Infrastructure** - Prepared endpoints for STT/TTS/LLM integration
- **File Storage** - Local file system storage for uploaded documents (bank transfer receipts)
- **Analytics Platform** - Production-ready advanced metrics dashboard with real-time calculations

# Recent Changes

## Pipeline CRM System (October 2025)
Implemented complete Pipeline CRM with Kanban-style visual workflow accessible at `/pipeline`:

### Backend Implementation
- **13 Protected API Endpoints** - All requiring authentication with tenant isolation:
  - Stages: GET/POST/PATCH/DELETE `/api/pipeline/stages` + POST `/api/pipeline/stages/reorder`
  - Leads: GET/POST/PATCH/DELETE `/api/pipeline/leads` + GET `/api/pipeline/leads/:id`
  - Actions: PATCH `/api/pipeline/leads/:id/move` + POST `/api/pipeline/leads/:id/activities`
  - Metrics: GET `/api/pipeline/metrics` (real-time calculations)
- **Database Schema**:
  - `pipeline_stages`: id (uuid), tenant_id, name, order, color, is_fixed, created_at
  - `leads`: id (uuid), tenant_id, stage_id, name, email, phone, company, value, currency, probability, source, assigned_to, expected_close_date, closed_at, notes, tags, created_at, updated_at
  - `lead_activities`: id (uuid), lead_id, user_id, type (note/call/email/meeting/stage_change), description, metadata, created_at
- **Metrics Calculation**:
  - Total Pipeline Value: Sum of all lead values
  - Conversion Rate: (Won leads / Total leads) × 100
  - Average Closing Days: Time from creation to won status
  - Won/Total Counts: Real-time deal tracking
- **Fixed Stages**: "Ganado" and "Perdido" stages auto-seeded, protected from deletion/editing

### Frontend Implementation
- **Main Page**: `client/src/pages/pipeline-page.tsx`
  - Kanban board with horizontal stage columns
  - Metrics header with 5 key metrics (Total Value, Conversion Rate, Won Count, Total Count, Avg Days)
  - Search/filter functionality
  - @dnd-kit integration for drag-and-drop
- **5 Core Components**:
  - `StageColumn`: Droppable container for leads with stage info
  - `LeadCard`: Draggable lead card with value, company, probability, tags
  - `NewLeadDialog`: Comprehensive form (name, company, email, phone, value, currency, probability, stage, close date, notes, tags)
  - `StagesEditorDialog`: Stage management with drag-to-reorder, create/edit/delete, color picker
  - `LeadDetailsDialog`: 3-tab interface (Info, Activities timeline, Edit)
- **Drag-and-Drop Features**:
  - Drag leads between stages (auto-creates stage_change activity)
  - Drag stages to reorder (updates order for all stages)
  - Visual feedback during drag operations
- **Quick Actions**:
  - "Mark as Won" - Moves lead to Ganado stage, sets closed_at
  - "Mark as Lost" - Moves lead to Perdido stage, sets closed_at
- **Activities Tracking**:
  - Automatic activities: lead created, lead updated, stage changed
  - Manual activities: notes, calls, emails, meetings
  - Timeline view with timestamps

### UX Features
- Loading states for all queries and mutations
- Toast notifications for all actions (success/error)
- Responsive design for mobile/tablet/desktop
- Dark mode support throughout
- Confirmation dialogs for destructive actions
- Search by lead name or company
- data-testid attributes for all interactive elements
- TanStack Query for optimistic updates and cache invalidation

### Database Initialization
- Auto-seeded 5 default stages for all 13 existing tenants (65 total stages)
- Default stages: Lead (#3b82f6), Qualified (#8b5cf6), Proposal (#f59e0b), Ganado (#10b981, fixed), Perdido (#ef4444, fixed)

## Advanced Metrics Dashboard (October 2025)
Implemented production-ready advanced analytics dashboard accessible at `/analytics`:

### Backend Implementation
- **Endpoint**: `GET /api/metrics/dashboard` - Protected route requiring authentication
- **Real-time Calculations**:
  - ROI Savings: Calculated from AI-processed calls vs human cost ($15/hour baseline)
  - Hours Saved: Derived from call duration and AI automation rates
  - CSAT Score: Averaged from AI success rates in aiMetrics table
  - CSAT Change: Period-over-period comparison (last 30 days vs previous 30 days)
  - Churn Risk: Calculated from negative sentiment percentage
  - Intent Detection: Keyword-based analysis of conversation transcripts
  - Sentiment Analysis: Positive/neutral/negative distribution from conversations
  - Optimization Opportunities: Automated detection based on queue wait times and AI usage

### Data Sources
- `callRecords` table: AI-processed calls, durations, timestamps
- `aiMetrics` table: Success rates, AI performance data
- `conversations` table: Transcripts for intent and sentiment analysis
- `queues` table: Average wait times for opportunity detection

### Key Features
- **Production-ready**: All metrics calculated from real database queries
- **Proper fallbacks**: Only uses default values when no data exists (e.g., new tenants)
- **Time period isolation**: Non-overlapping boundaries for accurate period comparisons
- **Consistent calculations**: CSAT display and change values use same underlying data
- **NaN handling**: Proper null/undefined checks throughout

### Frontend Component
- Location: `client/src/pages/metrics-dashboard.tsx`
- Route: `/analytics` in App.tsx
- Features: Loading states, metric cards with trend indicators, sentiment charts, intentions breakdown, opportunities list
- Styling: Consistent with Gueswi design system using Tailwind CSS

The application follows a clean architecture pattern with proper separation of concerns, type safety throughout the stack, and scalable patterns for multi-tenant SaaS operations.