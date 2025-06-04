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
1. **File Upload** (`src/components/file-upload.tsx`) - Handles CSV/Excel uploads
2. **Data Processing** - Sends to Python backend API for duplicate detection using multiple blocking strategies
3. **AI Analysis** (`src/ai/genkit.ts`) - Azure OpenAI integration for confidence scoring
4. **Interactive Review** (`src/components/card-review-modal.tsx`) - User interface for reviewing detected duplicates
5. **Data Export** (`src/components/data-export-actions.tsx`) - Export cleaned data and results

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
- TanStack Table for complex data grids
- shadcn/ui component patterns throughout

## Environment Configuration

### Required Environment Variables
- `OPENAI_API_KEY` - Azure OpenAI API key for Genkit integration
- `NODE_ENV` - Determines API endpoint (production vs development)

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