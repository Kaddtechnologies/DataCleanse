/**
 * Prompt Templates for AI-powered Business Rules Generation
 * Adapted for Azure OpenAI integration
 */

export interface RuleGenerationContext {
  conversation: string;
  existingRules?: string[];
  dataSchema?: Record<string, string>;
  businessContext?: string;
}

export interface TestCaseContext {
  rule: string;
  ruleType: string;
  dataSchema?: Record<string, string>;
}

export interface RuleImprovementContext {
  rule: string;
  testResults: {
    passed: boolean;
    reason?: string;
    data?: any;
  }[];
  performanceMetrics?: {
    falsePositives: number;
    falseNegatives: number;
    accuracy: number;
  };
}

/**
 * Generate a prompt for creating business rules from conversation
 */
export function createRuleGenerationPrompt(context: RuleGenerationContext): string {
  const { conversation, existingRules, dataSchema, businessContext } = context;
  
  return `You are an expert business analyst specializing in Master Data Management (MDM) and duplicate detection rules.

**MISSION**: Analyze the following conversation and generate specific, implementable business rules for duplicate detection.

**CONTEXT**:
${businessContext || 'Enterprise MDM system for customer data deduplication'}

**DATA SCHEMA** (if provided):
${dataSchema ? JSON.stringify(dataSchema, null, 2) : 'Standard customer record fields: name, address, city, country, phone, etc.'}

**EXISTING RULES** (for reference):
${existingRules ? existingRules.join('\n') : 'No existing rules - creating from scratch'}

**CONVERSATION TO ANALYZE**:
${conversation}

**REQUIREMENTS**:
1. Extract all business rules mentioned or implied in the conversation
2. Make rules specific and actionable
3. Include confidence scores and recommendations
4. Consider edge cases and exceptions
5. Follow the existing Smart Rules Engine pattern

**OUTPUT FORMAT** (JSON):
{
  "rules": [
    {
      "ruleType": "business_relationship|geographic|entity_type|data_quality|critical_validation",
      "ruleName": "descriptive_snake_case_name",
      "description": "Clear description of what the rule checks",
      "conditions": [
        {
          "field": "field_name",
          "operator": "equals|contains|matches|startsWith|endsWith|regex",
          "value": "comparison_value",
          "caseSensitive": false
        }
      ],
      "logic": "AND|OR|COMPLEX",
      "confidenceImpact": {
        "condition": "when_to_apply",
        "confidence": "high|medium|low",
        "score": 0-100,
        "recommendation": "merge|review|reject|flag"
      },
      "reasoning": "Business justification for the rule",
      "flags": ["relevant", "tags"],
      "exemptions": ["when_not_to_apply"],
      "priority": 1-10,
      "examples": {
        "positive": ["Examples where rule should match"],
        "negative": ["Examples where rule should not match"]
      }
    }
  ],
  "summary": "Brief summary of extracted rules",
  "insights": ["Additional insights or recommendations from the conversation"]
}

**IMPORTANT**:
- Focus on rules that can be programmatically implemented
- Each rule should have clear pass/fail criteria
- Include specific field names and values from the conversation
- Consider the rule's impact on false positives/negatives
- Ensure rules align with existing Smart Rules Engine patterns`;
}

/**
 * Generate a prompt for creating test cases for a rule
 */
export function createTestCaseGenerationPrompt(context: TestCaseContext): string {
  const { rule, ruleType, dataSchema } = context;
  
  return `You are a QA engineer specializing in business rule testing for MDM systems.

**MISSION**: Generate comprehensive test cases for the following business rule.

**RULE TO TEST**:
${rule}

**RULE TYPE**: ${ruleType}

**DATA SCHEMA**:
${dataSchema ? JSON.stringify(dataSchema, null, 2) : 'Standard customer record fields'}

**REQUIREMENTS**:
1. Create both positive and negative test cases
2. Include edge cases and boundary conditions
3. Test for potential false positives and false negatives
4. Consider real-world data variations
5. Include test data that mirrors production scenarios

**OUTPUT FORMAT** (JSON):
{
  "testCases": [
    {
      "testId": "TC001",
      "testName": "descriptive_test_name",
      "testType": "positive|negative|edge_case",
      "description": "What this test validates",
      "testData": {
        "record1": {
          "field1": "value1",
          "field2": "value2"
        },
        "record2": {
          "field1": "value1",
          "field2": "value2"
        }
      },
      "expectedResult": {
        "shouldMatch": true|false,
        "confidence": "high|medium|low",
        "score": 0-100,
        "recommendation": "merge|review|reject|flag",
        "reasoning": "Why this result is expected"
      },
      "businessScenario": "Real-world scenario this represents"
    }
  ],
  "testSummary": {
    "totalTests": 10,
    "positiveTests": 5,
    "negativeTests": 3,
    "edgeCases": 2,
    "coverage": ["What aspects are covered"],
    "recommendations": ["Additional tests to consider"]
  }
}

**TEST CASE GUIDELINES**:
- Use realistic company names and addresses
- Include variations like abbreviations, typos, formatting differences
- Test international scenarios if applicable
- Consider data quality issues (missing fields, invalid data)
- Include examples from different industries`;
}

