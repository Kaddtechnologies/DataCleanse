import { BusinessRule, RuleResult, RuleCondition, RuleAction } from '@/types/business-rules';
import { CustomerRecord } from '@/types';

export class RuleCodeGenerator {
  /**
   * Generates TypeScript code for a business rule
   */
  generateRuleCode(rule: BusinessRule): string {
    return `// ${rule.name}
// ${rule.description}
// Generated on: ${new Date().toISOString()}

import { BusinessRule, RuleResult } from '@/types/business-rules';
import { CustomerRecord } from '@/types';

export const ${this.sanitizeRuleName(rule.name)}Rule: BusinessRule = {
  id: '${rule.id}',
  name: '${rule.name}',
  description: '${rule.description}',
  category: '${rule.category}',
  priority: ${rule.priority},
  enabled: ${rule.enabled},
  version: '${rule.version}',
  createdAt: ${rule.createdAt ? `new Date('${rule.createdAt}')` : 'new Date()'},
  createdBy: '${rule.createdBy}',
  
  conditions: ${JSON.stringify(rule.conditions, null, 2)},
  
  actions: ${JSON.stringify(rule.actions, null, 2)},
  
  evaluate: async (record1: CustomerRecord, record2: CustomerRecord): Promise<RuleResult> => {
    const result: RuleResult = {
      recommendation: 'review',
      confidence: 'medium',
      confidenceScore: 0.5,
      businessJustification: '',
      dataQualityIssues: [],
      suggestedActions: []
    };
    
    try {
      ${this.generateEvaluationLogic(rule)}
    } catch (error) {
      console.error('Rule evaluation error:', error);
      result.dataQualityIssues.push(\`Error evaluating rule: \${error}\`);
    }
    
    return result;
  }
};`;
  }

  /**
   * Generates the evaluation logic based on rule conditions and actions
   */
  private generateEvaluationLogic(rule: BusinessRule): string {
    const actions = Array.isArray(rule.actions) ? rule.actions : [rule.action];
    
    let logic = '';
    
    // Generate basic condition logic
    logic += `
      // Evaluate rule condition
      const conditionMet = ${rule.condition || 'true'};
      
      if (conditionMet) {
        // Apply rule actions
    `;
    
    // Generate actions
    for (const action of actions) {
      if (action) {
        logic += this.generateAction(action);
      }
    }
    
    logic += `
      }
    `;
    
    return logic;
  }

  private generateFieldComparisons(comparisons: any[]): string {
    return `
      // Field comparisons
      const fieldMatches = {
        name: this.compareFields(record1.name, record2.name),
        address: this.compareFields(record1.address, record2.address),
        city: record1.city?.toLowerCase() === record2.city?.toLowerCase(),
        country: record1.country?.toLowerCase() === record2.country?.toLowerCase()
      };
      
`;
  }

  private generatePatternMatching(patterns: any[]): string {
    let code = '      // Pattern matching\n';
    
    for (const pattern of patterns) {
      code += `      const ${pattern.name}Pattern = ${pattern.regex};\n`;
      code += `      const ${pattern.name}Match1 = ${pattern.name}Pattern.test(record1.${pattern.field});\n`;
      code += `      const ${pattern.name}Match2 = ${pattern.name}Pattern.test(record2.${pattern.field});\n\n`;
    }
    
    return code;
  }

  private generateBusinessLogic(logic: any): string {
    // Generate specific business logic based on category
    if (logic.type === 'energy-division') {
      return this.generateEnergyDivisionLogic();
    } else if (logic.type === 'freight-forwarder') {
      return this.generateFreightForwarderLogic();
    } else if (logic.type === 'geographic-exemption') {
      return this.generateGeographicExemptionLogic();
    }
    
    return '      // Custom business logic\n';
  }

  private generateEnergyDivisionLogic(): string {
    return `
      // Energy division detection
      const energyKeywords = ['chemical', 'oil', 'gas', 'petroleum', 'refinery', 'drilling'];
      const divisionKeywords = ['division', 'subsidiary', 'branch', 'unit', 'department'];
      
      const name1Lower = record1.name.toLowerCase();
      const name2Lower = record2.name.toLowerCase();
      
      // Check if both are energy companies
      const isEnergy1 = energyKeywords.some(keyword => name1Lower.includes(keyword));
      const isEnergy2 = energyKeywords.some(keyword => name2Lower.includes(keyword));
      
      if (isEnergy1 && isEnergy2) {
        // Check if they're different divisions
        const division1 = energyKeywords.find(keyword => name1Lower.includes(keyword));
        const division2 = energyKeywords.find(keyword => name2Lower.includes(keyword));
        
        if (division1 !== division2 && record1.address === record2.address) {
          result.recommendation = 'reject';
          result.confidence = 'high';
          result.confidenceScore = 0.95;
          result.businessJustification = \`Different divisions of the same energy company: \${division1} vs \${division2}\`;
          result.suggestedActions = ['Keep as separate entities', 'Mark as related but distinct'];
          return result;
        }
      }
      
`;
  }

