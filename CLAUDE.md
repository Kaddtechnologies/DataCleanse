# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- PostgreSQL database with tables for sessions, duplicate_pairs, and original_file_data
- Initialization scripts in `scripts/init-db.sql`
- Docker Compose configuration available (`docker-compose.yml`)

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