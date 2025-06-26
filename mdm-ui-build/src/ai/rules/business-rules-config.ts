// src/ai/rules/business-rules-config.ts

/**
 * Centralized Business Rules Configuration
 * Based on Oddball Production Examples and Real-World Scenarios
 * 
 * This file contains all the business rules patterns, keywords, and thresholds
 * that can be easily modified without changing the core rules engine logic.
 */

export interface RuleConfiguration {
    enabled: boolean;
    priority: number; // 1-10, higher = more important
    confidenceAdjustment: number; // -100 to +100
    patterns: string[];
    keywords?: string[];
    thresholds?: Record<string, number>;
    exemptionMessage?: string;
    businessJustification?: string;
  }
  
  export interface BusinessRulesConfig {
    jointVenture: RuleConfiguration;
    hierarchy: RuleConfiguration;
    geographic: RuleConfiguration;
    industry: RuleConfiguration;
    freightForwarder: RuleConfiguration;
    testAccounts: RuleConfiguration;
    contacts: RuleConfiguration;
    acquisition: RuleConfiguration;
    dropShip: RuleConfiguration;
    dataQuality: RuleConfiguration;
    nameVariations: RuleConfiguration;
    addressVariations: RuleConfiguration;
    phoneVariations: RuleConfiguration;
    vatNumbers: RuleConfiguration;
  }
  
  /**
   * Default Business Rules Configuration
   * Based on patterns found in Oddball Production Examples
   */
  export const DEFAULT_BUSINESS_RULES_CONFIG: BusinessRulesConfig = {
    
    // JOINT VENTURE & PARTNERSHIP RULES
    jointVenture: {
      enabled: true,
      priority: 9, // High priority - business critical
      confidenceAdjustment: -50, // Significantly reduce confidence for potential JVs
      patterns: [
        // Based on Ruhr Oel GmbH (BP + Rosneft), ExxonMobil examples
        'joint venture', 'jv', 'partnership', 'consortium', 'alliance', 'venture',
        'holdings', 'group', 'cooperative', 'co-op', 'collaboration',
        // German/European JV patterns
        'gmbh', 'ag', 'se', 'beteiligung', 'holding',
        // Oil & Gas specific JV patterns  
        'upstream', 'downstream', 'midstream', 'exploration', 'production'
      ],
      keywords: [
        'bp', 'rosneft', 'exxonmobil', 'shell', 'chevron', 'total', 'conocophillips',
        'ineos', 'solvay', 'basf', 'dow', 'dupont', 'lyondellbasell'
      ],
      thresholds: {
        nameOverlap: 0.3, // If 30% of company names overlap, check for JV
        sharedKeywords: 2   // If 2+ shared parent company keywords
      },
      exemptionMessage: 'Joint ventures often require separate records for different business lines or reporting structures',
      businessJustification: 'Companies like Ruhr Oel GmbH (BP + Rosneft joint venture) legitimately need separate customer records for proper business tracking and compliance'
    },
  
    // HIERARCHY & SUBSIDIARY RULES  
    hierarchy: {
      enabled: true,
      priority: 8,
      confidenceAdjustment: -30,
      patterns: [
        'division', 'subsidiary', 'sub', 'branch', 'unit', 'department', 'dept',
        'operations', 'ops', 'services', 'solutions', 'technologies', 'tech',
        'americas', 'europe', 'asia', 'pacific', 'north america', 'emea',
        'inc', 'corp', 'corporation', 'company', 'co', 'ltd', 'limited',
        'llc', 'plc', 'sa', 'bv', 'nv', 'spa', 'srl'
      ],
      keywords: [
        'parent', 'child', 'subsidiary', 'division', 'holding', 'group'
      ],
      thresholds: {
        nameSimilarity: 0.6, // 60% similar names with hierarchy indicators
        hierarchyWords: 1     // At least 1 hierarchy keyword
      },
      exemptionMessage: 'Different divisions may legitimately require separate customer records',
      businessJustification: 'Large corporations often have multiple divisions (like ExxonMobil Oil&Gas vs Chemical) that require separate tracking'
    },
  
    // GEOGRAPHIC & ADDRESS RULES
    geographic: {
      enabled: true,
      priority: 7,
      confidenceAdjustment: 20, // Slightly increase confidence for geographic matches
      patterns: [
        // PO Box patterns
        'p.o. box', 'po box', 'p o box', 'post office box', 'postal box',
        'pob', 'p.o.b', 'postbox', 'mail box', 'mailbox',
        // Street patterns  
        'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr',
        'lane', 'ln', 'boulevard', 'blvd', 'way', 'place', 'pl',
        'circle', 'cir', 'court', 'ct', 'terrace', 'ter',
        // Building/Suite patterns
        'suite', 'ste', 'unit', 'apt', 'apartment', 'floor', 'fl',
        'building', 'bldg', 'tower', 'center', 'centre', 'complex'
      ],
      keywords: [
        'same', 'adjacent', 'next door', 'nearby', 'neighboring'
      ],
      thresholds: {
        addressSimilarity: 0.8,   // 80% similar addresses
        cityMatch: 1.0,           // Must be same city
        adjacentRange: 5          // Within 5 street numbers = adjacent
      },
      businessJustification: 'Multiple legitimate businesses can operate from the same address or adjacent locations'
    },
  
    // INDUSTRY & BUSINESS TYPE RULES
    industry: {
      enabled: true,
      priority: 6,
      confidenceAdjustment: -20,
      patterns: [
        // Oil & Gas industries
        'oil', 'gas', 'petroleum', 'energy', 'refining', 'petrochemical',
        'upstream', 'downstream', 'exploration', 'production', 'drilling',
        // Chemical industries  
        'chemical', 'chemicals', 'specialty', 'basic', 'industrial',
        'polymer', 'plastics', 'resin', 'coating', 'paint',
        // Power & Utilities
        'power', 'electric', 'utility', 'generation', 'transmission',
        'renewable', 'nuclear', 'coal', 'biomass', 'solar', 'wind'
      ],
      keywords: [
        'multi-industry', 'diversified', 'conglomerate', 'multiple sectors'
      ],
      thresholds: {
        industryDifference: 0.5, // Different SIC codes but 50%+ name similarity
        sicCodeGap: 1000         // SIC codes more than 1000 apart
      },
      exemptionMessage: 'Large companies often operate in multiple industries requiring separate tracking',
      businessJustification: 'Companies like ExxonMobil legitimately operate in both Oil&Gas and Chemical industries with different customer requirements'
    },
  
    // FREIGHT FORWARDER & LOGISTICS RULES
    freightForwarder: {
      enabled: true,
      priority: 9, // High priority for export control compliance
      confidenceAdjustment: -60, // Strong reduction - usually not duplicates
      patterns: [
        'freight', 'forwarder', 'forwarding', 'logistics', 'shipping',
        'cargo', 'transport', 'transportation', 'express', 'courier',
        'delivery', 'distribution', 'supply chain', 'scm',
        'international shipping', 'global logistics', 'air freight',
        'ocean freight', 'customs', 'brokerage', 'clearance'
      ],
      keywords: [
        'dhl', 'fedex', 'ups', 'tnt', 'kuehne nagel', 'db schenker',
        'expeditors', 'ch robinson', 'panalpina', 'agility', 'dsv'
      ],
      thresholds: {
        keywordMatch: 1, // Just one freight keyword triggers this rule
        sicCode: 470000  // Flowserve's SIC code for freight forwarders
      },
      exemptionMessage: 'Freight forwarder - requires special business handling',
      businessJustification: 'Freight forwarders are intermediate consignees for drop shipments and require special handling for export control and accurate reporting'
    },
  
    // TEST ACCOUNT DETECTION RULES
    testAccounts: {
      enabled: true,
      priority: 10, // Highest priority - data integrity critical
      confidenceAdjustment: -90, // Almost never merge test accounts
      patterns: [
        'test', 'testing', 'dummy', 'sample', 'example', 'demo',
        'trial', 'temp', 'temporary', 'placeholder', 'debug',
        'development', 'dev', 'staging', 'qa', 'quality assurance',
        // Pattern-based test indicators
        '111111', '222222', '333333', '444444', '555555',
        '666666', '777777', '888888', '999999', '000000',
        'zzz', 'xxx', 'aaa', 'bbb', 'ccc', '123456', 'abcdef',
        // Real examples from Oddball deck
        'dummy jordi salvado', 'no existe', '44444444', 'pending tpi'
      ],
      keywords: [
        'test account', 'dummy account', 'development account', 'qa account'
      ],
      thresholds: {
        testPatternMatch: 1, // Any test pattern triggers this rule
        allNumbers: 6,       // 6+ repeated numbers
        allLetters: 3        // 3+ repeated letters
      },
      businessJustification: 'Test accounts should never be merged with production customer data to maintain data integrity'
    },
  
    // CONTACT VS CUSTOMER DETECTION
    contacts: {
      enabled: true,
      priority: 8,
      confidenceAdjustment: -70, // Strong reduction - contacts are not customers
      patterns: [
        // Title patterns
        'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'professor',
        'phd', 'md', 'dds', 'jr', 'sr', 'ii', 'iii',
        // Name patterns (First Last, Last First)
        '^[A-Z][a-z]+ [A-Z][a-z]+$',
        '^[A-Z][a-z]+, [A-Z][a-z]+$',
        // Personal email patterns
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'icloud.com', 'me.com'
      ],
      keywords: [
        'contact', 'person', 'individual', 'personal', 'consultant'
      ],
      thresholds: {
        personalEmailDomain: 1, // Personal email domain detected
        namePattern: 0.8        // 80% match to person name pattern
      },
      exemptionMessage: 'Person contact detected - should not be merged with company customer records',
      businessJustification: 'Contacts and customers require different data structures, workflows, and validation processes'
    },
  
    // ACQUISITION & MERGER DETECTION
    acquisition: {
      enabled: true,
      priority: 7,
      confidenceAdjustment: 30, // Increase confidence - likely same entity
      patterns: [
        'acquired', 'acquisition', 'merger', 'merged', 'bought',
        'purchased', 'takeover', 'consolidation', 'integration',
        'formerly', 'previously', 'now known as', 'dba', 'doing business as',
        'trading as', 't/a', 'aka', 'also known as'
      ],
      keywords: [
        'name change', 'rebranding', 'corporate restructuring'
      ],
      thresholds: {
        sameAddress: 0.9,         // 90% address similarity
        samePhone: 1.0,           // Exact phone match
        nameSimilarity: 0.4       // Names can be quite different in acquisitions
      },
      businessJustification: 'Acquisitions require careful handling to maintain historical data integrity and business continuity'
    },
  
    // DROP SHIP & TEMPORARY ADDRESS DETECTION
    dropShip: {
      enabled: true,
      priority: 6,
      confidenceAdjustment: -40,
      patterns: [
        'c/o', 'care of', 'in care of', 'attention:', 'attn:', 'att:',
        'drop ship', 'dropship', 'ship to', 'deliver to', 'delivery to',
        'temporary', 'temp', 'project site', 'construction site',
        'job site', 'field office', 'remote location'
      ],
      keywords: [
        'temporary address', 'project address', 'construction address'
      ],
      thresholds: {
        dropShipIndicator: 1 // Any drop ship indicator triggers this rule
      },
      exemptionMessage: 'Drop ship arrangement - separate from main customer record',
      businessJustification: 'Drop ship addresses are temporary shipping locations and should be treated as separate entities from the actual customer'
    },
  
    // DATA QUALITY RULES
    dataQuality: {
      enabled: true,
      priority: 5,
      confidenceAdjustment: -25,
      patterns: [
        'n/a', 'not available', 'unknown', 'tbd', 'to be determined',
        'missing', 'none', 'null', 'empty', 'blank', 'invalid',
        'error', 'corrupt', 'bad data', 'incomplete'
      ],
      keywords: [
        'missing data', 'incomplete record', 'data quality issue'
      ],
      thresholds: {
        missingCriticalFields: 2, // 2+ missing critical fields
        invalidPatterns: 1        // Any invalid data pattern
      },
      businessJustification: 'Records with significant data quality issues require manual review before merging'
    },
  
    // NAME VARIATION RULES
    nameVariations: {
      enabled: true,
      priority: 4,
      confidenceAdjustment: 10,
      patterns: [
        // Legal entity variations
        'incorporated', 'inc', 'corporation', 'corp', 'company', 'co',
        'limited', 'ltd', 'llc', 'plc', 'lp', 'partnership',
        // International variations
        'gmbh', 'ag', 'sa', 'bv', 'nv', 'spa', 'srl', 'ab', 'oy',
        // Common abbreviations
        'international', 'intl', 'global', 'worldwide', 'systems', 'sys',
        'technologies', 'tech', 'solutions', 'services', 'group', 'grp'
      ],
      keywords: [
        'name variation', 'abbreviation', 'legal entity difference'
      ],
      thresholds: {
        coreNameSimilarity: 0.8, // Core business name 80% similar
        legalEntityOnly: 1        // Only legal entity suffix differs
      },
      businessJustification: 'Minor name variations (abbreviations, legal entity suffixes) often represent the same company'
    },
  
    // ADDRESS VARIATION RULES
    addressVariations: {
      enabled: true,
      priority: 4,
      confidenceAdjustment: 15,
      patterns: [
        // Street abbreviations
        'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr',
        'boulevard', 'blvd', 'lane', 'ln', 'way', 'place', 'pl',
        // Direction abbreviations  
        'north', 'n', 'south', 's', 'east', 'e', 'west', 'w',
        'northeast', 'ne', 'northwest', 'nw', 'southeast', 'se', 'southwest', 'sw',
        // Unit/Suite variations
        'suite', 'ste', 'unit', 'apt', 'apartment', '#', 'floor', 'fl'
      ],
      keywords: [
        'address variation', 'formatting difference', 'abbreviation'
      ],
      thresholds: {
        coreAddressSimilarity: 0.85, // Core address 85% similar
        cityMatch: 1.0,              // Must be same city
        zipMatch: 0.8                // ZIP codes 80% similar (handles ZIP+4)
      },
      businessJustification: 'Minor address formatting differences often represent the same physical location'
    },
  
    // PHONE VARIATION RULES
    phoneVariations: {
      enabled: true,
      priority: 3,
      confidenceAdjustment: 20,
      patterns: [
        // Phone formatting patterns will be handled in code
      ],
      keywords: [
        'phone variation', 'formatting difference'
      ],
      thresholds: {
        phoneNumberMatch: 1.0 // Exact match after normalization
      },
      businessJustification: 'Same phone numbers with different formatting represent the same business contact'
    },
  
    // VAT NUMBER RULES
    vatNumbers: {
      enabled: true,
      priority: 8,
      confidenceAdjustment: 50, // Strong positive indicator
      patterns: [
        // VAT number patterns by country
        'gb', 'de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'dk', 'se',
        'vat', 'tax id', 'tax number', 'ein', 'federal id'
      ],
      keywords: [
        'vat match', 'tax id match', 'same legal entity'
      ],
      thresholds: {
        vatMatch: 1.0 // Exact VAT number match
      },
      businessJustification: 'Matching VAT/Tax ID numbers indicate the same legal entity, but multiple records may be legitimate for different business purposes'
    }
  };
  
  /**
   * Rule Priority Constants
   * Used to determine which rules take precedence when multiple rules conflict
   */
  export const RULE_PRIORITIES = {
    CRITICAL: 10,        // Test accounts, data integrity issues
    HIGH: 9,             // Joint ventures, freight forwarders, export control
    MEDIUM_HIGH: 8,      // Hierarchy, contacts vs customers, VAT numbers
    MEDIUM: 7,           // Geographic, acquisitions
    MEDIUM_LOW: 6,       // Industry, drop ship
    LOW: 5,              // Data quality
    INFORMATIONAL: 4,    // Name variations, address variations
    MINIMAL: 3           // Phone variations
  };
  
  /**
   * Confidence Adjustment Guidelines
   * How much each rule type should adjust the final confidence score
   */
  export const CONFIDENCE_ADJUSTMENTS = {
    STRONG_NEGATIVE: -90,  // Test accounts
    NEGATIVE: -60,         // Freight forwarders, contacts
    MODERATE_NEGATIVE: -40, // Drop ship, joint ventures
    SLIGHT_NEGATIVE: -20,  // Industry differences, data quality
    NEUTRAL: 0,            // No adjustment
    SLIGHT_POSITIVE: 10,   // Name variations, address formatting
    MODERATE_POSITIVE: 30, // Acquisitions, geographic proximity
    STRONG_POSITIVE: 50    // VAT number matches
  };
  
  /**
   * Helper function to get rule configuration by name
   */
  export function getRuleConfig(ruleName: keyof BusinessRulesConfig): RuleConfiguration {
    return DEFAULT_BUSINESS_RULES_CONFIG[ruleName];
  }
  
  /**
   * Helper function to update rule configuration
   */
  export function updateRuleConfig(
    ruleName: keyof BusinessRulesConfig, 
    updates: Partial<RuleConfiguration>
  ): BusinessRulesConfig {
    return {
      ...DEFAULT_BUSINESS_RULES_CONFIG,
      [ruleName]: {
        ...DEFAULT_BUSINESS_RULES_CONFIG[ruleName],
        ...updates
      }
    };
  }
  
  /**
   * Helper function to disable a rule
   */
  export function disableRule(ruleName: keyof BusinessRulesConfig): BusinessRulesConfig {
    return updateRuleConfig(ruleName, { enabled: false });
  }
  
  /**
   * Helper function to enable a rule
   */
  export function enableRule(ruleName: keyof BusinessRulesConfig): BusinessRulesConfig {
    return updateRuleConfig(ruleName, { enabled: true });
  }
  
  /**
   * Helper function to get all enabled rules sorted by priority
   */
  export function getEnabledRulesByPriority(): Array<{name: keyof BusinessRulesConfig, config: RuleConfiguration}> {
    return Object.entries(DEFAULT_BUSINESS_RULES_CONFIG)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => b.priority - a.priority)
      .map(([name, config]) => ({
        name: name as keyof BusinessRulesConfig,
        config
      }));
  }