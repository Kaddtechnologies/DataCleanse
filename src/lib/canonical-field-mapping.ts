/**
 * Canonical Field Mapping System
 * 
 * This module provides intelligent column mapping for data cleansing operations.
 * It maps various column header formats to standardized logical field names.
 * 
 * @author MDM Team
 * @version 1.0.0
 */

// Define the logical fields the backend expects for mapping
export const LOGICAL_FIELDS = [
  { key: 'tpi', label: 'Unique ID/TPI (for info)', required: false },
  { key: 'customer_name', label: 'Customer Name (for matching)', required: true },
  { key: 'address', label: 'Address (for matching)', required: false },
  { key: 'city', label: 'City (for blocking/info)', required: false },
  { key: 'country', label: 'Country (for info)', required: false },
] as const;

export type LogicalFieldKey = typeof LOGICAL_FIELDS[number]['key'];

/**
 * Configuration interface for field mapping
 */
export interface FieldMappingConfig {
  /** Exact matches that should map 1:1 (highest priority) */
  exactMatches: string[];
  /** Partial matches that require similarity scoring */
  partialMatches: string[];
  /** Alternative names/aliases for the field */
  aliases: string[];
  /** Terms that should explicitly NOT match this field */
  exclusions?: string[];
}

/**
 * Comprehensive canonical mapping with exact matches prioritized
 * 
 * Structure:
 * - exactMatches: Perfect matches (score: 1.0)
 * - partialMatches: Require similarity calculation
 * - aliases: Alternative terminology
 * - exclusions: Prevent false positive mappings
 */
export const CANONICAL_FIELD_MAPPING: Record<LogicalFieldKey, FieldMappingConfig> = {
  customer_name: {
    exactMatches: [
      // Standard formats
      "customer name", "customer_name", "customername",
      "client name", "client_name", "clientname",
      "company name", "company_name", "companyname",
      "organization name", "organization_name", "organizationname",
      "business name", "business_name", "businessname",
      "firm name", "firm_name", "firmname",
      "entity name", "entity_name", "entityname",
      
      // Single word variants
      "name", "customer", "client", "company", "organization", "business", "firm",
      
      // Account variations
      "account name", "account_name", "accountname",
      "party name", "party_name", "partyname",
      
      // Legal/Trading names
      "legal name", "legal_name", "legalname",
      "trading name", "trading_name", "tradingname",
      "corporate name", "corporate_name", "corporatename",
      
      // International variants
      "nom client", "raison sociale", "empresa", "société"
    ],
    partialMatches: [
      "customer", "client", "company", "organization", "business", "firm", "name", "account"
    ],
    aliases: [
      // Partnership terms
      "partner name", "partner_name", "partnername",
      "vendor name", "vendor_name", "vendorname",
      "supplier name", "supplier_name", "suppliername",
      "counterparty", "counter party", "counter_party",
      
      // Financial terms
      "institution name", "institution_name", "institutionname",
      "bank name", "bank_name", "bankname"
    ],
    exclusions: [
      "global account", "account number", "account id", "account code", 
      "account type", "core fpd", "fpd", "account manager", "account status"
    ]
  },

  address: {
    exactMatches: [
      // Standard address formats
      "address", "street address", "street_address", "streetaddress",
      "mailing address", "mailing_address", "mailingaddress",
      "physical address", "physical_address", "physicaladdress",
      "business address", "business_address", "businessaddress",
      "company address", "company_address", "companyaddress",
      "registered address", "registered_address", "registeredaddress",
      
      // Address components
      "street", "addr", "location", "premise",
      "address line", "address_line", "addressline",
      "full address", "full_address", "fulladdress",
      
      // International variants
      "adresse", "dirección", "endereço", "住所"
    ],
    partialMatches: [
      "address", "street", "addr", "location"
    ],
    aliases: [
      // Line-specific addresses
      "address line 1", "address_line_1", "addressline1",
      "address1", "addr1", "line1", "line 1",
      "postal address", "postal_address", "postaladdress",
      "billing address", "billing_address", "billingaddress"
    ]
  },

  city: {
    exactMatches: [
      // Standard city terms
      "city", "town", "locality", "municipality",
      "urban area", "urban_area", "urbanarea",
      "metropolitan area", "metropolitan_area", "metropolitanarea",
      "suburb", "borough", "district",
      
      // Administrative divisions
      "commune", "village", "township",
      
      // International variants
      "ville", "ciudad", "cidade", "市", "stad"
    ],
    partialMatches: [
      "city", "town", "locality"
    ],
    aliases: [
      "place", "settlement", "area", "municipality"
    ]
  },

  country: {
    exactMatches: [
      // Standard country terms
      "country", "nation", "territory", "state",
      "country code", "country_code", "countrycode",
      "iso country", "iso_country", "isocountry",
      "nationality", "region", "geography",
      "country name", "country_name", "countryname",
      
      // Geographic terms
      "jurisdiction", "sovereign state",
      
      // International variants
      "pays", "país", "país", "国", "land"
    ],
    partialMatches: [
      "country", "nation", "territory"
    ],
    aliases: [
      // Common abbreviations
      "cntry", "co", "ctry", "natl", "nat", "geo",
      "iso", "alpha2", "alpha3"
    ],
    exclusions: [
      // Prevent false matches with business terms
      "core", "corp", "company", "customer", "fpd", "finance", 
      "global", "account", "trading", "corporate", "financial"
    ]
  },

  tpi: {
    exactMatches: [
      // TPI-specific terms
      "tpi", "tpi number", "tpi_number", "tpinumber",
      "tpi id", "tpi_id", "tpiid",
      "tpi code", "tpi_code", "tpicode",
      "tpi key", "tpi_key", "tpikey",
      "tpi reference", "tpi_reference", "tpireference",
      "tpi ref", "tpi_ref", "tpiref",
      
      // Universal identifier terms
      "unique id", "unique_id", "uniqueid",
      "primary key", "primary_key", "primarykey",
      "master id", "master_id", "masterid",
      "record id", "record_id", "recordid",
      
      // System identifiers
      "system id", "system_id", "systemid",
      "internal id", "internal_id", "internalid"
    ],
    partialMatches: [
      "tpi", "primary key", "unique identifier", "record id", "master id"
    ],
    aliases: [
      // Generic identifier terms
      "identifier", "id", "key", "reference", "ref",
      "customer id", "customer_id", "customerid",
      "account id", "account_id", "accountid",
      "reference id", "reference_id", "referenceid",
      "ref id", "ref_id", "refid",
      "party id", "party_id", "partyid",
      "entity id", "entity_id", "entityid",
      
      // Database terms
      "pk", "uid", "guid", "uuid"
    ]
  }
};

