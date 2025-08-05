# FreelanceHub Platform

## Overview

FreelanceHub is a comprehensive online platform that connects clients with freelancers for secure project collaboration. The platform features an escrow payment system, comprehensive messaging, bid management, reviews, and dispute resolution. Built as a full-stack web application with a React frontend and Express backend, it provides separate interfaces for clients and freelancers with role-based functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints with role-based access control
- **Session Management**: Express sessions with PostgreSQL storage
- **Real-time Features**: Planned WebSocket integration for notifications

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema definitions
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Data Models**: 
  - Users with role-based access (client/freelancer)
  - Tasks with status tracking and bidding system
  - Messages for task-based communication
  - Payments with escrow functionality
  - Reviews and ratings system
  - Dispute resolution system

### Authentication & Authorization
- **Provider**: Replit Auth with OpenID Connect
- **Strategy**: Passport.js with JWT token management
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role Management**: User roles determine UI and API access patterns

### Component Architecture
- **Layout Components**: Responsive sidebar navigation with role-specific menus
- **Feature Components**: Task cards, bid management, chat interface, rating systems
- **UI Components**: Reusable design system components with consistent styling
- **Form Components**: Validated forms for task creation, bidding, and messaging

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management and caching
- **express**: Backend web framework
- **passport**: Authentication middleware

### UI and Styling
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Tools
- **vite**: Frontend build tool and dev server
- **typescript**: Type checking and development experience
- **@replit/vite-plugin-***: Replit-specific development enhancements

### Third-party Services
- **Replit Authentication**: User authentication and session management
- **Neon Database**: Serverless PostgreSQL hosting
- **WebSocket**: Planned for real-time notifications and messaging