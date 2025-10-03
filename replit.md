# Overview

Gueswi is a SaaS virtual PBX (centralita virtual) with AI integration, offering intelligent call management, IVR automation, extension management, and analytics for businesses. It's built as a full-stack application with a modern React frontend (TypeScript, Tailwind CSS), an Express.js backend (TypeScript, PostgreSQL via Drizzle ORM), and robust payment integrations for subscription management. The platform aims to provide a comprehensive, scalable solution for business communication needs, featuring a multi-tenant architecture and advanced analytics capabilities, including a CRM system and AI-driven metrics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
-   **Technology Stack**: React 18 with TypeScript, Vite, Tailwind CSS, shadcn/ui.
-   **State Management & Routing**: TanStack Query for server state, Wouter for routing, React Hook Form + Zod for forms.
-   **Design System**: Custom Gueswi Design System based on shadcn/ui, Onest Font, responsive and accessible components.
-   **Key Features**: Kanban-style Pipeline CRM with drag-and-drop, advanced analytics dashboard, multi-pipeline support.

## Backend
-   **Technology Stack**: Express.js with TypeScript.
-   **Authentication**: Passport.js (local strategy) with Express Session (PostgreSQL store), scrypt for password encryption.
-   **Authorization**: Role-based access control (owner, admin, user) and protected routes.
-   **File Handling**: Multer for file uploads (e.g., bank transfer receipts).
-   **Security**: CORS configured.
-   **Key Features**: REST API endpoints, multi-tenant data isolation, CRM backend with stages, leads, activities, and metrics.

## Database
-   **Technology**: PostgreSQL (Neon), Drizzle ORM for type-safe interactions.
-   **Schema**: Multi-tenant design with tables for users, tenants, extensions, bank transfers, call records, AI metrics, pipelines, pipeline stages, leads, and lead activities.
-   **Management**: Drizzle Kit for database migrations.

## Core Features
-   **Multi-tenancy**: Isolated data access for each tenant.
-   **Payment Processing**: Integration with Stripe and PayPal for subscriptions, and manual bank transfer processing with admin approval.
-   **Pipeline CRM**: Kanban board, lead management, stage reordering, activity tracking, and real-time metrics (Total Value, Conversion Rate, Avg Closing Days). Supports multiple independent pipelines per tenant with:
    -   Auto-creation of default pipeline ("Pipeline Principal") if none exist
    -   Automatic fallback to default pipeline when active pipeline is deleted
    -   Complete data isolation between pipelines (stages, leads, metrics)
    -   Mutation pipelineId snapshotting to prevent cache invalidation issues
    -   Full CRUD operations for pipelines with inline editing
-   **Advanced Analytics**: Dashboard with AI-driven metrics like ROI Savings, Hours Saved, CSAT Score, Churn Risk, Intent Detection, and Sentiment Analysis.
-   **Calendar & Booking System**: Comprehensive appointment scheduling with service management, staff availability, location management, and public booking widget. Features include:
    -   Hierarchical location-based operating hours validation
    -   Flexible staff schedules within location ranges (staff can work subset hours, e.g., location 9-17, staff 10-12)
    -   Business hours enforcement with visual feedback and drag-drop prevention
    -   Cascade selection flow (Location → Service → Staff) with real-time filtering
    -   Backend validation for appointment time slots against both location and staff availability
    -   View-conditional drag-drop validation: Month view allows all-day moves, Week/Day views enforce business hours
    -   shadcn AlertDialog confirmations for all delete operations (Services, Staff, Locations) instead of native browser confirm()
    -   Smart date pre-selection: Clicking calendar dates pre-fills appointment dialog with selected datetime
    -   DELETE endpoints with proper relation cleanup (serviceLocations, staffServices) to maintain referential integrity
-   **Development Practices**: Monorepo structure, path mapping, environment configurations, robust build processes, clean architecture.

# External Dependencies

## Payment Services
-   **Stripe**: For credit card payments and subscription management.
-   **PayPal**: Alternative payment gateway.

## Database & Infrastructure
-   **Neon Database**: Serverless PostgreSQL hosting.

## Authentication & Security
-   **Express Session Store**: PostgreSQL-backed session storage.
-   **Node.js `crypto` module**: For password hashing.

## UI & Styling
-   **Google Fonts**: Onest font for typography.
-   **Radix UI Primitives**: Accessible component building blocks.
-   **Lucide React**: Icon library.

## Development Tools
-   **Drizzle Kit**: ORM migrations and introspection.

## Prepared Integrations (Future)
-   **AI Agent Infrastructure**: Endpoints for STT/TTS/LLM.
-   **File Storage**: Local file system for uploaded documents.
-   **Analytics Platform**: Advanced metrics dashboard (already integrated with the system architecture, but depends on external data sources).