/**
 * Normalizes text for comparison by removing special characters and standardizing case
 */
export function normalizeForComparison(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

/**
 * Calculates similarity score between two strings
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeForComparison(str1);
  const norm2 = normalizeForComparison(str2);
  
  // Exact match
  if (norm1 === norm2) return 1.0;
  
  // Substring match
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
  
  // Character overlap score (Jaccard similarity)
  const chars1 = new Set(norm1);
  const chars2 = new Set(norm2);
  const intersection = new Set([...chars1].filter(x => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);
  
  return intersection.size / union.size;
}

/**
 * Interface for mapping results
 */
export interface MappingResult {
  fieldKey: LogicalFieldKey;
  header: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'alias' | 'tpi_special';
  reasoning: string;
}

/**
 * Interface for auto-mapping function result
 */
export interface AutoMappingResult {
  mappings: Record<LogicalFieldKey, string>;
  results: MappingResult[];
  unmappedHeaders: string[];
  excludedHeaders: { header: string; reason: string }[];
}

/**
 * Smart column mapping function with improved logic
 * @param headers Array of column headers from the uploaded file
 * @returns Mapping results with detailed information
 */
export function autoMapColumns(headers: string[]): AutoMappingResult {
  const mappings: Record<string, string | undefined> = {};
  const results: MappingResult[] = [];
  const excludedHeaders: { header: string; reason: string }[] = [];
  
  // Initialize all fields as unmapped
  LOGICAL_FIELDS.forEach(field => mappings[field.key] = undefined);

  // Step 1: Find exact matches first (highest priority)
  for (const fieldKey in CANONICAL_FIELD_MAPPING) {
    const fieldConfig = CANONICAL_FIELD_MAPPING[fieldKey as LogicalFieldKey];
    
    for (const header of headers) {
      const normalizedHeader = normalizeForComparison(header);
      
      // Check for exact matches
      const exactMatch = fieldConfig.exactMatches.find(exact => 
        normalizeForComparison(exact) === normalizedHeader
      );
      
      if (exactMatch && !mappings[fieldKey]) {
        // Check exclusions
        const exclusion = fieldConfig.exclusions?.find(exclusion =>
          normalizeForComparison(header).includes(normalizeForComparison(exclusion))
        );
        
        if (exclusion) {
          excludedHeaders.push({
            header,
            reason: `Excluded from ${fieldKey}: contains "${exclusion}"`
          });
          continue;
        }
        
        mappings[fieldKey] = header;
        results.push({
          fieldKey: fieldKey as LogicalFieldKey,
          header,
          confidence: 1.0,
          matchType: 'exact',
          reasoning: `Exact match with "${exactMatch}"`
        });
        break;
      }
    }
  }

  // Step 2: Find best partial matches for unmapped fields
  for (const fieldKey in CANONICAL_FIELD_MAPPING) {
    if (mappings[fieldKey]) continue; // Skip if already mapped
    
    const fieldConfig = CANONICAL_FIELD_MAPPING[fieldKey as LogicalFieldKey];
    let bestMatch: { header: string; score: number; matchType: 'partial' | 'alias' } | null = null;
    
    for (const header of headers) {
      // Skip if this header is already used
      if (Object.values(mappings).includes(header)) continue;
      
      // Check exclusions first
      const exclusion = fieldConfig.exclusions?.find(exclusion =>
        normalizeForComparison(header).includes(normalizeForComparison(exclusion))
      );
      
      if (exclusion) {
        excludedHeaders.push({
          header,
          reason: `Excluded from ${fieldKey}: contains "${exclusion}"`
        });
        continue;
      }
      
      // Calculate best score from partial matches
      let bestScore = 0;
      let matchType: 'partial' | 'alias' = 'partial';
      
      for (const partial of fieldConfig.partialMatches) {
        const score = calculateSimilarity(header, partial);
        if (score > bestScore) {
          bestScore = score;
          matchType = 'partial';
        }
      }
      
      // Check aliases
      for (const alias of fieldConfig.aliases) {
        const score = calculateSimilarity(header, alias);
        if (score > bestScore) {
          bestScore = score;
          matchType = 'alias';
        }
      }
      
      // Only consider matches with score > 0.6 to avoid false positives
      if (bestScore > 0.6 && (!bestMatch || bestScore > bestMatch.score)) {
        bestMatch = { header, score: bestScore, matchType };
      }
    }
    
    if (bestMatch && bestMatch.score > 0.7) {
      mappings[fieldKey] = bestMatch.header;
      results.push({
        fieldKey: fieldKey as LogicalFieldKey,
        header: bestMatch.header,
        confidence: bestMatch.score,
        matchType: bestMatch.matchType,
        reasoning: `${bestMatch.matchType} match with score ${(bestMatch.score * 100).toFixed(1)}%`
      });
    }
  }

  // Step 3: Special handling for TPI field (more permissive for unique identifiers)
  if (!mappings.tpi) {
    for (const header of headers) {
      if (Object.values(mappings).includes(header)) continue;
      
      const normalizedHeader = normalizeForComparison(header);
      const tpiTerms = ["id", "identifier", "key", "number", "code", "ref"];
      
      const hasTpiTerm = tpiTerms.some(term => normalizedHeader.includes(term));
      const hasUniqueIndicator = ["unique", "primary", "master", "record"].some(indicator =>
        normalizedHeader.includes(indicator)
      );
      
      if (hasTpiTerm && (hasUniqueIndicator || normalizedHeader.length <= 6)) {
        mappings.tpi = header;
        results.push({
          fieldKey: 'tpi',
          header,
          confidence: 0.8,
          matchType: 'tpi_special',
          reasoning: 'Special TPI detection: contains identifier terms'
        });
        break;
      }
    }
  }

  const unmappedHeaders = headers.filter(h => !Object.values(mappings).includes(h));

  return {
    mappings: mappings as Record<LogicalFieldKey, string>,
    results,
    unmappedHeaders,
    excludedHeaders
  };
}

/**
 * Logs detailed mapping information to console for debugging
 */
export function logMappingResults(
  headers: string[], 
  result: AutoMappingResult
): void {
  console.log("🎯 Smart Column Mapping Results");
  console.log("Available headers:", headers);
  console.log("Mapping decisions breakdown:");
  
  // Log successful mappings
  result.results.forEach(mapping => {
    console.log(`✅ ${mapping.fieldKey} -> "${mapping.header}"`);
    console.log(`   Reason: ${mapping.reasoning}`);
    console.log(`   Confidence: ${(mapping.confidence * 100).toFixed(1)}%`);
  });
  
  // Log unmapped fields
  LOGICAL_FIELDS.forEach(field => {
    if (!result.mappings[field.key]) {
      console.log(`❌ ${field.key} -> Not mapped`);
      if (field.required) {
        console.log(`   ⚠️  This is a REQUIRED field!`);
      }
    }
  });
  
  // Log exclusions
  if (result.excludedHeaders.length > 0) {
    console.log("🚫 Excluded headers:");
    result.excludedHeaders.forEach(exclusion => {
      console.log(`   "${exclusion.header}" - ${exclusion.reason}`);
    });
  }
  
  // Log unmapped headers
  if (result.unmappedHeaders.length > 0) {
    console.log("📋 Unmapped headers:", result.unmappedHeaders.join(', '));
  }
}

/**
 * Extension point for adding new field mappings
 * This allows for easy expansion without modifying the core mapping logic
 */
export function addCustomFieldMapping(
  fieldKey: string,
  config: FieldMappingConfig
): void {
  // Type assertion for extensibility - in future versions we might want to make this more type-safe
  (CANONICAL_FIELD_MAPPING as any)[fieldKey] = config;
}

/**
 * Validates that all required fields have been mapped
 */
export function validateRequiredMappings(mappings: Record<string, string>): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields = LOGICAL_FIELDS
    .filter(field => field.required && !mappings[field.key])
    .map(field => field.key);
    
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
} 