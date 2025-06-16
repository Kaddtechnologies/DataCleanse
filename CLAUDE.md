# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Standard Workflow
1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information.

## Project Overview

This is a Next.js 15.2.3 application for MDM (Master Data Management) data deduplication and cleansing with AI-powered analysis. The system integrates with Azure OpenAI (GPT 4.1-Nano) for intelligent duplicate detection confidence scoring.

## Essential Commands

### Development
- `npm run dev` - Start development server with auto-open browser (port 9003)
- `npm run dev:noopen` - Start development server without opening browser
- `npm run genkit:dev` - Start Google Genkit AI development server
- `npm run genkit:watch` - Start Genkit with file watching
- `npm run build` - Build production version
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Testing
- `npm run test:persistence` - Run all persistence tests
- `npm run test:session` - Run session persistence tests specifically
- `npm run test:bulk` - Run bulk action tests
- `npm run test:load` - Run session load tests

### Database Management
- `npm run db:setup` - Set up complete database from scratch (PostgreSQL + pgvector)
- `npm run db:start` - Start existing database containers
- `npm run db:stop` - Stop database containers
- `npm run db:reset` - Reset database and start fresh
- `./setup-database.sh` - Direct database setup script

### Custom Development Script
The project uses a custom dev script (`src/scripts/dev.js`) that automatically opens the browser to the correct port.

## Architecture Overview

### Core Data Flow
1. **File Upload** (`src/components/file-upload.tsx`) - Handles CSV/Excel uploads with file conflict detection
2. **Session Management** - PostgreSQL-based session persistence with conflict resolution
3. **Data Processing** - Sends to Python backend API for duplicate detection using multiple blocking strategies
4. **AI Analysis** (`src/ai/genkit.ts`) - Azure OpenAI integration for confidence scoring
5. **Interactive Review** (`src/components/card-review-modal.tsx`) - User interface for reviewing detected duplicates
6. **Data Export** (`src/components/data-export-actions.tsx`) - Export cleaned data and results
7. **Session Persistence** - Database storage for sessions, duplicate pairs, and user decisions

### Key TypeScript Interfaces (`src/types/index.ts`)
- `CustomerRecord` - Core data record with similarity scores and metadata
- `DuplicatePair` - Represents potential duplicates with AI analysis results

### AI Integration Architecture
- **Server-side only**: Genkit code uses dynamic requires to avoid client bundling
- **Azure OpenAI**: GPT 4.1-Nano model via Azure endpoint
- **Environment config**: `environment.ts` manages API endpoints and deployment settings
- **Smart caching**: AI analysis results cached to avoid repeated API calls

### Backend Integration
- Python FastAPI backend for duplicate detection algorithms
- Multiple blocking strategies: prefix, metaphone, soundex, n-gram
- Environment-based API URL switching (localhost:8000 dev, Azure prod)

### UI Components
- Built on Radix UI with Tailwind CSS
- TanStack Table for complex data grids (`src/components/interactive-data-grid.tsx`)
- shadcn/ui component patterns throughout
- Executive-grade design language for C-level presentation
- Smart search functionality for instant filtering

### Session Management System
- **Database Layer** (`src/lib/db.ts`) - PostgreSQL integration with session CRUD operations
- **Session Loading Dialog** (`src/components/session-loading-dialog.tsx`) - Active session management interface accessible via header
- **Session Manager** (`src/components/session-manager.tsx`) - Alternative full-featured session interface (currently not accessible in UI)
- **File Conflict Dialog** (`src/components/file-conflict-dialog.tsx`) - Handles filename conflicts with intelligent versioning
- **Session Persistence Hook** (`src/hooks/use-session-persistence.ts`) - React hook for database operations

## Environment Configuration

### Required Environment Variables
- `OPENAI_API_KEY` - Azure OpenAI API key for Genkit integration
- `NODE_ENV` - Determines API endpoint (production vs development)
- `DATABASE_URL` - PostgreSQL connection string for session persistence

### Database Setup
- PostgreSQL 16 with pgvector extension for semantic similarity
- Tables: sessions, duplicate_pairs, original_file_data
- Initialization scripts in `scripts/init-db.sql`
- Docker Compose configuration available (`docker-compose.yml`)

### Database Connection Information
- **Host**: localhost
- **Port**: 5433
- **Database**: mdm_dedup
- **Username**: mdm_user
- **Password**: mdm_password123

