export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  [key: string]: any; // For additional dynamic fields
}

export interface DuplicatePair {
  id: string;
  record1: CustomerRecord;
  record2: CustomerRecord;
  similarityScore: number; // The fuzzy matching score
  aiConfidence?: string;
  aiReasoning?: string;
  status: 'pending' | 'merged' | 'not_duplicate' | 'skipped';
}
