import type { CustomerRecord, DuplicatePair } from '@/types';

/**
 * Utility functions for record validation and cleanup
 */

/**
 * Check if a record has an invalid or missing name
 * @param record CustomerRecord to check
 * @returns true if the record has "nan", null, undefined, or empty name
 */
export function isInvalidNameRecord(record: CustomerRecord): boolean {
  if (!record.name) return true;
  
  const name = String(record.name).toLowerCase().trim();
  
  // Check for common invalid values
  const invalidValues = ['nan', 'null', 'undefined', '', 'n/a', 'na', 'none', 'unknown'];
  
  return invalidValues.includes(name);
}

/**
 * Check if a duplicate pair contains any records with invalid names
 * @param pair DuplicatePair to check
 * @returns object indicating which records have invalid names
 */
export function checkPairForInvalidNames(pair: DuplicatePair): {
  hasInvalidName: boolean;
  record1Invalid: boolean;
  record2Invalid: boolean;
} {
  const record1Invalid = isInvalidNameRecord(pair.record1);
  const record2Invalid = isInvalidNameRecord(pair.record2);
  
  return {
    hasInvalidName: record1Invalid || record2Invalid,
    record1Invalid,
    record2Invalid
  };
}

/**
 * Get display name for a record, handling invalid names
 * @param record CustomerRecord
 * @returns formatted display name
 */
export function getDisplayName(record: CustomerRecord): string {
  if (isInvalidNameRecord(record)) {
    return `[INVALID NAME: ${record.name || 'missing'}]`;
  }
  return record.name;
}

/**
 * Filter out duplicate pairs that contain invalid name records
 * @param pairs Array of DuplicatePair
 * @returns Object with valid pairs and invalid pairs
 */
export function separateValidAndInvalidPairs(pairs: DuplicatePair[]): {
  validPairs: DuplicatePair[];
  invalidPairs: DuplicatePair[];
} {
  const validPairs: DuplicatePair[] = [];
  const invalidPairs: DuplicatePair[] = [];
  
  pairs.forEach(pair => {
    const { hasInvalidName } = checkPairForInvalidNames(pair);
    if (hasInvalidName) {
      invalidPairs.push(pair);
    } else {
      validPairs.push(pair);
    }
  });
  
  return { validPairs, invalidPairs };
}

/**
 * Get reason why a record name is invalid
 * @param record CustomerRecord
 * @returns string describing the issue
 */
export function getInvalidNameReason(record: CustomerRecord): string {
  if (!record.name) {
    return "Missing name field";
  }
  
  const name = String(record.name).toLowerCase().trim();
  
  if (name === 'nan') {
    return "Name field contains 'nan' (Not a Number)";
  }
  if (name === 'null') {
    return "Name field contains 'null'";
  }
  if (name === 'undefined') {
    return "Name field contains 'undefined'";
  }
  if (name === '') {
    return "Name field is empty";
  }
  if (['n/a', 'na', 'none', 'unknown'].includes(name)) {
    return "Name field contains placeholder value";
  }
  
  return "Invalid name value";
}

/**
 * Compare two values and determine their relationship
 * @param value1 First value to compare
 * @param value2 Second value to compare
 * @param fieldName Name of the field being compared
 * @returns Comparison result with type and similarity info
 */
export function compareValues(value1: any, value2: any, fieldName: string): {
  type: 'identical' | 'different' | 'similar' | 'one-empty' | 'both-empty';
  similarity?: number;
  note?: string;
  fieldName: string;
} {
  // Handle null/undefined/empty values
  const isEmpty1 = !value1 || String(value1).trim() === '';
  const isEmpty2 = !value2 || String(value2).trim() === '';
  
  if (isEmpty1 && isEmpty2) {
    return { type: 'both-empty', fieldName };
  }
  
  if (isEmpty1 || isEmpty2) {
    return { type: 'one-empty', fieldName };
  }
  
  const str1 = String(value1).trim().toLowerCase();
  const str2 = String(value2).trim().toLowerCase();
  
  // Exact match
  if (str1 === str2) {
    // Special case for TPI - highlight if same (rare case)
    if (fieldName === 'tpi') {
      return { type: 'identical', note: 'Same TPI (unusual - should be unique)', fieldName };
    }
    return { type: 'identical', fieldName };
  }
  
  // For TPI, different is expected and normal
  if (fieldName === 'tpi') {
    return { type: 'different', note: 'Different TPI (expected)', fieldName };
  }
  
  // Calculate similarity for text fields
  if (fieldName === 'name' || fieldName === 'address' || fieldName === 'city') {
    const similarity = calculateStringSimilarity(str1, str2);
    
    if (similarity > 0.8) {
      return { type: 'similar', similarity, note: 'Very similar', fieldName };
    } else if (similarity > 0.6) {
      return { type: 'similar', similarity, note: 'Somewhat similar', fieldName };
    }
  }
  
  return { type: 'different', fieldName };
}

/**
 * Calculate string similarity using a simple algorithm
 * @param str1 First string
 * @param str2 Second string  
 * @returns Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(str1, str2);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Edit distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Get all field comparisons between two records
 * @param record1 First record
 * @param record2 Second record
 * @returns Object with comparison results for each field
 */
export function compareRecords(record1: CustomerRecord, record2: CustomerRecord): Record<string, ReturnType<typeof compareValues>> {
  const fields = ['name', 'address', 'city', 'country', 'tpi', 'rowNumber'];
  const comparisons: Record<string, ReturnType<typeof compareValues>> = {};
  
  fields.forEach(field => {
    comparisons[field] = compareValues(
      record1[field as keyof CustomerRecord], 
      record2[field as keyof CustomerRecord], 
      field
    );
  });
  
  return comparisons;
} 