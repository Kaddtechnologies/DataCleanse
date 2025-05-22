# MDM Master Data Cleanse

A sophisticated data deduplication and cleansing system built with Next.js and AI-powered analysis. This application helps organizations identify, review, and merge duplicate records in their master data management (MDM) processes.

## Purpose

This project addresses the critical challenge of maintaining clean, deduplicated master data across organizations. It provides:

- **Intelligent Duplicate Detection**: Multiple algorithmic strategies for finding potential duplicate records
- **AI-Powered Analysis**: Leverages Google Gemini AI to assess duplicate confidence and provide reasoning
- **Interactive Review Interface**: User-friendly card-based interface for reviewing and managing duplicates
- **Flexible Data Import**: Support for CSV and Excel file uploads with customizable column mapping
- **Export Capabilities**: Export cleaned data and analysis results

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
For enhanced accuracy, the system integrates with OPEN AI (`src/ai/genkit.ts`) to:
- Evaluate the likelihood that two records represent the same entity
- Provide detailed reasoning for confidence assessments
- Score matches on a scale from very low to very high confidence

### 4. Interactive Review
The card-based review interface (`src/components/card-review-modal.tsx`) allows users to:
- View side-by-side record comparisons
- See AI confidence scores and reasoning
- Make decisions to merge, skip, or mark as not duplicates
- Navigate through all detected duplicate pairs

### 5. Data Export
Users can export their cleaned data and analysis results through the export functionality (`src/components/data-export-actions.tsx`).

## Key Features

- **Real-time Processing**: Immediate duplicate detection as data is uploaded
- **Multiple Detection Strategies**: Configurable algorithms for different data types
- **AI-Enhanced Accuracy**: Open AI integration for intelligent duplicate assessment
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Type-Safe Development**: Full TypeScript implementation with comprehensive interfaces
- **Modern UI Components**: Built with Radix UI and styled with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 15.2.3 with App Router
- **UI Framework**: Radix UI components with Tailwind CSS
- **AI Integration**: Google Genkit with GPT 4.1-Nano
- **Data Handling**: TanStack Table for complex data grids
- **Type Safety**: Comprehensive TypeScript interfaces (`src/types/index.ts`)
- **State Management**: React hooks with local state management

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment variables for Open AI API access
3. Run development server: `npm run dev`
4. Upload a CSV or Excel file to begin duplicate detection
5. Review detected duplicates using the card interface
6. Export your cleaned data

This application serves as a comprehensive solution for organizations looking to maintain high-quality master data through intelligent deduplication and AI-assisted decision making.
