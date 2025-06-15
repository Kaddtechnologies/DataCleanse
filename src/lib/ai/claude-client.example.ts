/**
 * Example usage of the ClaudeRuleGenerator
 * This demonstrates how to use the AI-powered business rules engine
 */

import { ClaudeRuleGenerator } from './claude-client';

// Example 1: Generate rules from a business conversation
async function generateRulesExample() {
  const generator = new ClaudeRuleGenerator();
  
  const conversation = `
    Business User: We need to handle cases where companies have joint ventures. 
    For example, Ruhr Oel GmbH is a joint venture between BP and Rosneft.
    
    Analyst: So we should not merge records that appear to be joint ventures?
    
    Business User: Correct. Also, if two companies share the same address but have 
    different names, they might be different divisions or separate businesses in the 
    same building. We see this a lot with industrial parks.
    
    Analyst: What about freight forwarders?
    
    Business User: Good point. Freight forwarders like DHL or FedEx should be flagged 
    because they're intermediate consignees, not the actual customer. We need to track 
    the real end customer for export control.
  `;
  
  try {
    const result = await generator.generateRulesFromConversation({
      conversation,
      businessContext: 'Manufacturing company MDM system with export control requirements',
      dataSchema: {
        customer_name: 'string',
        address: 'string',
        city: 'string',
        country: 'string',
        industry: 'string',
        phone: 'string'
      }
    });
    
    console.log('Generated Rules:', JSON.stringify(result, null, 2));
    
    // Convert first rule to Smart Rules Engine format
    if (result.rules.length > 0) {
      const code = generator.convertToSmartRuleFormat(result.rules[0]);
      console.log('Generated Code:', code);
    }
  } catch (error) {
    console.error('Error generating rules:', error);
  }
}

// Example 2: Generate test cases for a rule
async function generateTestCasesExample() {
  const generator = new ClaudeRuleGenerator();
  
  const rule = `
    Rule: Joint Venture Detection
    Type: business_relationship
    Logic: If company names contain "joint venture", "JV", or multiple parent company names,
    mark as low confidence and recommend manual review.
  `;
  
  try {
    const result = await generator.generateTestCases({
      rule,
      ruleType: 'business_relationship',
      dataSchema: {
        customer_name: 'string',
        address: 'string',
        city: 'string'
      }
    });
    
    console.log('Generated Test Cases:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error generating test cases:', error);
  }
}

// Example 3: Improve existing rules based on performance
async function improveRuleExample() {
  const generator = new ClaudeRuleGenerator();
  
  const rule = `
    Rule: Same Address Detection
    If two records have the same address, mark as high confidence duplicate.
  `;
  
  const testResults = [
    { passed: true, reason: 'Correctly identified duplicate at same address' },
    { passed: false, reason: 'Incorrectly merged two different companies in same building' },
    { passed: false, reason: 'Failed to handle PO Box vs street address variation' },
    { passed: true, reason: 'Correctly identified duplicate with minor address formatting' }
  ];
  
  try {
    const result = await generator.generateRuleImprovements({
      rule,
      testResults,
      performanceMetrics: {
        falsePositives: 15,
        falseNegatives: 5,
        accuracy: 75
      }
    });
    
    console.log('Improvement Suggestions:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error generating improvements:', error);
  }
}

// Example 4: Validate rule consistency
async function validateRulesExample() {
  const generator = new ClaudeRuleGenerator();
  
  const rules = [
    'If addresses match exactly, mark as high confidence duplicate',
    'If addresses match but company names are different, mark as low confidence',
    'If company names contain "Division" or "Unit", mark as medium confidence',
    'If addresses match and phone numbers match, mark as high confidence'
  ];
  
  try {
    const result = await generator.validateRuleConsistency(rules);
    console.log('Validation Results:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error validating rules:', error);
  }
}

// Export examples for testing
export {
  generateRulesExample,
  generateTestCasesExample,
  improveRuleExample,
  validateRulesExample
};