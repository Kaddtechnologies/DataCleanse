/**
 * AI-powered Business Rules Generator
 * Uses Azure OpenAI for intelligent rule creation, testing, and improvement
 */

import { serverConfig } from '@/config/environment';
import { 
  createRuleGenerationPrompt, 
  createTestCaseGenerationPrompt,
  createRuleImprovementPrompt,
  createRuleValidationPrompt,
  type RuleGenerationContext,
  type TestCaseContext,
  type RuleImprovementContext
} from './prompt-templates';

export interface GeneratedRule {
  ruleType: string;
  ruleName: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    caseSensitive?: boolean;
  }>;
  logic: 'AND' | 'OR' | 'COMPLEX';
  confidenceImpact: {
    condition: string;
    confidence: 'high' | 'medium' | 'low';
    score: number;
    recommendation: 'merge' | 'review' | 'reject' | 'flag';
  };
  reasoning: string;
  flags: string[];
  exemptions?: string[];
  priority: number;
  examples?: {
    positive: string[];
    negative: string[];
  };
}

export interface GeneratedTestCase {
  testId: string;
  testName: string;
  testType: 'positive' | 'negative' | 'edge_case';
  description: string;
  testData: {
    record1: Record<string, string>;
    record2: Record<string, string>;
  };
  expectedResult: {
    shouldMatch: boolean;
    confidence: 'high' | 'medium' | 'low';
    score: number;
    recommendation: 'merge' | 'review' | 'reject' | 'flag';
    reasoning: string;
  };
  businessScenario: string;
}

export interface RuleImprovement {
  type: 'logic_change' | 'threshold_adjustment' | 'condition_addition' | 'exception_handling';
  description: string;
  rationale: string;
  implementation: {
    before: string;
    after: string;
  };
  expectedImpact: {
    falsePositiveReduction: 'high' | 'medium' | 'low';
    falseNegativeReduction: 'high' | 'medium' | 'low';
    accuracyImprovement: string;
  };
}

interface AzureOpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class ClaudeRuleGenerator {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;
  private apiVersion: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    this.endpoint = serverConfig.azureOpenAi.endpoint;
    this.apiKey = serverConfig.azureOpenAi.apiKey;
    this.deployment = serverConfig.azureOpenAi.deploymentName;
    this.apiVersion = serverConfig.azureOpenAi.apiVersion;
  }

  /**
   * Generate business rules from a conversation
   */
  async generateRulesFromConversation(context: RuleGenerationContext): Promise<{
    rules: GeneratedRule[];
    summary: string;
    insights: string[];
  }> {
    const prompt = createRuleGenerationPrompt(context);
    
    try {
      const response = await this.callAzureOpenAI(prompt);
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating rules from conversation:', error);
      throw new Error(`Failed to generate rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate test cases for a specific rule
   */
  async generateTestCases(context: TestCaseContext): Promise<{
    testCases: GeneratedTestCase[];
    testSummary: {
      totalTests: number;
      positiveTests: number;
      negativeTests: number;
      edgeCases: number;
      coverage: string[];
      recommendations: string[];
    };
  }> {
    const prompt = createTestCaseGenerationPrompt(context);
    
    try {
      const response = await this.callAzureOpenAI(prompt);
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating test cases:', error);
      throw new Error(`Failed to generate test cases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate improvement suggestions for existing rules
   */
  async generateRuleImprovements(context: RuleImprovementContext): Promise<{
    analysis: {
      currentIssues: string[];
      rootCauses: string[];
      impactAssessment: string;
    };
    improvements: RuleImprovement[];
    alternativeApproaches: Array<{
      approach: string;
      prosAndCons: {
        pros: string[];
        cons: string[];
      };
    }>;
    testingRecommendations: string[];
    monitoringStrategy: string;
  }> {
    const prompt = createRuleImprovementPrompt(context);
    
    try {
      const response = await this.callAzureOpenAI(prompt);
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating rule improvements:', error);
      throw new Error(`Failed to generate improvements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a set of rules for consistency
   */
  async validateRuleConsistency(rules: string[]): Promise<{
    conflicts: Array<{
      rules: string[];
      conflictType: string;
      description: string;
      resolution: string;
    }>;
    redundancies: Array<{
      rules: string[];
      redundancyType: string;
      description: string;
      recommendation: string;
    }>;
    gaps: Array<{
      scenario: string;
      impact: string;
      suggestedRule: string;
    }>;
    prioritization: Array<{
      rule: string;
      suggestedPriority: number;
      reasoning: string;
    }>;
    overallAssessment: string;
  }> {
    const prompt = createRuleValidationPrompt(rules);
    
    try {
      const response = await this.callAzureOpenAI(prompt);
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error validating rules:', error);
      throw new Error(`Failed to validate rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call Azure OpenAI API with retry logic
   */
  private async callAzureOpenAI(prompt: string, retryCount: number = 0): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(
        `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant specializing in business rules for Master Data Management. Always respond with valid JSON that matches the requested format exactly.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: 'json_object' }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI error: ${response.status} - ${errorText}`);
      }

      const data: AzureOpenAIResponse = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Invalid response structure from Azure OpenAI');
      }

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeout);

      // Handle retryable errors
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        console.log(`Retrying Azure OpenAI call (attempt ${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * (retryCount + 1)); // Exponential backoff
        return this.callAzureOpenAI(prompt, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Parse JSON response from Azure OpenAI
   */
  private parseJSONResponse<T>(content: string): T {
    try {
      return JSON.parse(content);
    } catch (error) {
      // Try to extract JSON from the content if it's embedded in text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (secondError) {
          console.error('Failed to parse extracted JSON:', secondError);
        }
      }
      
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const retryablePatterns = [
      'timeout',
      'network',
      'fetch',
      'AbortError',
      'ECONNRESET',
      'ETIMEDOUT',
      '429', // Rate limit
      '503', // Service unavailable
      '504'  // Gateway timeout
    ];
    
    return retryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert generated rules to Smart Rules Engine format
   */
  convertToSmartRuleFormat(generatedRule: GeneratedRule): string {
    const conditions = generatedRule.conditions.map(c => {
      const operator = this.convertOperatorToCode(c.operator);
      return `record.${c.field}${operator}'${c.value}'`;
    });

    const logicOperator = generatedRule.logic === 'AND' ? ' && ' : ' || ';
    const conditionString = conditions.join(logicOperator);

    return `
    // ${generatedRule.description}
    if (${conditionString}) {
      results.push({
        ruleType: '${generatedRule.ruleType}',
        ruleName: '${generatedRule.ruleName}',
        confidence: '${generatedRule.confidenceImpact.confidence}',
        confidenceScore: ${generatedRule.confidenceImpact.score},
        recommendation: '${generatedRule.confidenceImpact.recommendation}',
        reasoning: '${generatedRule.reasoning}',
        flags: ${JSON.stringify(generatedRule.flags)},
        ${generatedRule.exemptions ? `exemptionReason: '${generatedRule.exemptions[0]}',` : ''}
        priority: ${generatedRule.priority}
      });
    }`;
  }

  /**
   * Convert operator strings to code operators
   */
  private convertOperatorToCode(operator: string): string {
    const operatorMap: Record<string, string> = {
      'equals': ' === ',
      'contains': '.includes(',
      'startsWith': '.startsWith(',
      'endsWith': '.endsWith(',
      'matches': '.match(',
      'regex': '.test('
    };
    
    return operatorMap[operator] || ' === ';
  }
}