/**
 * Generate a prompt for improving existing rules based on performance
 */
export function createRuleImprovementPrompt(context: RuleImprovementContext): string {
  const { rule, testResults, performanceMetrics } = context;
  
  const failedTests = testResults.filter(t => !t.passed);
  const passedTests = testResults.filter(t => t.passed);
  
  return `You are an expert in optimizing business rules for MDM systems.

**MISSION**: Analyze the performance of this rule and suggest improvements.

**CURRENT RULE**:
${rule}

**TEST RESULTS**:
- Passed: ${passedTests.length}
- Failed: ${failedTests.length}
- Total: ${testResults.length}

**FAILED TEST DETAILS**:
${failedTests.map(t => `- ${t.reason || 'Unknown reason'}`).join('\n')}

${performanceMetrics ? `
**PERFORMANCE METRICS**:
- False Positives: ${performanceMetrics.falsePositives}
- False Negatives: ${performanceMetrics.falseNegatives}
- Accuracy: ${performanceMetrics.accuracy}%
` : ''}

**REQUIREMENTS**:
1. Identify why the rule is failing certain tests
2. Suggest specific improvements to the rule logic
3. Balance between reducing false positives and false negatives
4. Maintain business logic integrity
5. Consider performance implications

**OUTPUT FORMAT** (JSON):
{
  "analysis": {
    "currentIssues": ["List of identified problems"],
    "rootCauses": ["Why these issues occur"],
    "impactAssessment": "Business impact of current rule performance"
  },
  "improvements": [
    {
      "type": "logic_change|threshold_adjustment|condition_addition|exception_handling",
      "description": "What to change",
      "rationale": "Why this change will help",
      "implementation": {
        "before": "Current implementation",
        "after": "Suggested implementation"
      },
      "expectedImpact": {
        "falsePositiveReduction": "high|medium|low",
        "falseNegativeReduction": "high|medium|low",
        "accuracyImprovement": "percentage estimate"
      }
    }
  ],
  "alternativeApproaches": [
    {
      "approach": "Description of alternative approach",
      "prosAndCons": {
        "pros": ["Benefits"],
        "cons": ["Drawbacks"]
      }
    }
  ],
  "testingRecommendations": ["Additional tests to validate improvements"],
  "monitoringStrategy": "How to monitor rule performance after changes"
}

**IMPROVEMENT GUIDELINES**:
- Prioritize changes that address the most common failures
- Consider the trade-off between precision and recall
- Suggest incremental improvements rather than complete rewrites
- Include specific thresholds and values
- Consider computational efficiency`;
}

/**
 * Generate a prompt for validating rule consistency
 */
export function createRuleValidationPrompt(rules: string[]): string {
  return `You are a business rules expert reviewing rules for consistency and conflicts.

**MISSION**: Analyze these business rules for conflicts, redundancies, and gaps.

**RULES TO ANALYZE**:
${rules.map((r, i) => `${i + 1}. ${r}`).join('\n\n')}

**REQUIREMENTS**:
1. Identify conflicting rules
2. Find redundant or overlapping rules
3. Detect gaps in rule coverage
4. Suggest rule prioritization
5. Ensure logical consistency

**OUTPUT FORMAT** (JSON):
{
  "conflicts": [
    {
      "rules": ["rule1", "rule2"],
      "conflictType": "logic|priority|outcome",
      "description": "How these rules conflict",
      "resolution": "Suggested resolution"
    }
  ],
  "redundancies": [
    {
      "rules": ["rule1", "rule2"],
      "redundancyType": "full|partial",
      "description": "How these rules overlap",
      "recommendation": "Which to keep/modify"
    }
  ],
  "gaps": [
    {
      "scenario": "Uncovered business scenario",
      "impact": "Why this matters",
      "suggestedRule": "Rule to address this gap"
    }
  ],
  "prioritization": [
    {
      "rule": "rule_name",
      "suggestedPriority": 1-10,
      "reasoning": "Why this priority"
    }
  ],
  "overallAssessment": "Summary of rule set health"
}`;
}