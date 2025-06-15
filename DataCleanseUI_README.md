# MDM Master Data Cleanse

A sophisticated enterprise-grade data deduplication and cleansing system built with Next.js 15.2.3 and powered by advanced AI analysis. This application helps organizations identify, review, and merge duplicate records in their master data management (MDM) processes with intelligent AI-driven confidence scoring and comprehensive session persistence.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Data Processing Pipeline](#data-processing-pipeline)
- [AI Integration](#ai-integration)
- [User Interface](#user-interface)
- [API Endpoints](#api-endpoints)
- [Session Management](#session-management)
- [Export Capabilities](#export-capabilities)
- [Business Rules Engine](#business-rules-engine)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Performance Considerations](#performance-considerations)
- [Security Features](#security-features)
- [Development Guide](#development-guide)

## Overview

The MDM Master Data Cleanse application is a comprehensive solution designed to address the critical challenge of maintaining clean, deduplicated master data across enterprise organizations. It combines sophisticated algorithmic duplicate detection with AI-powered analysis using Azure OpenAI's GPT 4.1-Nano model to provide accurate, context-aware duplicate identification and intelligent recommendations.

### Key Business Value

- **Data Quality Improvement**: Automatically identify and resolve duplicate customer records
- **Operational Efficiency**: Reduce manual data cleansing effort by up to 80%
- **Compliance & Accuracy**: Maintain audit trails for all deduplication decisions
- **Business Intelligence**: Leverage AI to understand complex business relationships
- **Cost Reduction**: Minimize errors from duplicate data in business operations

## Core Features

### 1. Intelligent Duplicate Detection
- **Multiple Blocking Strategies**: 
  - Prefix Blocking: Groups records by first characters of name and city
  - Metaphone Blocking: Phonetic encoding for company name variations
  - Soundex Blocking: Alternative phonetic matching algorithm
  - N-gram Blocking: Character-based similarity grouping
- **Similarity Scoring**: Advanced multi-field scoring including name, address, city, country, and TPI
- **Configurable Thresholds**: Fine-tune detection sensitivity per business requirements

### 2. AI-Powered Analysis
- **Azure OpenAI Integration**: GPT 4.1-Nano model for intelligent duplicate assessment
- **Smart Business Rules Engine**: 450+ lines of configurable business rules
- **Contextual Understanding**: Recognizes joint ventures, subsidiaries, divisions, and legitimate business relationships
- **Confidence Scoring**: High/Medium/Low confidence with detailed reasoning
- **Caching System**: Intelligent caching to avoid repeated AI API calls

### 3. Interactive Review Interface
- **Card-Based Review**: Side-by-side comparison with visual diff highlighting
- **AI Insights Display**: Clear presentation of AI reasoning and recommendations
- **Bulk Actions**: Automatic merging of high-confidence duplicates
- **Real-time Search**: Instant filtering across all fields with smart search
- **Invalid Record Detection**: Automatic identification and cleanup of bad data

### 4. Session Management & Persistence
- **PostgreSQL Backend**: Full database persistence with pgvector extension
- **Automatic Saving**: All work automatically saved to database
- **Session Recovery**: Resume work from any previous session
- **File Conflict Resolution**: Intelligent handling of duplicate file uploads
- **Progress Tracking**: Real-time progress indicators and statistics
- **Multi-user Support**: Concurrent session management capabilities

### 5. Data Import & Export
- **File Format Support**: CSV and Excel (XLSX) file processing
- **Intelligent Column Mapping**: Auto-detection with manual override capability
- **Export Options**:
  - Decision-aware HTML reports with complete audit trail
  - Excel exports with duplicate pair grouping
  - Filtered exports based on status and confidence
- **Data Validation**: Comprehensive validation with error reporting

### 6. Executive-Grade UI/UX
- **Professional Design**: SAP/Salesforce-inspired enterprise aesthetic
- **Dark/Light Mode**: Theme switching with persistent preferences
- **Responsive Layout**: Optimized for desktop and tablet usage
- **Glass-morphism Effects**: Modern visual design with depth
- **Consistent Animations**: 300ms transitions throughout

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ File Upload │  │ Interactive  │  │  Session Management    │ │
│  │  Component  │  │  Data Grid   │  │     Components         │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                 │                       │              │
│  ┌──────┴─────────────────┴───────────────────────┴───────────┐ │
│  │                    API Routes (Next.js)                     │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
├────────────────────────────┼────────────────────────────────────┤
│  ┌─────────────────────────┴───────────────────────────────────┐ │
│  │                  Backend Services                            │ │
│  ├─────────────────┬────────────────┬──────────────────────────┤ │
│  │ Python FastAPI  │  Azure OpenAI  │   PostgreSQL + pgvector  │ │
│  │ Dedup Engine    │  GPT 4.1-Nano  │    Session Database      │ │
│  └─────────────────┴────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

- **Frontend Components** (`/src/components/`)
  - `file-upload.tsx`: Drag-and-drop file upload with processing
  - `interactive-data-grid.tsx`: TanStack Table-based data grid
  - `card-review-modal.tsx`: Duplicate pair review interface
  - `session-loading-dialog.tsx`: Session management UI
  - `file-conflict-dialog.tsx`: File upload conflict resolution
  
- **AI Integration** (`/src/ai/`)
  - `genkit.ts`: Azure OpenAI configuration and setup
  - `flows/analyze-duplicate-confidence.ts`: AI analysis workflow
  - `rules/business-rules-config.ts`: 14 configurable business rule categories
  - `rules/smart-duplicate-rules.ts`: Rules engine implementation

- **Database Layer** (`/src/lib/`)
  - `db.ts`: PostgreSQL connection and utilities
  - `canonical-field-mapping.ts`: Intelligent column mapping system

- **Utilities** (`/src/utils/`)
  - `record-validation.ts`: Data quality validation
  - `duplicate-pairs-export.ts`: Excel export functionality
  - `decision-aware-html-export.ts`: HTML report generation
  - `export-utils.ts`: Common export utilities

## Technology Stack

### Frontend
- **Framework**: Next.js 15.2.3 with App Router
- **Language**: TypeScript 5.x with strict mode
- **UI Components**: 
  - Radix UI primitives for accessibility
  - shadcn/ui component library
  - TanStack Table v8 for data grids
- **Styling**: 
  - Tailwind CSS 3.4 with custom design system
  - CSS Variables for theming
  - Glass-morphism effects
- **State Management**: React hooks with database persistence

### Backend
- **API Layer**: Next.js API Routes
- **AI Integration**: 
  - Google Genkit framework
  - Azure OpenAI (GPT 4.1-Nano deployment)
- **Database**: 
  - PostgreSQL 16 with pgvector extension
  - Connection pooling with pg library
- **External APIs**: Python FastAPI backend for duplicate detection

### Development & Deployment
- **Build Tool**: Next.js built-in with Turbopack
- **Package Manager**: npm
- **Container**: Docker & Docker Compose
- **Environment**: Node.js 18+

## Data Processing Pipeline

### 1. File Upload & Validation
```typescript
File Upload → Format Detection → Data Parsing → Column Mapping → Validation
```

### 2. Duplicate Detection Flow
```typescript
Mapped Data → Python API → Blocking Strategies → Similarity Scoring → Initial Results
```

### 3. AI Enhancement Pipeline
```typescript
Initial Results → Business Rules Engine → AI Analysis → Enhanced Scoring → Final Results
```

### 4. Review & Export Flow
```typescript
Review Interface → User Decisions → Database Persistence → Export Generation
```

## AI Integration

### Azure OpenAI Configuration
- **Endpoint**: `https://devoai.openai.azure.com`
- **Model**: GPT 4.1-Nano (deployment: `dai-gpt-4.1-nano`)
- **API Version**: `2025-01-01-preview`

### Smart Business Rules Categories

1. **Joint Venture Detection**: Identifies legitimate JV relationships
2. **Hierarchy Recognition**: Detects parent/subsidiary structures
3. **Geographic Analysis**: Handles same-address businesses
4. **Industry Classification**: Manages multi-industry entities
5. **Freight Forwarder Detection**: Special handling for logistics
6. **Test Account Identification**: Prevents test data corruption
7. **Contact vs Customer**: Differentiates individuals from companies
8. **Acquisition Detection**: Handles M&A scenarios
9. **Drop Ship Recognition**: Manages temporary addresses
10. **Data Quality Rules**: Flags incomplete records
11. **Name Variations**: Handles abbreviations and formats
12. **Address Variations**: Normalizes address formats
13. **Phone Variations**: Standardizes phone numbers
14. **VAT Number Matching**: Legal entity verification

### AI Analysis Features
- **Contextual Understanding**: Recognizes business relationships
- **Confidence Scoring**: Detailed reasoning for each assessment
- **Smart Caching**: Avoids redundant API calls
- **Filter Intelligence**: Excludes unique identifiers from comparison
- **Business Justification**: Provides actionable recommendations

## User Interface

### Main Application Views

1. **File Upload Interface**
   - Drag-and-drop zone with file type validation
   - Progress indicators for large files
   - Column mapping with auto-detection
   - Blocking strategy configuration

2. **Interactive Data Grid**
   - Virtual scrolling for performance
   - Multi-column sorting and filtering
   - Smart search with instant results
   - Row selection for bulk actions
   - Status indicators and confidence badges

3. **Card Review Modal**
   - Side-by-side record comparison
   - Visual diff highlighting
   - AI analysis display with markdown formatting
   - Action buttons for merge/skip/reject
   - Navigation between duplicate pairs

4. **Session Management**
   - Session list with search and filtering
   - Progress tracking and statistics
   - One-click session restoration
   - Session deletion with confirmation

5. **Export Interface**
   - Multiple export format options
   - Filter-aware exports
   - Decision report generation
   - Progress indicators for large exports

### Design System
- **Colors**: Slate-based palette with blue/purple accents
- **Typography**: Light font weights with proper tracking
- **Spacing**: 8px grid system
- **Components**: Consistent border radius and shadows
- **Animations**: 300ms ease-in-out transitions

## API Endpoints

### Session Management
- `POST /api/sessions/create` - Create new session
- `GET /api/sessions/list` - List all sessions
- `GET /api/sessions/list-with-stats` - List with statistics
- `GET /api/sessions/[id]/load` - Load session data
- `PUT /api/sessions/[id]/save` - Save session data
- `POST /api/sessions/check-filename` - Check for conflicts
- `DELETE /api/sessions/delete` - Delete session
- `GET /api/sessions/original-data` - Get original file data

### Duplicate Processing
- `POST /api/find-duplicates` - Process file for duplicates
- `POST /api/duplicate-pairs/create-batch` - Batch create pairs
- `PUT /api/duplicate-pairs/[id]/update` - Update pair status

### AI Analysis
- `POST /api/analyze-confidence` - Get AI confidence analysis

### System
- `GET /api/health` - Database health check

## Session Management

### Database-Backed Sessions
- **Automatic Creation**: Sessions created on file upload
- **Real-time Saving**: All changes persisted immediately
- **Metadata Storage**: File info, configuration, timestamps
- **Progress Tracking**: Processed vs total pairs
- **User Association**: Optional user ID support

### Session Features
- **Conflict Resolution**: Intelligent filename versioning
- **Recovery Options**: Load any previous session
- **Statistics**: Complete metrics for each session
- **Audit Trail**: Full history of all decisions
- **Cleanup**: Configurable session retention

### Database Tables
1. **sessions**: Core session metadata
2. **duplicate_pairs**: All duplicate pair data and decisions
3. **session_configs**: Processing configuration
4. **file_uploads**: Original file information
5. **original_file_data**: Complete original dataset

## Export Capabilities

### 1. Decision-Aware HTML Reports
- **Comprehensive Summary**: Statistics and progress
- **Grouped Display**: Organized by confidence and status
- **Visual Design**: Executive-friendly formatting
- **Audit Trail**: Complete decision history
- **Filtering Support**: Export filtered views

### 2. Excel Exports
- **Multi-sheet Organization**: Grouped by status
- **Conditional Formatting**: Visual indicators
- **Summary Statistics**: Overview sheet
- **Detailed Data**: All fields and scores
- **Filter Preservation**: Maintains current view

### 3. Export Features
- **Large Dataset Support**: Streaming for performance
- **Progress Tracking**: Real-time progress updates
- **Error Handling**: Graceful failure recovery
- **Format Options**: Multiple export formats
- **Compression**: Automatic for large files

## Business Rules Engine

### Rule Configuration Structure
```typescript
interface RuleConfiguration {
  enabled: boolean;
  priority: number; // 1-10, higher = more important
  confidenceAdjustment: number; // -100 to +100
  patterns: string[];
  keywords?: string[];
  thresholds?: Record<string, number>;
  exemptionMessage?: string;
  businessJustification?: string;
}
```

### Rule Processing Pipeline
1. **Pattern Matching**: Regex and keyword detection
2. **Threshold Evaluation**: Configurable scoring thresholds
3. **Priority Resolution**: Higher priority rules override
4. **Confidence Adjustment**: Modify AI confidence scores
5. **Business Context**: Add exemptions and justifications

### Customization
- **Enable/Disable Rules**: Toggle individual rules
- **Adjust Priorities**: Change rule precedence
- **Modify Patterns**: Update detection patterns
- **Configure Thresholds**: Fine-tune sensitivity
- **Add Custom Rules**: Extend rule categories

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL 16 (via Docker)
- Azure OpenAI API key

### Quick Start

1. **Clone Repository**
```bash
git clone <repository-url>
cd "MDM Master Data Cleanse"
```

2. **Install Dependencies**
```bash
npm install
```

3. **Database Setup**
```bash
# Automated setup script
npm run db:setup

# Or manually
./setup-database.sh
```

4. **Environment Configuration**
Create `.env.local`:
```env
DATABASE_URL=postgresql://mdm_user:mdm_password123@localhost:5433/mdm_dedup
OPENAI_API_KEY=your_azure_openai_api_key
NODE_ENV=development
```

5. **Start Application**
```bash
npm run dev
```

Application runs at: http://localhost:9003

### Docker Compose Setup
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: mdm_user
      POSTGRES_PASSWORD: mdm_password123
      POSTGRES_DB: mdm_dedup
    ports:
      - "5433:5433"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
```

## Usage Guide

### Basic Workflow

1. **Upload Data**
   - Drag and drop CSV/Excel file
   - System auto-detects columns
   - Map columns to logical fields
   - Configure blocking strategies

2. **Process Duplicates**
   - Click "Start Deduplication"
   - View processing progress
   - Results appear in data grid

3. **Review Duplicates**
   - Use smart search to filter
   - Click "Review" on any pair
   - View AI analysis and recommendations
   - Make merge/skip/reject decision

4. **Bulk Operations**
   - Select multiple rows
   - Use bulk merge for high confidence
   - Clean up invalid records
   - Export decision reports

5. **Export Results**
   - Generate decision reports
   - Export to Excel with grouping
   - Download filtered views
   - Save audit trail

### Advanced Features

1. **Session Management**
   - Access via header "Sessions" button
   - Search and filter sessions
   - Load previous work
   - Track progress over time

2. **AI Analysis**
   - Automatic for all pairs
   - Enhanced analysis on demand
   - Cached for performance
   - Detailed reasoning display

3. **Business Rules**
   - Automatic rule application
   - View applied rules in UI
   - Understand exemptions
   - Configure via code

## Configuration

### Application Configuration (`environment.ts`)
```typescript
export const environment = {
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://datacleansing.redocean-27211e6a.centralus.azurecontainerapps.io'
    : 'http://localhost:8000',
  azureOpenAiEndpoint: 'https://devoai.openai.azure.com',
  openAiApiVersion: '2025-01-01-preview',
  azureOpenAiDeploymentName: 'dai-gpt-4.1-nano'
};
```

### Processing Configuration
- **Blocking Strategies**: Enable/disable in UI
- **Similarity Thresholds**: Configurable per field
- **AI Confidence Levels**: High (90%+), Medium (60-89%), Low (<60%)
- **Batch Sizes**: Optimized for performance

### UI Configuration
- **Theme**: Light/Dark mode with persistence
- **Table Pagination**: 10, 20, 30, 40, 50 rows
- **Search Debounce**: 300ms for performance
- **Animation Duration**: 300ms transitions

## Database Schema

### Core Tables

1. **sessions**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  session_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255),
  file_hash VARCHAR(64),
  user_id VARCHAR(255),
  total_pairs INTEGER DEFAULT 0,
  processed_pairs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);
```

2. **duplicate_pairs**
```sql
CREATE TABLE duplicate_pairs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  pair_data JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  confidence_level VARCHAR(20),
  ai_analysis JSONB,
  processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

3. **session_configs**
```sql
CREATE TABLE session_configs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  config_key VARCHAR(255) NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- Session lookups by user_id and file_hash
- Duplicate pairs by session_id and status
- Configs by session_id and config_key

## Performance Considerations

### Frontend Optimization
- **Virtual Scrolling**: TanStack Table virtualization
- **Lazy Loading**: Components loaded on demand
- **Debounced Search**: Prevents excessive re-renders
- **Memoization**: Heavy computations cached
- **Code Splitting**: Route-based splitting

### Backend Optimization
- **Connection Pooling**: 20 concurrent DB connections
- **Query Optimization**: Indexed lookups
- **Batch Operations**: Bulk inserts/updates
- **AI Caching**: Prevents duplicate API calls
- **Streaming Exports**: Memory-efficient

### Scalability
- **Horizontal Scaling**: Stateless architecture
- **Database Sharding**: Ready for partitioning
- **CDN Ready**: Static assets optimized
- **Queue Support**: Async processing capable
- **Load Balancing**: Multi-instance ready

## Security Features

### Data Protection
- **Input Validation**: All inputs sanitized
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: React's built-in escaping
- **CSRF Protection**: Next.js built-in
- **Secure Headers**: Security headers configured

### Authentication & Authorization
- **Session-based Access**: Unique session IDs
- **User Isolation**: Optional user_id support
- **API Key Security**: Environment variables
- **HTTPS Enforcement**: Production SSL
- **Rate Limiting**: API endpoint protection

### Compliance
- **Audit Trail**: Complete decision history
- **Data Retention**: Configurable policies
- **Export Control**: Business rule compliance
- **GDPR Ready**: Data deletion capabilities
- **SOC2 Alignment**: Security best practices

## Development Guide

### Project Structure
```
/src
├── app/              # Next.js app router pages
├── components/       # React components
├── ai/              # AI integration code
├── lib/             # Core libraries
├── utils/           # Utility functions
├── hooks/           # React hooks
├── types/           # TypeScript definitions
└── assets/          # Static assets
```

### Development Commands
```bash
npm run dev           # Start with auto-browser open
npm run dev:noopen    # Start without browser
npm run build         # Production build
npm run lint          # ESLint checking
npm run typecheck     # TypeScript validation
npm run db:setup      # Database initialization
npm run db:start      # Start database
npm run db:stop       # Stop database
npm run db:reset      # Reset database
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced code style
- **Components**: Functional with hooks
- **Naming**: PascalCase components, camelCase functions
- **Comments**: JSDoc for public APIs

### Testing Approach
- **Unit Tests**: Component logic
- **Integration Tests**: API endpoints
- **E2E Tests**: Critical workflows
- **Performance Tests**: Load testing
- **Accessibility Tests**: WCAG compliance

### Contributing Guidelines
1. Create feature branch from `development`
2. Follow existing code patterns
3. Add tests for new features
4. Update documentation
5. Submit PR with description

## Support & Troubleshooting

### Common Issues

1. **Database Connection**
   - Ensure Docker is running
   - Check PostgreSQL logs
   - Verify connection string

2. **AI Analysis Errors**
   - Validate API key
   - Check Azure endpoint
   - Monitor rate limits

3. **File Upload Issues**
   - Verify file format
   - Check file size limits
   - Validate data structure

4. **Performance Problems**
   - Reduce blocking strategies
   - Limit batch sizes
   - Check database indexes

### Getting Help
- **GitHub Issues**: Report bugs and features
- **Documentation**: Comprehensive guides
- **API Health**: Check `/api/health`
- **Logs**: Browser and server console
- **Support**: Contact development team

## License & Credits

This application is proprietary software developed for enterprise MDM operations. 

### Key Contributors
- MDM Development Team
- Flowserve AI Initiative
- Data Quality Task Force

### Technologies Used
- Next.js by Vercel
- Azure OpenAI by Microsoft
- PostgreSQL by PostgreSQL Global Development Group
- And many open source libraries

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Powered by**: Flowserve AI