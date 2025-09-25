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
- **Analytics Platform** - Mock data structure prepared for call analytics and AI metrics

The application follows a clean architecture pattern with proper separation of concerns, type safety throughout the stack, and scalable patterns for multi-tenant SaaS operations.