# AI Book Me 🤖📅

![Build Status](https://img.shields.io/github/actions/workflow/status/yourusername/MeetSched/main.yml?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/github/license/yourusername/MeetSched?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)

**AI Book Me** is an intelligent scheduling application that transforms natural language into calendar bookings. Simply type "Book me a meeting with Sam next week" and let AI handle the rest – from parsing your intent to finding the perfect time slot.

[🚀 Live Demo](https://demo.example.com) | [📖 Documentation](https://docs.example.com) | [🐛 Report Bug](https://github.com/yourusername/MeetSched/issues) | [💡 Request Feature](https://github.com/yourusername/MeetSched/issues)

## 📸 Screenshots

<div align="center">
  <img src="./screenshots/dashboard.png" alt="AI Book Me Dashboard" width="48%">
  <img src="./screenshots/chat-interface.png" alt="Natural Language Booking" width="48%">
</div>

<div align="center">
  <img src="./screenshots/calendar-view.png" alt="Calendar Integration" width="48%">
  <img src="./screenshots/mobile-responsive.png" alt="Mobile View" width="48%">
</div>

## ✨ Features

### Core Capabilities
- 🗣️ **Natural Language Processing** - Book meetings using everyday language like "Schedule a call with the team tomorrow at 2pm"
- 🤖 **AI-Powered Intent Recognition** - GPT-4o understands complex scheduling requests and suggests optimal time slots
- 📅 **Universal Calendar Sync** - Seamless integration with Microsoft Outlook and Google Calendar
- 🔐 **Privacy-First Design** - Toggle privacy mode to hide sensitive booking information
- 👥 **Multi-User Support** - Comprehensive authentication with JWT-based sessions
- 📱 **Responsive Interface** - Beautiful experience across desktop, tablet, and mobile devices

### Advanced Features
- 💬 **Real-Time Chat Interface** - Interactive booking confirmations with instant feedback
- 📊 **Smart Time Suggestions** - AI analyzes calendars to recommend the best meeting times
- 👤 **Contact Management** - Import and sync contacts from Office integrations
- 📈 **Today's Schedule Widget** - At-a-glance view of your daily appointments
- 🎨 **Modern UI Components** - Built with Shadcn/ui for a polished, professional look
- ⚡ **Lightning Performance** - Optimized with Vite and TanStack Query for instant responses

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for lightning-fast HMR
- **UI Library**: Shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios with interceptors

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **API Design**: RESTful architecture
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod schemas

### AI & Integrations
- **NLP Engine**: OpenAI GPT-4o
- **Calendar APIs**: Microsoft Graph & Google Calendar
- **Database**: PostgreSQL with Drizzle ORM
- **Cloud Database**: Neon Database
- **Type Safety**: Shared TypeScript schemas

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.0 or higher
- npm 9.0 or higher
- PostgreSQL 14.0 or higher (or Neon Database account)
- Git

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/MeetSched.git
cd MeetSched
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aibookme

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Server
NODE_ENV=development
PORT=3000

# Frontend URL
CLIENT_URL=http://localhost:5173

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key

# OAuth (Optional)
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4. Database Setup
```bash
# Push database schema
npm run db:push

# Run migrations (if any)
npm run db:migrate

# Seed with sample data (optional)
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 📖 Usage

### Natural Language Commands

AI Book Me understands a variety of booking requests:

```
"Book me a meeting with Sam next Tuesday at 3pm"
"Schedule a 30-minute call with the marketing team tomorrow"
"Find time for a project review with Alex next week"
"Set up a recurring weekly standup on Mondays at 9am"
"Cancel my 2pm meeting today"
"Show me my schedule for tomorrow"
```

### Basic Workflow

1. **Sign Up/Login**: Create an account or login with existing credentials
2. **Connect Calendar**: Link your Microsoft or Google calendar
3. **Start Booking**: Type your request in natural language
4. **Confirm Details**: Review AI suggestions and confirm
5. **Done!**: Meeting appears in all connected calendars

### Advanced Usage

<details>
<summary>Privacy Mode</summary>

Enable privacy mode to hide meeting details:
```javascript
// In settings
{
  "privacyMode": true,
  "hiddenFields": ["title", "attendees", "location"]
}
```
</details>

<details>
<summary>Bulk Booking</summary>

Create multiple bookings at once:
```
"Schedule individual 1-on-1s with Sarah, Mike, and Lisa next week, 30 minutes each"
```
</details>

## 🔌 API Documentation

### Authentication
All API endpoints require authentication via Bearer token:
```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Core Endpoints

#### Bookings
```http
POST   /api/bookings/parse     # Parse natural language input
POST   /api/bookings/create    # Create a booking
GET    /api/bookings           # List user bookings
PUT    /api/bookings/:id       # Update booking
DELETE /api/bookings/:id       # Cancel booking
```

#### Calendar Integration
```http
GET    /api/calendar/availability   # Check availability
POST   /api/calendar/sync          # Sync with external calendar
GET    /api/calendar/events        # Get calendar events
```

#### Users
```http
POST   /api/auth/register      # Register new user
POST   /api/auth/login         # Login
POST   /api/auth/refresh       # Refresh token
GET    /api/users/profile      # Get user profile
PUT    /api/users/profile      # Update profile
```

### Example Request
```bash
curl -X POST https://api.aibookme.com/api/bookings/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Book me a meeting with Sam tomorrow at 2pm",
    "timezone": "America/New_York"
  }'
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | - | ✅ |
| `NODE_ENV` | Environment (development/production) | development | ✅ |
| `JWT_SECRET` | Secret key for JWT signing | - | ✅ |
| `PORT` | Backend server port | 3000 | ❌ |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:5173 | ❌ |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID | - | ❌ |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret | - | ❌ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | ❌ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - | ❌ |

### Database Schema

The application uses Drizzle ORM with the following main tables:
- `users` - User accounts and profiles
- `bookings` - Meeting bookings
- `calendars` - Connected calendar accounts
- `contacts` - User contacts
- `sessions` - Active user sessions

## 🚢 Deployment

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

### Docker Deployment

```dockerfile
# Dockerfile included in repository
docker build -t aibookme .
docker run -p 3000:3000 --env-file .env aibookme
```

### Platform-Specific Deployment

<details>
<summary>Deploy to Vercel</summary>

```bash
# Frontend deployment
cd frontend
vercel --prod

# Backend requires Vercel Functions setup
```
</details>

<details>
<summary>Deploy to Railway</summary>

```bash
# Connect to Railway
railway login
railway link

# Deploy
railway up
```
</details>

<details>
<summary>Deploy to Heroku</summary>

```bash
# Create Heroku app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main
```
</details>

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend"
        A[React + TypeScript]
        B[Shadcn/ui Components]
        C[TanStack Query]
    end
    
    subgraph "Backend"
        D[Express Server]
        E[JWT Auth]
        F[API Routes]
    end
    
    subgraph "AI Layer"
        G[OpenAI GPT-4o]
        H[Intent Parser]
        I[Time Slot Analyzer]
    end
    
    subgraph "Data Layer"
        J[PostgreSQL]
        K[Drizzle ORM]
        L[Neon Database]
    end
    
    subgraph "External Services"
        M[Microsoft Graph API]
        N[Google Calendar API]
    end
    
    A --> D
    D --> G
    D --> J
    D --> M
    D --> N
    G --> H
    G --> I
    J --> K
    K --> L
```

## 🐛 Troubleshooting

### Common Issues

<details>
<summary>Database Connection Failed</summary>

**Error**: `ECONNREFUSED` or `connection timeout`

**Solution**:
1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
3. For Neon, ensure you're using the pooled connection string
</details>

<details>
<summary>OpenAI API Errors</summary>

**Error**: `401 Unauthorized` or rate limit errors

**Solution**:
1. Verify API key is correct and has GPT-4 access
2. Check usage limits in OpenAI dashboard
3. Implement retry logic for rate limits
</details>

<details>
<summary>Calendar Sync Issues</summary>

**Error**: Calendar events not syncing

**Solution**:
1. Re-authenticate calendar connection
2. Check OAuth token expiration
3. Verify calendar permissions include read/write access
</details>

### Debug Mode

Enable detailed logging:
```bash
# Set in .env
DEBUG=aibookme:*
LOG_LEVEL=debug
```

## 🤝 Contributing

We love contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Quick Start
1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Write tests for new features
- Follow existing code style (ESLint + Prettier)
- Update documentation as needed
- Add yourself to contributors list

## 🗺️ Roadmap

### Version 1.1 (Q1 2025)
- [ ] Team scheduling with multiple attendees
- [ ] Zoom/Teams integration
- [ ] Email notifications
- [ ] Mobile apps (iOS/Android)

### Version 1.2 (Q2 2025)
- [ ] Advanced AI scheduling preferences
- [ ] Meeting templates
- [ ] Analytics dashboard
- [ ] Webhook support

### Future Enhancements
- [ ] Voice input support
- [ ] Multi-language support
- [ ] AI meeting summaries
- [ ] Calendar insights and optimization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com) for GPT-4o API
- [Shadcn](https://ui.shadcn.com) for beautiful UI components
- [Drizzle Team](https://orm.drizzle.team) for the excellent ORM
- [Neon](https://neon.tech) for serverless PostgreSQL
- All our [contributors](https://github.com/yourusername/MeetSched/graphs/contributors) who make this project possible

---

<div align="center">
  Made with ❤️ by the AI Book Me Team
  
  <a href="https://twitter.com/aibookme">Twitter</a> •
  <a href="https://discord.gg/aibookme">Discord</a> •
  <a href="https://blog.aibookme.com">Blog</a>
</div>