  private generateFreightForwarderLogic(): string {
    return `
      // Freight forwarder detection
      const freightKeywords = ['freight', 'logistics', 'shipping', 'forwarding', 'transport'];
      const locationIndicators = ['branch', 'office', 'location', 'depot'];
      
      const name1Lower = record1.name.toLowerCase();
      const name2Lower = record2.name.toLowerCase();
      
      const isFreight1 = freightKeywords.some(keyword => name1Lower.includes(keyword));
      const isFreight2 = freightKeywords.some(keyword => name2Lower.includes(keyword));
      
      if (isFreight1 && isFreight2) {
        // Same company name but different locations
        const baseName1 = name1Lower.replace(/[^a-z0-9]/g, '');
        const baseName2 = name2Lower.replace(/[^a-z0-9]/g, '');
        
        if (baseName1 === baseName2 && record1.city !== record2.city) {
          result.recommendation = 'reject';
          result.confidence = 'high';
          result.confidenceScore = 0.9;
          result.businessJustification = 'Same freight forwarder, different locations';
          result.suggestedActions = ['Keep as separate locations'];
          return result;
        }
      }
      
`;
  }

  private generateGeographicExemptionLogic(): string {
    return `
      // Geographic exemption logic
      const sameNameDifferentLocation = 
        record1.name.toLowerCase() === record2.name.toLowerCase() &&
        (record1.city !== record2.city || record1.country !== record2.country);
      
      if (sameNameDifferentLocation) {
        // Check if it's a franchise or branch
        const franchiseKeywords = ['franchise', 'branch', 'outlet', 'store'];
        const hasKeyword = franchiseKeywords.some(kw => 
          record1.name.toLowerCase().includes(kw) || 
          record2.name.toLowerCase().includes(kw)
        );
        
        if (hasKeyword || record1.country !== record2.country) {
          result.recommendation = 'reject';
          result.confidence = 'high';
          result.confidenceScore = 0.85;
          result.businessJustification = 'Same brand, different geographic locations';
          result.suggestedActions = ['Keep as separate regional entities'];
          return result;
        }
      }
      
`;
  }

  private generateAction(action: RuleAction): string {
    let code = `
      // Action: ${action.type}
      if (${this.generateActionCondition(action)}) {
        result.recommendation = '${action.recommendation || action.parameters?.recommendation || 'review'}';
        result.confidence = '${action.confidence || action.parameters?.confidence || 'medium'}';
        result.confidenceScore = ${action.confidenceScore || action.parameters?.confidenceScore || 0.5};
        result.businessJustification = '${action.justification || ''}';
        ${action.suggestedActions ? `result.suggestedActions = ${JSON.stringify(action.suggestedActions)};` : ''}
      }
      
`;
    return code;
  }

  private generateActionCondition(action: RuleAction): string {
    if (action.condition) {
      return action.condition;
    }
    return 'true'; // Default condition
  }

  private sanitizeRuleName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^(\d)/, '_$1'); // Ensure doesn't start with number
  }

  /**
   * Generates a helper function for field comparison
   */
  generateHelperFunctions(): string {
    return `
// Helper functions for rule evaluation
function compareFields(field1: string, field2: string): number {
  if (!field1 || !field2) return 0;
  
  const normalized1 = field1.toLowerCase().trim();
  const normalized2 = field2.toLowerCase().trim();
  
  if (normalized1 === normalized2) return 1;
  
  // Fuzzy matching logic here
  return calculateSimilarity(normalized1, normalized2);
}

function calculateSimilarity(str1: string, str2: string): number {
  // Levenshtein distance or other similarity algorithm
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
`;
  }

  /**
   * Converts AI-generated rule description to code
   */
  async generateFromDescription(description: string, context: any): Promise<string> {
    // This would integrate with the AI service to generate code
    // For now, returning a template
    const rule: BusinessRule = {
      id: `rule_${Date.now()}`,
      name: 'AI Generated Rule',
      description: description,
      category: 'business-relationship',
      priority: 5,
      enabled: true,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      createdBy: context.userId || 'system',
      condition: 'true',
      action: {
        type: 'set-recommendation',
        parameters: {
          recommendation: 'review',
          confidence: 'medium',
          confidenceScore: 0.5
        }
      },
      metadata: {
        createdBy: context.userId || 'system',
        createdAt: new Date().toISOString(),
        approvalStatus: 'draft' as const
      },
      tags: []
    };
    
    return this.generateRuleCode(rule);
  }
}

// Export singleton instance
export const ruleCodeGenerator = new RuleCodeGenerator();