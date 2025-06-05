# MDM Master Data Cleanse

A sophisticated data deduplication and cleansing system built with Next.js and AI-powered analysis. This application helps organizations identify, review, and merge duplicate records in their master data management (MDM) processes with persistent session storage using PostgreSQL and pgvector.

## Purpose

This project addresses the critical challenge of maintaining clean, deduplicated master data across organizations. It provides:

- **Intelligent Duplicate Detection**: Multiple algorithmic strategies for finding potential duplicate records
- **AI-Powered Analysis**: Leverages Google Gemini AI to assess duplicate confidence and provide reasoning
- **Interactive Review Interface**: User-friendly card-based interface for reviewing and managing duplicates
- **Flexible Data Import**: Support for CSV and Excel file uploads with customizable column mapping
- **Export Capabilities**: Export cleaned data and analysis results
- **Session Persistence**: Save and restore work sessions with full progress tracking
- **Vector Similarity**: PostgreSQL with pgvector for semantic similarity matching

## How It Works

### 1. Data Upload & Processing
Users upload CSV or Excel files through the drag-and-drop interface (`src/components/file-upload.tsx`). The application processes the data and displays it in an interactive grid (`src/components/interactive-data-grid.tsx`).

### 2. Duplicate Detection
The system employs multiple blocking strategies to efficiently identify potential duplicates:
- **Prefix Blocking**: Groups records by first characters of name and city
- **Metaphone Blocking**: Uses phonetic encoding for company names
- **Soundex Blocking**: Alternative phonetic matching algorithm
- **N-gram Blocking**: Character-based similarity grouping

### 3. AI Analysis
For enhanced accuracy, the system integrates with Azure OpenAI (`src/ai/genkit.ts`) to:
- Evaluate the likelihood that two records represent the same entity
- Provide detailed reasoning for confidence assessments
- Score matches on a scale from very low to very high confidence

### 4. Interactive Review
The card-based review interface (`src/components/card-review-modal.tsx`) allows users to:
- View side-by-side record comparisons
- See AI confidence scores and reasoning
- Make decisions to merge, skip, or mark as not duplicates
- Navigate through all detected duplicate pairs

### 5. Session Persistence
All work is automatically saved to a PostgreSQL database:
- Session management with progress tracking
- Duplicate pair storage with decision history
- Configuration and file upload tracking
- Audit trail for all user decisions

### 6. Data Export
Users can export their cleaned data and analysis results through the export functionality (`src/components/data-export-actions.tsx`).

## Key Features

- **Real-time Processing**: Immediate duplicate detection as data is uploaded
- **Multiple Detection Strategies**: Configurable algorithms for different data types
- **AI-Enhanced Accuracy**: Azure OpenAI integration for intelligent duplicate assessment
- **Session Persistence**: Never lose work with automatic database storage
- **Vector Similarity**: Semantic matching using PostgreSQL pgvector
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Type-Safe Development**: Full TypeScript implementation with comprehensive interfaces
- **Modern UI Components**: Built with Radix UI and styled with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 15.2.3 with App Router
- **Database**: PostgreSQL 16 with pgvector extension
- **Caching**: Redis (optional)
- **UI Framework**: Radix UI components with Tailwind CSS
- **AI Integration**: Azure OpenAI with GPT 4.1-Nano
- **Data Handling**: TanStack Table for complex data grids
- **Type Safety**: Comprehensive TypeScript interfaces (`src/types/index.ts`)
- **State Management**: React hooks with database persistence
- **Container**: Docker and Docker Compose for local development

## Quick Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- npm or yarn package manager

### 1. Clone and Install
```bash
git clone <repository-url>
cd "MDM Master Data Cleanse"
npm install
```

### 2. Database Setup
```bash
# Run the automated setup script
npm run db:setup

# Or manually:
./setup-database.sh
```

This script will:
- Set up PostgreSQL 16 with pgvector in Docker
- Create all required database tables and indexes
- Configure Redis for caching
- Generate environment configuration files
- Verify the complete setup

### 3. Environment Configuration
The setup script creates `.env.local` with database configuration. Update API keys:
```env
OPENAI_API_KEY=your_azure_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

### 4. Start the Application
```bash
npm run dev
```

The application will be available at: http://localhost:3000

## Development Commands

- `npm run dev` - Start development server with auto-open
- `npm run db:setup` - Set up complete database from scratch
- `npm run db:start` - Start existing database containers
- `npm run db:stop` - Stop database containers
- `npm run db:reset` - Reset database and start fresh
- `npm run build` - Build production version
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Database Management

### Connection Information
- **Host**: localhost
- **Port**: 5432
- **Database**: mdm_dedup
- **Username**: mdm_user
- **Password**: mdm_password123

### Useful Commands
```bash
# Connect to database
docker exec -it mdm-postgres psql -U mdm_user -d mdm_dedup

# View logs
docker logs mdm-postgres

# Database health check
curl http://localhost:3000/api/health
```

## Session Persistence Features

### Automatic Saving
- File upload sessions are automatically saved
- All user decisions are tracked in real-time
- Progress is preserved across browser sessions
- Configuration settings are stored per session

### Session Management
- List and restore previous sessions
- Track processing progress
- Audit trail of all decisions
- Configurable session cleanup

### API Endpoints
- `POST /api/sessions/create` - Create new session
- `GET /api/sessions/list` - List user sessions
- `GET /api/sessions/[id]/load` - Load session data
- `PUT /api/duplicate-pairs/[id]/update` - Update pair status

## Getting Started Guide

1. **Upload Data**: Upload CSV or Excel file using the drag-and-drop interface
2. **Configure Processing**: Select blocking strategies and similarity thresholds
3. **Map Columns**: Map your data columns to logical fields (customer name is required)
4. **Start Processing**: Click "Start Deduplication" to begin analysis
5. **Review Results**: Use the interactive data grid to browse potential duplicates
6. **Make Decisions**: Click "Review" on any pair to see detailed comparison
7. **Export Results**: Export your cleaned data and decision reports

## Session Recovery

If you need to continue previous work:
1. Go to the Sessions page (link in header when available)
2. Select a previous session from the list
3. All your duplicate pairs and decisions will be restored
4. Continue where you left off

## Contributing

1. Ensure Docker is running
2. Run `npm run db:setup` for database setup
3. Start development with `npm run dev`
4. Make your changes
5. Run `npm run typecheck` and `npm run lint`
6. Test with sample data files

## Support

- Database setup issues: Check Docker is running and ports are available
- API key configuration: Update `.env.local` with valid API keys
- Performance issues: Reduce blocking strategies for large files
- Session issues: Check database health at `/api/health`

This application serves as a comprehensive solution for organizations looking to maintain high-quality master data through intelligent deduplication and AI-assisted decision making with full session persistence and recovery capabilities.