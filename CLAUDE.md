# CLAUDE.md - DataCleansing Project Documentation

This document provides an overview of the DataCleansing project structure, development patterns, and key information for AI assistance.

## Project Overview

This repository contains a data deduplication and cleansing system consisting of two main components:

1. **DataCleansing_Python**: FastAPI backend service for duplicate record detection
2. **DataCleansing_React**: Next.js frontend application with AI-powered analysis

## Project Structure

```
/mnt/c/Users/10187499/repos/
├── DataCleansing_Python/          # Backend API service
│   ├── src/                       # Modular source code
│   │   ├── main.py               # FastAPI app and endpoints
│   │   ├── models/               # Pydantic data models
│   │   ├── utils/                # Utility functions (fuzzy matching, AI scoring, text processing)
│   │   └── core/                 # Core deduplication algorithms
│   ├── app.py                    # Entry point with backward compatibility
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile               # Container configuration
│   ├── deploy_to_azure.sh       # Azure Container Apps deployment script
│   └── blocking_*.py            # Various deduplication strategies
│
└── DataCleansing_React/          # Frontend application
    ├── src/
    │   ├── app/                  # Next.js app router
    │   ├── components/           # React components (UI, data grid, modals)
    │   ├── ai/                   # Google Genkit AI integration
    │   ├── types/                # TypeScript type definitions
    │   ├── hooks/                # Custom React hooks
    │   └── lib/                  # Utility libraries
    ├── package.json             # Node.js dependencies
    └── tailwind.config.ts       # Styling configuration
```

## Technology Stack

### Backend (DataCleansing_Python)
- **Framework**: FastAPI with Uvicorn
- **Language**: Python 3.11+
- **Key Libraries**:
  - `pandas` - Data manipulation
  - `thefuzz`, `jellyfish` - Fuzzy string matching
  - `pydantic` - Data validation
  - `python-multipart` - File upload handling
- **AI Integration**: OpenAI GPT models for confidence scoring
- **Deployment**: Docker + Azure Container Apps

### Frontend (DataCleansing_React)
- **Framework**: Next.js 15.2.3 with App Router
- **Language**: TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **AI Integration**: Google Genkit with Gemini 2.0 Flash
- **State Management**: React hooks with local state
- **Data Handling**: TanStack Table for data grids

## Key Features

### Deduplication Strategies
- **Prefix Blocking**: First 4 characters of name + first character of city
- **Metaphone Blocking**: Phonetic encoding for company names
- **Soundex Blocking**: Alternative phonetic algorithm
- **N-gram Blocking**: Character 3-grams from names
- **AI Confidence Scoring**: GPT/Gemini evaluation of duplicate matches

### Frontend Capabilities
- Interactive data grid with filtering and sorting
- Card-based duplicate review interface
- AI-powered confidence analysis
- File upload with drag-and-drop
- Data export functionality
- Real-time duplicate processing

## Development Patterns

### Python Backend
- **Modular Architecture**: Separated concerns (models, utils, core logic)
- **FastAPI Best Practices**: Proper endpoint structure, validation, error handling
- **Backward Compatibility**: Entry point maintains existing API contracts
- **Testing**: Dedicated test files for each component
- **Configuration**: Environment-based settings with defaults

### React Frontend
- **Component-Based**: Reusable UI components with shadcn/ui
- **Type Safety**: Comprehensive TypeScript interfaces
- **Hook-Based State**: Custom hooks for common patterns
- **Responsive Design**: Mobile-first with Tailwind CSS
- **AI Integration**: Structured flows for AI analysis

## Configuration & Environment

### Backend Environment Variables
- `PORT`: API server port (default: 8000)
- `OPEN-API-KEY`: OpenAI API key for AI scoring
- `ENVIRONMENT`: Deployment environment

### Frontend Environment Variables
- `OPENAI_API_KEY`: Open AI API key for Genkit

## API Endpoints

### Core Endpoints
- `GET /`: Health check
- `GET /api/health`: Detailed health status
- `POST /api/find-duplicates`: Main deduplication endpoint
- `POST /deduplicate/`: Enhanced deduplication with strategy selection

### Request Parameters
- File upload (CSV/XLSX)
- Column mapping JSON
- Blocking strategy flags (`use_prefix`, `use_metaphone`, `use_soundex`, `use_ngram`)
- Similarity thresholds (`name_threshold`, `overall_threshold`)
- AI analysis toggle (`use_ai`)

## Data Models

### CustomerRecord Interface
```typescript
interface CustomerRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tpi?: string;
  // Similarity scores and metadata
}
```

### DuplicatePair Interface
```typescript
interface DuplicatePair {
  id: string;
  record1: CustomerRecord;
  record2: CustomerRecord;
  similarityScore: number;
  aiConfidence?: string;
  aiReasoning?: string;
  status: 'pending' | 'merged' | 'not_duplicate' | 'skipped';
}
```

## Build & Deployment

### Local Development
```bash
# Backend
cd DataCleansing_Python
pip install -r requirements.txt
python app.py

# Frontend
cd DataCleansing_React
npm install
npm run dev
```

### Docker Deployment
```bash
# Backend
docker build -t datacleansing .
docker run -p 8000:8000 datacleansing

# Azure deployment
./deploy_to_azure.sh
```

### Frontend Scripts
- `npm run dev`: Development server with auto-open
- `npm run dev:noopen`: Development without browser open
- `npm run genkit:dev`: Start Genkit AI development server
- `npm run build`: Production build
- `npm run typecheck`: TypeScript validation

## Common Development Tasks

### Adding New Deduplication Strategy
1. Create new blocking strategy file in Python backend
2. Update `DeduplicationColumnMap` in models
3. Add strategy flag to API endpoints
4. Update frontend UI to include new option

### Modifying AI Analysis
1. Update prompts in `src/ai/genkit.ts`
2. Modify confidence scoring logic
3. Update TypeScript interfaces if needed
4. Test with various data scenarios

### UI Component Changes
1. Components use shadcn/ui patterns
2. Styling with Tailwind CSS utility classes
3. State management through React hooks
4. Type safety with TypeScript interfaces

## Testing Strategy

### Backend Testing
- Unit tests for deduplication algorithms
- API endpoint testing
- Blocking strategy validation
- AI scoring integration tests

### Frontend Testing
- Component unit tests (when implemented)
- AI flow integration testing
- User interaction testing

## Performance Considerations

- **Blocking Strategies**: Trade-off between speed and accuracy
- **AI Analysis**: Significant processing time, use selectively
- **Data Grid**: Virtual scrolling for large datasets
- **File Processing**: Stream processing for large files

## Security Notes

- API keys stored in environment variables
- File uploads validated and processed securely
- No persistent storage of uploaded data
- CORS configured for development

## Documentation Resources

- `ENHANCED_README.md`: Detailed backend documentation
- `MachineLearning.md`: ML approach documentation
- `blocking_strategies_README.md`: Strategy comparison
- `docs/blueprint.md`: Frontend design specification

This documentation should be updated as the project evolves to maintain accuracy for AI assistance.