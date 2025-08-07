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
- **Admin Security**: IP-based restrictions for admin panel access with enhanced security middleware

### Component Architecture
- **Layout Components**: Responsive sidebar navigation with role-specific menus
- **Admin Components**: Complete admin panel with dashboard, user management, task oversight, dispute resolution, and analytics
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

## Recent Updates (August 2025)

### Admin Panel Implementation ✅
- **Complete Admin Interface**: Fully functional admin panel accessible at root `/` for admin users
- **Navigation System**: Fixed routing issues, proper active state management for admin sidebar
- **Security Enhancements**: Added IP restrictions and enhanced middleware for admin access
- **Admin Features**:
  - Dashboard with platform statistics and key metrics
  - User management with search, role filtering, and block/unblock functionality
  - Task oversight with full project visibility
  - Dispute resolution system with moderation capabilities
  - Comprehensive analytics and reporting
- **TypeScript Safety**: Implemented safe typecasting for API data with proper error handling
- **Real Data Integration**: All admin features work with authentic database data, no mock data used

### Moderator Role Implementation ✅ (August 2025)
- **Role-based Access Control**: Added moderator role with limited admin privileges
- **Dispute Resolution**: Moderators can view admin information and resolve disputes
- **Permission Restrictions**: Moderators cannot manage users or assign roles
- **Security Middleware**: Added isModerator middleware with IP restrictions
- **Database Updates**: Updated user schema to support moderator role

### Date Validation System ✅ (August 2025)  
- **Client-side Validation**: Added date input restrictions preventing past dates
- **Server-side Validation**: Implemented Zod schema validation for deadlines
- **Error Handling**: Proper error messages for invalid date submissions
- **Task Creation**: Enhanced task creation with deadline validation
- **Bid System**: Added deadline validation for freelancer bids