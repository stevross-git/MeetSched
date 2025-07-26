# AI Book Me - Smart Scheduling Assistant

## Overview

AI Book Me is a natural language-powered scheduling application that allows users to create bookings and appointments using conversational commands like "Book me a meeting with Sam next week" or "Schedule dinner with Alex and Emma next weekend." The application uses AI to parse user intent, check availability, and automatically create calendar events.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Contacts**: User's frequently contacted people with status tracking (online/offline/busy)
- **Bookings**: Calendar events with scheduling details, participants, and status
- **Chat Messages**: Conversation history between user and AI assistant
- **User Preferences**: Customizable settings and AI behavior preferences

### AI Processing Pipeline
- **Intent Parsing**: Extracts booking details from natural language using OpenAI GPT-4o
- **Time Slot Generation**: Suggests available meeting times based on existing bookings
- **Conflict Detection**: Checks for scheduling conflicts and suggests alternatives

### UI Components
- **Chat Interface**: Real-time conversation with AI for booking requests
- **Calendar Widget**: Visual calendar display with event indicators
- **Today's Schedule**: Quick overview of daily appointments
- **Contacts Widget**: Frequently contacted people with status indicators

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