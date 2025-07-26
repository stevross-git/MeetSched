# AI Book Me - Smart Scheduling Assistant

## Overview

AI Book Me is a natural language-powered scheduling application that allows users to create bookings and appointments using conversational commands like "Book me a meeting with Sam next week" or "Schedule dinner with Alex and Emma next weekend." The application uses AI to parse user intent, check availability, and automatically create calendar events.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**2025-07-26**: Successfully implemented user authentication and office connections
- Added complete authentication system with JWT tokens and session management
- Created user login/logout interface with profile management
- Implemented office connection service for Microsoft Graph and Google Calendar
- Added privacy mode toggle for users to hide their bookings
- Updated all API endpoints to support multi-user context and data isolation
- Created comprehensive storage layer supporting users, sessions, and office connections
- Enhanced UI with login dialog, user menu, and connection status indicators
- **MAJOR FEATURE**: Full multi-user support with secure authentication and office integration

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for development and build tooling
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with CSS variables for theming support (light/dark modes)

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **AI Integration**: OpenAI GPT-4o for natural language processing and booking intent parsing
- **Session Management**: Express sessions with PostgreSQL session store

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Fallback**: In-memory storage implementation for development/testing

## Key Components

### Core Data Models
- **Users**: Authenticated user accounts with profile information and office connection status
- **User Sessions**: JWT-based authentication tokens with expiration management
- **Contacts**: User's frequently contacted people with privacy controls and office integration
- **Bookings**: Calendar events with user ownership, privacy settings, and office synchronization
- **Chat Messages**: User-specific conversation history with AI assistant
- **User Preferences**: Customizable settings including privacy mode and AI behavior

### AI Processing Pipeline
- **Intent Parsing**: Extracts booking details from natural language using OpenAI GPT-4o
- **Time Slot Generation**: Suggests available meeting times based on existing bookings
- **Conflict Detection**: Checks for scheduling conflicts and suggests alternatives

### UI Components
- **Authentication System**: Login dialog and user menu with profile management
- **Chat Interface**: User-specific conversation with AI for booking requests
- **Calendar Widget**: Personal calendar display with privacy controls
- **Today's Schedule**: User's daily appointments with office connection sync
- **Contacts Widget**: Personal contacts with privacy and office integration
- **Office Connection**: Microsoft Graph and Google Calendar integration interface

## Data Flow

1. **User Input**: Natural language booking request entered in chat interface
2. **AI Processing**: OpenAI API parses intent and extracts structured booking data
3. **Availability Check**: System queries existing bookings for conflicts
4. **Time Suggestions**: AI generates optimal time slot recommendations
5. **User Confirmation**: Suggested bookings presented for user approval
6. **Booking Creation**: Confirmed bookings saved to database and displayed in calendar

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **openai**: Official OpenAI API client for GPT-4o integration
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Headless UI component primitives

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React application to `dist/public`
- **Backend**: ESBuild bundles Node.js server to `dist/index.js`
- **Database**: Drizzle Kit manages schema migrations

### Environment Configuration
- **Development**: `npm run dev` - Concurrent frontend and backend development
- **Production**: `npm run build && npm start` - Optimized production build
- **Database**: `npm run db:push` - Apply schema changes to database

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication key
- `NODE_ENV`: Environment mode (development/production)

The application is designed as a monorepo with shared TypeScript schemas between frontend and backend, ensuring type safety across the entire application stack. The architecture supports both development flexibility and production scalability through its modular component design and external service integrations.