### Useful Database Commands
```bash
# Connect to database
docker exec -it mdm-postgres psql -U mdm_user -d mdm_dedup

# View logs
docker logs mdm-postgres

# Database health check
curl http://localhost:3000/api/health
```

### Azure OpenAI Settings (in environment.ts)
- Endpoint: `https://devoai.openai.azure.com`
- API Version: `2025-01-01-preview`
- Deployment: `dai-gpt-4.1-nano`

## Critical Development Notes

### Genkit Server-Side Pattern
Genkit AI functions MUST only run server-side due to Node.js dependencies. The code uses:
- Dynamic `require()` statements in server environments
- Client-side stubs that throw errors if accidentally accessed
- Environment checks (`typeof window === 'undefined'`)

### AI Analysis Flow
The AI confidence scoring uses a detailed prompt system with structured output expectations including confidence scores, reasoning, and recommendations for each duplicate pair.

### Smart Rules Engine
The system includes a comprehensive Smart Rules Engine (`src/ai/rules/smart-duplicate-rules.ts`) that applies business logic before and during AI analysis:
- **Critical Data Validation**: Applied first to check for missing/invalid names, addresses, etc.
- **Business Relationship Rules**: Joint ventures, acquisitions, parent/subsidiary detection
- **Geographic Rules**: Same address analysis, PO Box variations, adjacent locations
- **Entity Type Rules**: Contact vs customer, freight forwarder detection
- **Data Quality Rules**: Test data patterns, missing fields, invalid formats

The engine prevents meaningless comparisons (e.g., records with missing names) and provides detailed business justifications for decisions.

### Data Structure
Records flow through multiple similarity scoring phases (name, address, city, country, TPI) with enhanced AI analysis that can override or supplement algorithmic scores.

## Design and UI Guidelines

### Component Design Principles
- **Executive-Grade Design**: C-level enterprise application aesthetic (SAP/Salesforce-like)
- **Corporate Color Palette**: Slate-based gradients with blue/purple accents
- **Glass-morphism Effects**: Backdrop blur and sophisticated layering
- **Professional Typography**: Light font weights with proper tracking
- **Consistent Animation**: 300ms transitions throughout
- **Modal Behavior**: Background clicks disabled for critical dialogs

### Key Design Components
- **Header** (`src/components/layout/header.tsx`) - Executive gradient header with smart session management
- **Dialogs** - All dialogs use corporate design language with proper header/body/footer structure
- **Cards** - Uniform card layouts with gradient headers and structured content areas
- **Interactive Grid** (`src/components/interactive-data-grid.tsx`) - Smart search with instant filtering

### Recent Enhancements
- Disabled background click-to-close for session dialogs
- Restructured file conflict dialog with proper Card components (header, body, footer)
- Uniform background colors across dialog card bodies
- Smart search functionality with multi-term support and special character handling

## Runtime Access Points

### Session Management Access
- **Primary Method**: "Sessions" button in header (appears when sessions exist)
- **Component**: `SessionLoadingDialog` provides full session management interface
- **Alternative**: `SessionManager` component exists but is not currently accessible in UI
- **File Conflicts**: Automatic detection and resolution during file upload

### Session Recovery Guide
To continue previous work:
1. Click "Sessions" button in header (appears when sessions exist)
2. Select a previous session from the list
3. All duplicate pairs and decisions will be restored
4. Continue where you left off with full progress tracking

### Session API Endpoints
- `POST /api/sessions/create` - Create new session
- `GET /api/sessions/list` - List user sessions
- `GET /api/sessions/[sessionId]/load` - Load session data
- `PUT /api/duplicate-pairs/[pairId]/update` - Update pair status

## Development Best Practices

### Build Requirements
- Always run `npm run build` after every task and fix any errors that occur
- No task is complete until the app builds successfully
- Run `npm run typecheck` to catch TypeScript errors early

### Code Quality
- Use the existing Smart Rules Engine patterns when adding new business logic
- Follow the server-side only pattern for Genkit AI functions
- Maintain the executive-grade UI design patterns throughout
- Test critical data validation scenarios when working with duplicate detection logic

### Architecture Patterns
- **Server-Side AI**: All Genkit functions must use dynamic requires and server-side checks
- **Smart Rules First**: Critical data validation rules are applied before business rules
- **Session Persistence**: All user actions should be saved to PostgreSQL for recovery
- **Component Consistency**: Follow shadcn/ui and Radix UI patterns for new components