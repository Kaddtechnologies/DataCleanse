// src/ai/rules/smart-duplicate-rules.ts

/**
 * Comprehensive Smart Rules Engine for Duplicate Detection
 * Based on Oddball Production Examples and Real-World Business Scenarios
 */

export interface DuplicateAnalysisInput {
    record1: Record<string, string>;
    record2: Record<string, string>;
    fuzzyScore: number;
    originalConfidence?: string;
  }
  
  export interface RuleResult {
    ruleType: string;
    ruleName: string;
    confidence: 'high' | 'medium' | 'low';
    confidenceScore: number; // 0-100
    recommendation: 'merge' | 'review' | 'reject' | 'flag';
    reasoning: string;
    businessJustification?: string;
    flags: string[];
    exemptionReason?: string;
  }
  
  export interface SmartAnalysisResult {
    finalConfidence: 'high' | 'medium' | 'low';
    finalConfidenceScore: number;
    recommendation: 'merge' | 'review' | 'reject' | 'flag';
    appliedRules: RuleResult[];
    businessContext: string;
    riskFactors: string[];
    exemptions: string[];
    detailedAnalysis: {
      nameAnalysis: NameAnalysisResult;
      addressAnalysis: AddressAnalysisResult;
      businessAnalysis: BusinessAnalysisResult;
      dataQualityAnalysis: DataQualityResult;
    };
  }
  
  interface NameAnalysisResult {
    similarity: number;
    variations: string[];
    entityType: 'company' | 'person' | 'division' | 'unknown';
    parentChildRelation: boolean;
    jointVentureIndicators: string[];
  }
  
  interface AddressAnalysisResult {
    similarity: number;
    sameBuilding: boolean;
    sameCity: boolean;
    poBoxVsStreet: boolean;
    dropShipIndicators: string[];
    geographicProximity: 'same' | 'adjacent' | 'nearby' | 'distant';
  }
  
  interface BusinessAnalysisResult {
    industryMatch: boolean;
    vatMatches: boolean;
    possibleRelationship: string[];
    businessType: string[];
    operationalFlags: string[];
  }
  
  interface DataQualityResult {
    completeness: number;
    validity: number;
    consistency: number;
    issues: string[];
  }
  
  // === CORE RULES ENGINE ===
  
  export class SmartDuplicateRulesEngine {
    
    /**
     * Main analysis function that applies all rules intelligently
     */
    public async analyzeRecords(input: DuplicateAnalysisInput): Promise<SmartAnalysisResult> {
      const detailedAnalysis = await this.performDetailedAnalysis(input);
      const appliedRules = await this.applyAllRules(input, detailedAnalysis);
      
      return this.synthesizeResults(input, detailedAnalysis, appliedRules);
    }
  
    /**
     * Detailed multi-layered analysis of record pairs
     */
    private async performDetailedAnalysis(input: DuplicateAnalysisInput) {
      return {
        nameAnalysis: this.analyzeNames(input.record1, input.record2),
        addressAnalysis: this.analyzeAddresses(input.record1, input.record2),
        businessAnalysis: this.analyzeBusiness(input.record1, input.record2),
        dataQualityAnalysis: this.analyzeDataQuality(input.record1, input.record2)
      };
    }
  
    /**
     * Apply all business rules and return results
     */
    private async applyAllRules(
      input: DuplicateAnalysisInput, 
      analysis: any
    ): Promise<RuleResult[]> {
      const results: RuleResult[] = [];
  
      // Apply rules in priority order
      results.push(...this.applyJointVentureRules(input, analysis));
      // results.push(...this.applyHierarchyRules(input, analysis)); // TODO: Implement this method
      results.push(...this.applyGeographicRules(input, analysis));
      results.push(...this.applyBusinessTypeRules(input, analysis));
      results.push(...this.applyDataQualityRules(input, analysis));
      results.push(...this.applyFreightForwarderRules(input, analysis));
      results.push(...this.applyTestAccountRules(input, analysis));
      results.push(...this.applyContactVsCustomerRules(input, analysis));
      results.push(...this.applyAcquisitionRules(input, analysis));
      results.push(...this.applyDropShipRules(input, analysis));
  
      return results.filter(r => r.confidence !== null);
    }
  
    // === RULE IMPLEMENTATIONS ===
  
    /**
     * RULE SET 1: Joint Venture & Partnership Detection
     * Based on Oddball examples: Ruhr Oel GmbH, ExxonMobil, INOVYN cases
     */
    private applyJointVentureRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      // Joint venture indicators
      const jvKeywords = [
        'joint venture', 'jv', 'partnership', 'consortium', 
        'alliance', 'venture', 'holdings', 'group'
      ];
  
      const r1Name = record1.customer_name?.toLowerCase() || record1.name?.toLowerCase() || '';
      const r2Name = record2.customer_name?.toLowerCase() || record2.name?.toLowerCase() || '';
  
      // Check for joint venture indicators
      const r1HasJV = jvKeywords.some(kw => r1Name.includes(kw));
      const r2HasJV = jvKeywords.some(kw => r2Name.includes(kw));
  
      // Check for shared parent company names
      const sharedParentIndicators = this.findSharedParentIndicators(r1Name, r2Name);
  
      if ((r1HasJV || r2HasJV) && sharedParentIndicators.length > 0) {
        results.push({
          ruleType: 'business_relationship',
          ruleName: 'joint_venture_detection',
          confidence: 'low',
          confidenceScore: 25,
          recommendation: 'review',
          reasoning: `Potential joint venture relationship detected. Found JV indicators: ${sharedParentIndicators.join(', ')}`,
          businessJustification: 'Joint ventures often require separate records for different business lines or reporting structures',
          flags: ['joint_venture', 'business_relationship'],
          exemptionReason: 'Legitimate business relationship - may require separate records'
        });
      }
  
      // Division/subsidiary detection
      if (this.isPossibleDivision(r1Name, r2Name)) {
        results.push({
          ruleType: 'hierarchy',
          ruleName: 'division_subsidiary_detection',
          confidence: 'medium',
          confidenceScore: 40,
          recommendation: 'review',
          reasoning: 'Possible parent/subsidiary or division relationship detected',
          businessJustification: 'Different divisions may legitimately require separate customer records',
          flags: ['division', 'hierarchy'],
          exemptionReason: 'Potential legitimate division structure'
        });
      }
  
      return results;
    }
  
    /**
     * RULE SET 2: Geographic & Address Analysis
     * Based on Oddball examples: Same address different companies, PO Box variations
     */
    private applyGeographicRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      const addr1 = this.normalizeAddress(record1.address || '');
      const addr2 = this.normalizeAddress(record2.address || '');
      const city1 = record1.city?.toLowerCase() || '';
      const city2 = record2.city?.toLowerCase() || '';
  
      // Same address, different companies
      if (this.isSameAddress(addr1, addr2) && city1 === city2) {
        const namesSimilar = this.calculateNameSimilarity(
          record1.customer_name || record1.name || '',
          record2.customer_name || record2.name || ''
        ) > 0.7;
  
        if (!namesSimilar) {
          results.push({
            ruleType: 'geographic',
            ruleName: 'same_address_different_names',
            confidence: 'low',
            confidenceScore: 20,
            recommendation: 'review',
            reasoning: 'Same address but significantly different company names - possible shared building or different business units',
            businessJustification: 'Multiple legitimate businesses can operate from the same address',
            flags: ['shared_address', 'different_entities'],
            exemptionReason: 'Shared physical location - legitimate separate entities'
          });
        } else {
          // NEW: Add positive rule for same address with similar names
          results.push({
            ruleType: 'geographic',
            ruleName: 'same_address_similar_names',
            confidence: 'high',
            confidenceScore: 90,
            recommendation: 'merge',
            reasoning: 'Same address and similar company names - strong indication of duplicate or same entity',
            businessJustification: 'Identical locations with similar names typically represent the same business entity',
            flags: ['identical_location', 'strong_match']
          });
        }
      }
  
      // PO Box vs Street Address
      const r1HasPOBox = /p\.?o\.?\s*box|post\s*office\s*box/i.test(addr1);
      const r2HasPOBox = /p\.?o\.?\s*box|post\s*office\s*box/i.test(addr2);
  
      if (r1HasPOBox !== r2HasPOBox && city1 === city2) {
        results.push({
          ruleType: 'geographic',
          ruleName: 'po_box_street_variation',
          confidence: 'medium',
          confidenceScore: 60,
          recommendation: 'review',
          reasoning: 'One record uses PO Box, other uses street address in same city - likely same entity with different mailing preferences',
          flags: ['address_variation', 'po_box_street']
        });
      }
  
      // Adjacent/nearby detection (like SES next to Rosscor example)
      if (this.isAdjacentAddress(addr1, addr2) && city1 === city2) {
        results.push({
          ruleType: 'geographic',
          ruleName: 'adjacent_addresses',
          confidence: 'low',
          confidenceScore: 30,
          recommendation: 'review',
          reasoning: 'Companies appear to be at adjacent addresses - could be related or completely separate entities',
          flags: ['adjacent_location', 'geographic_proximity']
        });
      }
  
      return results;
    }
  
    /**
     * RULE SET 3: Business Type & Industry Analysis
     */
    private applyBusinessTypeRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      // Different industry codes but same company
      const industry1 = record1.industry || record1.sic || '';
      const industry2 = record2.industry || record2.sic || '';
  
      if (industry1 && industry2 && industry1 !== industry2) {
        const namesSimilar = this.calculateNameSimilarity(
          record1.customer_name || record1.name || '',
          record2.customer_name || record2.name || ''
        ) > 0.8;
  
        if (namesSimilar) {
          results.push({
            ruleType: 'business_type',
            ruleName: 'same_company_different_industries',
            confidence: 'medium',
            confidenceScore: 70,
            recommendation: 'review',
            reasoning: 'Same company name but different industry codes - possible multi-industry company like ExxonMobil (Oil & Chemical)',
            businessJustification: 'Large companies often operate in multiple industries requiring separate tracking',
            flags: ['multi_industry', 'business_diversification'],
            exemptionReason: 'Legitimate multi-industry business operations'
          });
        }
      }
  
      return results;
    }
  
    /**
     * RULE SET 4: Data Quality & Validation Rules
     */
    private applyDataQualityRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      // Missing critical data
      const r1MissingData = this.getMissingCriticalFields(record1);
      const r2MissingData = this.getMissingCriticalFields(record2);
  
      if (r1MissingData.length > 0 || r2MissingData.length > 0) {
        results.push({
          ruleType: 'data_quality',
          ruleName: 'missing_critical_data',
          confidence: 'low',
          confidenceScore: 35,
          recommendation: 'review',
          reasoning: `Missing critical data fields: ${[...r1MissingData, ...r2MissingData].join(', ')}`,
          flags: ['data_quality', 'missing_data']
        });
      }
  
      // Invalid or test data patterns
      if (this.hasTestDataPatterns(record1) || this.hasTestDataPatterns(record2)) {
        results.push({
          ruleType: 'data_quality',
          ruleName: 'test_data_detected',
          confidence: 'low',
          confidenceScore: 10,
          recommendation: 'flag',
          reasoning: 'Test or dummy data patterns detected - requires manual review',
          flags: ['test_data', 'invalid_data']
        });
      }
  
      return results;
    }
  
    /**
     * RULE SET 5: Freight Forwarder & Intermediate Consignee Detection
     */
    private applyFreightForwarderRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      const freightKeywords = [
        'freight', 'forwarder', 'logistics', 'shipping', 'cargo',
        'transport', 'forwarding', 'express', 'courier', 'delivery'
      ];
  
      const r1Name = record1.customer_name?.toLowerCase() || record1.name?.toLowerCase() || '';
      const r2Name = record2.customer_name?.toLowerCase() || record2.name?.toLowerCase() || '';
  
      const r1IsFreight = freightKeywords.some(kw => r1Name.includes(kw));
      const r2IsFreight = freightKeywords.some(kw => r2Name.includes(kw));
  
      if (r1IsFreight || r2IsFreight) {
        results.push({
          ruleType: 'business_type',
          ruleName: 'freight_forwarder_detection',
          confidence: 'low',
          confidenceScore: 25,
          recommendation: 'flag',
          reasoning: 'Freight forwarder detected - these are typically intermediate consignees for drop shipments',
          businessJustification: 'Freight forwarders require special handling for export control and accurate reporting',
          flags: ['freight_forwarder', 'intermediate_consignee'],
          exemptionReason: 'Freight forwarder - requires special business handling'
        });
      }
  
      return results;
    }
  
    /**
     * RULE SET 6: Test Account Detection
     */
    private applyTestAccountRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      if (this.isTestAccount(record1) || this.isTestAccount(record2)) {
        results.push({
          ruleType: 'data_quality',
          ruleName: 'test_account_detected',
          confidence: 'low',
          confidenceScore: 5,
          recommendation: 'flag',
          reasoning: 'Test or dummy account detected - should not be merged with production data',
          flags: ['test_account', 'exclude_from_merge']
        });
      }
  
      return results;
    }
  
    /**
     * RULE SET 7: Contact vs Customer Detection
     */
    private applyContactVsCustomerRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      if (this.isPersonContact(record1) || this.isPersonContact(record2)) {
        results.push({
          ruleType: 'entity_type',
          ruleName: 'contact_vs_customer',
          confidence: 'low',
          confidenceScore: 20,
          recommendation: 'flag',
          reasoning: 'Person contact detected - should not be merged with company customer records',
          businessJustification: 'Contacts and customers require different data structures and workflows',
          flags: ['person_contact', 'wrong_entity_type']
        });
      }
  
      return results;
    }
  
    /**
     * RULE SET 8: Acquisition Detection
     */
    private applyAcquisitionRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      // Same address and phone, different names - possible acquisition
      const sameAddress = this.isSameAddress(record1.address || '', record2.address || '');
      const samePhone = this.isSamePhone(record1.phone || '', record2.phone || '');
      const differentNames = this.calculateNameSimilarity(
        record1.customer_name || record1.name || '',
        record2.customer_name || record2.name || ''
      ) < 0.6;
  
      if (sameAddress && samePhone && differentNames) {
        results.push({
          ruleType: 'business_relationship',
          ruleName: 'possible_acquisition',
          confidence: 'medium',
          confidenceScore: 65,
          recommendation: 'review',
          reasoning: 'Same address and phone but different company names - possible acquisition or merger',
          businessJustification: 'Acquisitions require careful handling to maintain historical data integrity',
          flags: ['acquisition', 'merger', 'name_change']
        });
      }
  
      return results;
    }
  
    /**
     * RULE SET 9: Drop Ship Detection
     */
    private applyDropShipRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
      const results: RuleResult[] = [];
      const { record1, record2 } = input;
  
      const dropShipIndicators = ['c/o', 'care of', 'attention:', 'attn:', 'drop ship', 'ship to'];
      
      const addr1 = record1.address?.toLowerCase() || '';
      const addr2 = record2.address?.toLowerCase() || '';
  
      const r1HasDropShip = dropShipIndicators.some(indicator => addr1.includes(indicator));
      const r2HasDropShip = dropShipIndicators.some(indicator => addr2.includes(indicator));
  
      if (r1HasDropShip || r2HasDropShip) {
        results.push({
          ruleType: 'business_type',
          ruleName: 'drop_ship_detection',
          confidence: 'low',
          confidenceScore: 30,
          recommendation: 'review',
          reasoning: 'Drop ship address detected - this may be a temporary shipping address, not the customer location',
          businessJustification: 'Drop ship addresses should be treated as separate entities from the actual customer',
          flags: ['drop_ship', 'temporary_address'],
          exemptionReason: 'Drop ship arrangement - separate from main customer record'
        });
      }
  
      return results;
    }
  
    // === SYNTHESIS & FINAL DECISION ===
  
    /**
     * Synthesize all rule results into final recommendation
     */
    private synthesizeResults(
      input: DuplicateAnalysisInput,
      detailedAnalysis: any,
      appliedRules: RuleResult[]
    ): SmartAnalysisResult {
      
      // Calculate weighted confidence score
      let totalScore = input.fuzzyScore * 100;
      let totalWeight = 1;
  
      for (const rule of appliedRules) {
        totalScore += rule.confidenceScore * this.getRuleWeight(rule.ruleType);
        totalWeight += this.getRuleWeight(rule.ruleType);
      }
  
      const finalScore = totalScore / totalWeight;
  
      // Determine final confidence and recommendation
      const { confidence, recommendation } = this.calculateFinalDecision(finalScore, appliedRules);
  
      // Extract business context and risk factors
      const businessContext = this.generateBusinessContext(appliedRules);
      const riskFactors = this.extractRiskFactors(appliedRules);
      const exemptions = appliedRules
        .filter(r => r.exemptionReason)
        .map(r => r.exemptionReason!);
  
      return {
        finalConfidence: confidence,
        finalConfidenceScore: Math.round(finalScore),
        recommendation,
        appliedRules,
        businessContext,
        riskFactors,
        exemptions,
        detailedAnalysis
      };
    }
  
    // === HELPER METHODS ===
  
    private calculateNameSimilarity(name1: string, name2: string): number {
      // Implement fuzzy string matching
      const n1 = this.normalizeName(name1);
      const n2 = this.normalizeName(name2);
      
      if (n1 === n2) return 1.0;
      
      // Simple Jaro-Winkler approximation
      const maxLen = Math.max(n1.length, n2.length);
      const distance = this.levenshteinDistance(n1, n2);
      return 1 - (distance / maxLen);
    }
  
    private normalizeName(name: string): string {
      return name
        .toLowerCase()
        .replace(/\b(inc|corp|ltd|llc|company|co)\b/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  
    private normalizeAddress(address: string): string {
      return address
        .toLowerCase()
        .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  
    private isSameAddress(addr1: string, addr2: string): boolean {
      const norm1 = this.normalizeAddress(addr1);
      const norm2 = this.normalizeAddress(addr2);
      return norm1 === norm2 || this.calculateSimilarity(norm1, norm2) > 0.85;
    }
  
    private isAdjacentAddress(addr1: string, addr2: string): boolean {
      // Check if addresses are adjacent (next door)
      const num1 = this.extractStreetNumber(addr1);
      const num2 = this.extractStreetNumber(addr2);
      const street1 = this.extractStreetName(addr1);
      const street2 = this.extractStreetName(addr2);
      
      // If addresses are identical, they are NOT adjacent - they are the same
      if (num1 === num2 && street1 === street2) {
        return false;
      }
      
      // Only consider adjacent if street names match and numbers are 1-2 apart (not 0)
      return street1 === street2 && Math.abs(num1 - num2) >= 1 && Math.abs(num1 - num2) <= 2;
    }
  
    private findSharedParentIndicators(name1: string, name2: string): string[] {
      const commonWords = ['corp', 'group', 'holdings', 'international', 'global'];
      const shared: string[] = [];
      
      for (const word of commonWords) {
        if (name1.includes(word) && name2.includes(word)) {
          shared.push(word);
        }
      }
      
      return shared;
    }
  
    private isPossibleDivision(name1: string, name2: string): boolean {
      const divisionKeywords = ['division', 'unit', 'subsidiary', 'branch', 'department'];
      return divisionKeywords.some(kw => name1.includes(kw) || name2.includes(kw));
    }
  
    private isTestAccount(record: Record<string, string>): boolean {
      const name = record.customer_name?.toLowerCase() || record.name?.toLowerCase() || '';
      
      // More specific test patterns for company names
      const testPatterns = [
        /^test\b/,              // starts with "test"
        /\btest$/,              // ends with "test"
        /^dummy\b/,             // starts with "dummy"
        /\bdummy$/,             // ends with "dummy"
        /^sample\b/,            // starts with "sample"
        /\bsample$/,            // ends with "sample"
        /^example\b/,           // starts with "example"
        /\bexample$/,           // ends with "example"
        /^demo\b/,              // starts with "demo"
        /\bdemo$/,              // ends with "demo"
        /^test.*company$/,      // "test something company"
        /^dummy.*corp$/,        // "dummy something corp"
        /^sample.*inc$/,        // "sample something inc"
        /^1{6,}$/,              // 6 or more 1's
        /^2{6,}$/,              // 6 or more 2's
        /^0{6,}$/,              // 6 or more 0's
        /^z{3,}$/,              // 3 or more z's
        /^x{3,}$/               // 3 or more x's
      ];
      
      return testPatterns.some(pattern => pattern.test(name));
    }
  
    private isPersonContact(record: Record<string, string>): boolean {
      const name = record.customer_name || record.name || '';
      
      // Check for common person name patterns
      const personPatterns = [
        /^[A-Z][a-z]+ [A-Z][a-z]+$/, // First Last
        /^[A-Z][a-z]+, [A-Z][a-z]+$/, // Last, First
        /\b(mr|mrs|ms|dr|prof)\b/i
      ];
      
      return personPatterns.some(pattern => pattern.test(name));
    }
  
    private hasTestDataPatterns(record: Record<string, string>): boolean {
      // More specific test patterns that focus on obvious test data
      // Exclude TPI numbers and other legitimate ID fields from this check
      const nonIdFields = Object.entries(record)
        .filter(([key, _]) => 
          !key.toLowerCase().includes('tpi') && 
          !key.toLowerCase().includes('id') &&
          !key.toLowerCase().includes('uid') &&
          !key.toLowerCase().includes('number') &&
          !key.toLowerCase().includes('code')
        );
      
      if (nonIdFields.length === 0) return false;
      
      const values = nonIdFields.map(([_, value]) => value).join(' ').toLowerCase();
      
      // More specific test patterns - focus on obvious test data
      const testPatterns = [
        /\btest\b/,           // standalone word "test"
        /\bdummy\b/,          // standalone word "dummy"  
        /\bsample\b/,         // standalone word "sample"
        /^n\/a$/,             // exactly "n/a"
        /^tbd$/,              // exactly "tbd"
        /^xxx+$/,             // all x's
        /^test.*company$/,    // "test something company"
        /^dummy.*corp$/,      // "dummy something corp"
        /example\.com$/,      // test email domains
        /test\.com$/,
        /dummy\.com$/
      ];
      
      return testPatterns.some(pattern => pattern.test(values));
    }
  
    private getMissingCriticalFields(record: Record<string, string>): string[] {
      const missing: string[] = [];
      
      // Check for name field - accept either 'customer_name' OR 'name'
      if ((!record['customer_name'] || record['customer_name'].trim() === '') && 
          (!record['name'] || record['name'].trim() === '')) {
        missing.push('name');
      }
      
      // Check for address field
      if (!record['address'] || record['address'].trim() === '') {
        missing.push('address');
      }
      
      return missing;
    }
  
    private isSamePhone(phone1: string, phone2: string): boolean {
      const cleanPhone = (p: string) => p.replace(/\D/g, '');
      return cleanPhone(phone1) === cleanPhone(phone2);
    }
  
    private extractStreetNumber(address: string): number {
      const match = address.match(/^\d+/);
      return match ? parseInt(match[0]) : 0;
    }
  
    private extractStreetName(address: string): string {
      return address.replace(/^\d+\s*/, '').toLowerCase();
    }
  
    private levenshteinDistance(str1: string, str2: string): number {
      const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
      
      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
      
      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + indicator
          );
        }
      }
      
      return matrix[str2.length][str1.length];
    }
  
    private calculateSimilarity(str1: string, str2: string): number {
      const maxLen = Math.max(str1.length, str2.length);
      if (maxLen === 0) return 1.0;
      return 1 - (this.levenshteinDistance(str1, str2) / maxLen);
    }
  
    private getRuleWeight(ruleType: string): number {
      const weights: { [key: string]: number } = {
        'business_relationship': 0.9,
        'hierarchy': 0.8,
        'geographic': 0.7,
        'business_type': 0.6,
        'entity_type': 0.8,
        'data_quality': 0.5
      };
      return weights[ruleType] || 0.5;
    }
  
    private calculateFinalDecision(score: number, rules: RuleResult[]): { confidence: 'high' | 'medium' | 'low', recommendation: 'merge' | 'review' | 'reject' | 'flag' } {
      // Check for exemptions or flags
      const hasExemption = rules.some(r => r.exemptionReason);
      const hasFlags = rules.some(r => r.recommendation === 'flag');
      
      if (hasFlags) {
        return { confidence: 'low', recommendation: 'flag' };
      }
      
      if (hasExemption) {
        return { confidence: 'low', recommendation: 'review' };
      }
      
      if (score >= 85) {
        return { confidence: 'high', recommendation: 'merge' };
      } else if (score >= 65) {
        return { confidence: 'medium', recommendation: 'review' };
      } else {
        return { confidence: 'low', recommendation: 'reject' };
      }
    }
  
    private generateBusinessContext(rules: RuleResult[]): string {
      const contexts = rules
        .filter(r => r.businessJustification)
        .map(r => r.businessJustification!);
      
      return contexts.length > 0 
        ? contexts.join('. ')
        : 'Standard duplicate detection analysis applied.';
    }
  
    private extractRiskFactors(rules: RuleResult[]): string[] {
      return rules.flatMap(r => r.flags || []);
    }
  
    // Additional analysis methods would be implemented here...
    private analyzeNames(record1: Record<string, string>, record2: Record<string, string>): NameAnalysisResult {
      // Implementation for detailed name analysis
      return {
        similarity: 0,
        variations: [],
        entityType: 'unknown',
        parentChildRelation: false,
        jointVentureIndicators: []
      };
    }
  
    private analyzeAddresses(record1: Record<string, string>, record2: Record<string, string>): AddressAnalysisResult {
      // Implementation for detailed address analysis
      return {
        similarity: 0,
        sameBuilding: false,
        sameCity: false,
        poBoxVsStreet: false,
        dropShipIndicators: [],
        geographicProximity: 'distant'
      };
    }
  
    private analyzeBusiness(record1: Record<string, string>, record2: Record<string, string>): BusinessAnalysisResult {
      // Implementation for business analysis
      return {
        industryMatch: false,
        vatMatches: false,
        possibleRelationship: [],
        businessType: [],
        operationalFlags: []
      };
    }
  
    private analyzeDataQuality(record1: Record<string, string>, record2: Record<string, string>): DataQualityResult {
      // Implementation for data quality analysis
      return {
        completeness: 0,
        validity: 0,
        consistency: 0,
        issues: []
      };
    }
  }