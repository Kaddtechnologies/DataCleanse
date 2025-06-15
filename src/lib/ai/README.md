# AI-Powered Business Rules Engine

This directory contains the AI integration for generating, testing, and improving business rules for the MDM duplicate detection system.

## Overview

The AI-powered business rules engine uses Azure OpenAI to:
- Generate business rules from natural language conversations
- Create comprehensive test cases for rules
- Suggest improvements based on rule performance
- Validate rule consistency and identify conflicts

## Components

### `claude-client.ts`
The main AI client that interfaces with Azure OpenAI. Key features:
- Rule generation from conversations
- Test case generation
- Rule improvement suggestions
- Rule validation
- Automatic retry logic and error handling

### `prompt-templates.ts`
Contains structured prompt templates for different AI tasks:
- Rule generation prompts
- Test case generation prompts
- Rule improvement prompts
- Rule validation prompts

## Usage

### Basic Rule Generation

```typescript
import { ClaudeRuleGenerator } from '@/lib/ai/claude-client';

const generator = new ClaudeRuleGenerator();

// Generate rules from a business conversation
const result = await generator.generateRulesFromConversation({
  conversation: `
    User: We need to handle joint ventures differently.
    Analyst: How should we identify them?
    User: Look for "JV" or "joint venture" in the name.
  `,
  businessContext: 'Manufacturing MDM system',
  existingRules: ['rule1', 'rule2'], // Optional
  dataSchema: { // Optional
    customer_name: 'string',
    address: 'string'
  }
});

// Convert to Smart Rules Engine format
const code = generator.convertToSmartRuleFormat(result.rules[0]);
```

### Generating Test Cases

```typescript
const testCases = await generator.generateTestCases({
  rule: 'If addresses match, mark as potential duplicate',
  ruleType: 'geographic',
  dataSchema: {
    address: 'string',
    city: 'string'
  }
});

// Use test cases to validate rule behavior
testCases.testCases.forEach(test => {
  console.log(`Test: ${test.testName}`);
  console.log(`Expected: ${test.expectedResult.recommendation}`);
});
```

### Improving Rules

```typescript
const improvements = await generator.generateRuleImprovements({
  rule: 'Current rule definition',
  testResults: [
    { passed: true, reason: 'Correctly identified match' },
    { passed: false, reason: 'Failed on edge case' }
  ],
  performanceMetrics: {
    falsePositives: 10,
    falseNegatives: 5,
    accuracy: 85
  }
});

// Apply suggested improvements
improvements.improvements.forEach(improvement => {
  console.log(`${improvement.type}: ${improvement.description}`);
  console.log(`Implementation: ${improvement.implementation.after}`);
});
```

### Validating Rule Sets

```typescript
const validation = await generator.validateRuleConsistency([
  'Rule 1 definition',
  'Rule 2 definition',
  'Rule 3 definition'
]);

// Check for conflicts
validation.conflicts.forEach(conflict => {
  console.log(`Conflict: ${conflict.description}`);
  console.log(`Resolution: ${conflict.resolution}`);
});
```

## Integration with Smart Rules Engine

The generated rules can be directly integrated into the existing Smart Rules Engine:

1. Generate rules using the AI client
2. Convert to Smart Rules Engine format
3. Add to the appropriate rule set in `smart-duplicate-rules.ts`

Example integration:

```typescript
// In smart-duplicate-rules.ts
private applyGeneratedRules(input: DuplicateAnalysisInput, analysis: any): RuleResult[] {
  const results: RuleResult[] = [];
  
  // AI-generated rule converted to code
  if (record.industry?.toLowerCase().includes('freight') || 
      record.industry?.toLowerCase().includes('logistics')) {
    results.push({
      ruleType: 'business_type',
      ruleName: 'ai_freight_forwarder_detection',
      confidence: 'low',
      confidenceScore: 25,
      recommendation: 'flag',
      reasoning: 'AI-detected freight forwarder pattern',
      flags: ['freight_forwarder', 'ai_generated']
    });
  }
  
  return results;
}
```

## Configuration

The AI client uses Azure OpenAI configuration from `environment.ts`:
- `azureOpenAiEndpoint`: Azure OpenAI endpoint URL
- `azureOpenAiApiKey`: API key for authentication
- `azureOpenAiDeploymentName`: Deployment name (e.g., 'dai-gpt-4.1-nano')
- `openAiApiVersion`: API version

## Error Handling

The client includes robust error handling:
- Automatic retry with exponential backoff
- Timeout protection (30 seconds)
- Graceful degradation on API failures
- Detailed error messages for debugging

## Best Practices

1. **Provide Context**: Always include business context when generating rules
2. **Use Examples**: Include specific examples in conversations for better rule generation
3. **Validate Output**: Always review AI-generated rules before production use
4. **Test Thoroughly**: Use the test case generator to validate rule behavior
5. **Monitor Performance**: Track false positives/negatives to improve rules over time

## Testing

Run integration tests:
```bash
npm test src/lib/ai/claude-client.test.ts
```

Note: Integration tests require a valid Azure OpenAI connection.

## Future Enhancements

- [ ] Batch rule generation from multiple conversations
- [ ] Rule performance tracking and automatic improvement
- [ ] Integration with production rule metrics
- [ ] Rule versioning and rollback capabilities
- [ ] Natural language rule querying