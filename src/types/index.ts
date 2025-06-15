export interface CustomerRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tpi?: string;      // TPI Number
  rowNumber?: number; // Row number in the Excel file
  
  // Similarity scores
  name_score?: number;
  addr_score?: number;
  city_score?: number;
  country_score?: number;
  tpi_score?: number;
  overall_score?: number;
  
  // Match method information
  blockType?: string;         // Which blocking strategy found this match (e.g., metaphone)
  matchMethod?: string;       // Overall match method used
  bestNameMatchMethod?: string; // Best method for matching names
  bestAddrMatchMethod?: string; // Best method for matching addresses
  
  // Confidence information
  isLowConfidence?: boolean;
  llm_conf?: number;   // LLM confidence score
  
  [key: string]: any; // For additional dynamic fields
}

export interface DuplicatePair {
  id: string;
  record1: CustomerRecord;
  record2: CustomerRecord;
  similarityScore: number; // The fuzzy matching score
  aiConfidence?: string;
  aiReasoning?: string;
  status: 'pending' | 'merged' | 'not_duplicate' | 'skipped' | 'duplicate';
  
  // Enhanced AI Analysis Results (for audit and export)
  enhancedConfidence?: string; // High/Medium/Low from smart analysis
  enhancedScore?: number; // Smart rules enhanced score (0-100)
  originalScore?: number; // Original score before enhancement (for comparison)
  scoreChangeReason?: string; // Explanation of why score changed
  lastAnalyzed?: string; // Timestamp of last AI analysis
  
  // Cached AI Analysis Result (to avoid repeated API calls)
  cachedAiAnalysis?: any; // Store the complete AnalyzeDuplicateConfidenceOutput
}

// Export all business rules types
export * from './business-rules';
