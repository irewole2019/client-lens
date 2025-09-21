# Overview

Client Lens is a full-stack project file management application that allows users to organize and manage their project files. Users can create projects and upload various file types (images, videos, PDFs, and other documents) with features like file preview, organization, and cloud storage integration. The application provides a clean, responsive interface for managing digital assets across different projects.

## Recent Updates (August 2, 2025)
- **Enhanced Dashboard with Comment Analytics**: Implemented comprehensive comment statistics and notification system
  - Added projectViews table for tracking user activity and notification badges
  - Real-time comment counters showing total comments and unresolved items per project
  - "New" notification badges that appear when comments are added since last project view
  - Last comment timestamps with relative time formatting using date-fns
  - Automatic view tracking that clears notifications when projects are opened
- **Click-to-Comment System**: Fully operational positioned commenting on images with coordinate tracking
- **Public Project Sharing**: Complete sharing functionality with unique shareable links
- **Object Storage Integration**: Seamless file serving through Google Cloud Storage with proper ACL policies

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with CSS variables for theming support (light/dark modes)
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **File Upload**: Uppy for advanced file upload capabilities with dashboard UI and AWS S3 integration

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL as the target database
- **Object Storage**: Google Cloud Storage with Replit sidecar integration for file storage
- **Development**: Hot reloading with Vite dev server integration
- **Build**: ESBuild for server bundling, Vite for client bundling

## Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database serverless connection with comprehensive schema
  - Core tables: users, projects, files, comments for main functionality
  - projectViews table for user activity tracking and notification management
  - Comment threading support with parentId relationships and status tags
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Object Storage**: Google Cloud Storage for file assets with custom ACL policies
- **Comment Analytics**: Real-time aggregation of comment statistics per project

## Authentication and Authorization
- **File Access Control**: Custom ACL (Access Control List) system with object-level permissions
- **User Management**: Basic user system with hardcoded development user
- **Object Security**: Public and private object serving with path-based access control

## External Dependencies
- **Database**: Neon Database (PostgreSQL serverless)
- **Object Storage**: Google Cloud Storage with Replit sidecar authentication
- **File Upload**: Uppy with AWS S3 compatibility for direct-to-cloud uploads
- **UI Components**: Radix UI primitives for accessible component foundation
- **Development Tools**: Replit integration with development banner and cartographer plugin

## Key Architectural Decisions

### Monorepo Structure
- **Rationale**: Keeps client, server, and shared code in a single repository for easier development and deployment
- **Implementation**: Separate `client/`, `server/`, and `shared/` directories with TypeScript path mapping
- **Benefits**: Shared types and schemas, simplified deployment, consistent tooling

### Object Storage Strategy
- **Choice**: Google Cloud Storage over traditional file systems
- **Rationale**: Scalable, reliable, and integrates with Replit's infrastructure
- **Features**: Custom ACL policies, public/private object serving, presigned upload URLs

### Database Architecture
- **ORM Choice**: Drizzle over Prisma for better TypeScript integration and performance
- **Connection**: Neon Database for serverless PostgreSQL with connection pooling
- **Schema**: Comprehensive relational design with users, projects, files, comments, and projectViews tables
- **Comment System**: Advanced threading with position tracking for images, timestamps for videos, and page numbers for PDFs
- **Analytics Layer**: Efficient comment statistics aggregation with unresolved filtering and view tracking
- **Public Sharing**: Projects include both internal ID and publicId for secure sharing without exposing database structure

### File Upload Flow
- **Strategy**: Direct-to-cloud uploads using presigned URLs
- **Benefits**: Reduces server load, improves upload performance, enables resumable uploads
- **Implementation**: Uppy handles client-side upload logic, server provides upload URLs and metadata storage