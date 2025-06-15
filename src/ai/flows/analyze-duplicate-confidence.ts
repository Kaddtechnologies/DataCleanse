/**
 * Enhanced AI flow with Smart Rules Engine integration
 *
 * This module now guards against client-side execution. All Genkit-related
 * initialisation occurs only on the server (Node.js).  In the browser we
 * export a stub `analyzeDuplicateConfidence` that throws when invoked.
 */

import { z } from 'zod';
import {
  SmartDuplicateRulesEngine,
  type SmartAnalysisResult,
} from '@/ai/types';

/* -------------------------------------------------------------------------- */
/*                              Shared Schemas                                */
/* -------------------------------------------------------------------------- */

const AnalyzeDuplicateConfidenceInputSchema = z.object({
  record1: z
    .record(z.string())
    .describe('The first record to compare, as a key-value object.'),
  record2: z
    .record(z.string())
    .describe('The second record to compare, as a key-value object.'),
  fuzzyScore: z.number().describe('The fuzzy matching score between the two records.'),
});
export type AnalyzeDuplicateConfidenceInput = z.infer<
  typeof AnalyzeDuplicateConfidenceInputSchema
>;

const AnalyzeDuplicateConfidenceOutputSchema = z.object({
  confidenceLevel: z
    .string()
    .describe('The AI-suggested confidence level for the match (High, Medium, Low).'),
  what: z
    .string()
    .describe('Clear, concise markdown description of the comparison and key differences found.'),
  why: z
    .string()
    .describe('Brief markdown explanation of the confidence assessment reasoning.'),
  recommendation: z
    .string()
    .describe('**MOST IMPORTANT** - Specific, actionable markdown recommendation for the user.'),
  confidenceChange: z
    .string()
    .optional()
    .describe('Brief markdown explanation of confidence score changes if any.'),
  businessContext: z.string().optional().describe('Business context and rules that influenced the decision.'),
  riskFactors: z.array(z.string()).optional().describe('List of risk factors identified during analysis.'),
  exemptionReasons: z.array(z.string()).optional().describe('Reasons why records might be legitimately separate.'),
  rulesApplied: z.array(z.string()).optional().describe('List of business rules that were applied.'),
  smartAnalysis: z.any().optional().describe('Complete smart analysis results for advanced display.'),
});
export type AnalyzeDuplicateConfidenceOutput = z.infer<
  typeof AnalyzeDuplicateConfidenceOutputSchema
>;

/* -------------------------------------------------------------------------- */
/*                    Implementation – server vs client                       */
/* -------------------------------------------------------------------------- */

let analyzeDuplicateConfidence: (
  input: AnalyzeDuplicateConfidenceInput
) => Promise<AnalyzeDuplicateConfidenceOutput>;

if (typeof window === 'undefined') {
  /* ------------------------------ Server side ----------------------------- */
  // Dynamically import Genkit at runtime to avoid bundling in the browser.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ai } = require('@/ai/genkit');

  // Prompt schema for Genkit
  const AnalyzeDuplicateConfidencePromptInputSchema = z.object({
    record1String: z.string().describe('The first record to compare, as a JSON string.'),
    record2String: z.string().describe('The second record to compare, as a JSON string.'),
    fuzzyScore: z.number().describe('The fuzzy matching score between the two records.'),
    smartAnalysisString: z.string().describe('Smart rules analysis results as JSON string.'),
    businessRulesContext: z.string().describe('Business context from applied rules.'),
  });

  const prompt = ai.definePrompt({
    name: 'enhancedAnalyzeDuplicateConfidencePrompt',
    input: { schema: AnalyzeDuplicateConfidencePromptInputSchema },
    output: { schema: AnalyzeDuplicateConfidenceOutputSchema },
    prompt: `You are an expert data steward AI assistant specialized in analyzing potential duplicate customer records for enterprise ERP systems. Your role is to provide specific, actionable recommendations based on detailed analysis of the actual record data.

**CRITICAL JSON OUTPUT REQUIREMENTS:**
You MUST return valid JSON with separate fields. DO NOT put all content in one field.

Required JSON structure:
{
  "confidenceLevel": "High|Medium|Low",
  "what": "Brief comparison description here",
  "why": "Reasoning explanation here", 
  "recommendation": "Specific action recommendation here"
}

**CRITICAL DATA REQUIREMENTS:**
- You MUST analyze the ACTUAL data provided, not generic examples
- You MUST provide SPECIFIC recommendations based on the real field values
- You MUST reference actual field values, addresses, names, phone numbers, etc. from the records
- DO NOT use placeholder examples like "John Doe" or "123 Elm Street"
- If you cannot analyze the data properly, respond with "AI analysis not available - Contact Support"

**IMPORTANT NOTE:**
- TPI numbers, IDs, UIDs, and row numbers have been filtered out as they are unique primary keys
- Focus your analysis on business-relevant fields: company names, addresses, phone numbers, etc.
- Only identical TPI/ID numbers would indicate true duplicates and will be included if present

**DATA TO ANALYZE:**

**Record 1 (Business Fields Only):**
{{record1String}}

**Record 2 (Business Fields Only):**
{{record2String}}

**Fuzzy Match Score:** {{fuzzyScore}} (0.0 to 1.0)

**Smart Business Rules Analysis:**
{{smartAnalysisString}}

**Business Context:** {{businessRulesContext}}

**JSON FIELD REQUIREMENTS:**

**confidenceLevel** (string): Must be exactly one of: "High", "Medium", "Low"
- High: 90%+ confidence these are duplicates (clear match with minor variations)
- Medium: 60-89% confidence (significant similarities but some concerning differences)  
- Low: Below 60% confidence (major differences, likely different entities)

**what** (string): Provide a concise, specific comparison of the ACTUAL records:
- Compare exact field values (names, addresses, phones, etc.)
- Note specific similarities and differences found
- Include data quality observations
- Example: "Company names 'ABC Corp' vs 'ABC Corporation' show same entity with abbreviation variation. Addresses differ only in formatting: '123 Main St' vs '123 Main Street'."

**why** (string): Explain your confidence assessment with specific reasoning:
- Which exact field matches/mismatches influenced your decision
- How the fuzzy score aligns with your assessment
- Business rule implications from smart analysis
- Risk factors considered

**recommendation** (string): Provide SPECIFIC, actionable recommendation:
- "MERGE: Records represent the same entity. Use Record 1 as primary due to more complete address data."
- "MANUAL REVIEW: Investigate phone number discrepancy before merging. Verify with customer."
- "DO NOT MERGE: Different entities. Company names indicate separate subsidiaries."
- "FLAG FOR CLEANUP: Same entity but address formatting needs standardization."

CRITICAL: Return proper JSON with these four separate fields. Do not embed field content within other fields.`,
  });

  // Define flow
  const analyzeDuplicateConfidenceFlow = ai.defineFlow(
    {
      name: 'enhancedAnalyzeDuplicateConfidenceFlow',
      inputSchema: AnalyzeDuplicateConfidenceInputSchema,
      outputSchema: AnalyzeDuplicateConfidenceOutputSchema,
    },
    async (flowInput: AnalyzeDuplicateConfidenceInput) => {
      // Filter out TPI numbers and other unique identifiers before analysis
      const filterRecord = (record: Record<string, string>): Record<string, string> => {
        const filtered: Record<string, string> = {};
        for (const [key, value] of Object.entries(record)) {
          // Skip TPI and other unique identifier fields unless they match
          if (key.toLowerCase().includes('tpi') || 
              key.toLowerCase().includes('id') ||
              key.toLowerCase().includes('uid') ||
              key.toLowerCase().includes('rowNumber')) {
            // Only include TPI/ID fields if they're the same (indicating true duplicates)
            if (flowInput.record1[key] === flowInput.record2[key]) {
              filtered[key] = value;
            }
            // Skip otherwise since different IDs don't indicate non-duplicates
          } else {
            filtered[key] = value;
          }
        }
        return filtered;
      };

      const filteredRecord1 = filterRecord(flowInput.record1);
      const filteredRecord2 = filterRecord(flowInput.record2);

      // Smart rules engine first
      const rulesEngine = new SmartDuplicateRulesEngine();
      const smartAnalysis: SmartAnalysisResult = await rulesEngine.analyzeRecords({
        record1: filteredRecord1,
        record2: filteredRecord2,
        fuzzyScore: flowInput.fuzzyScore,
      });

      // Prepare prompt input with filtered records
      const promptInput = {
        record1String: JSON.stringify(filteredRecord1, null, 2),
        record2String: JSON.stringify(filteredRecord2, null, 2),
        fuzzyScore: flowInput.fuzzyScore,
        smartAnalysisString: JSON.stringify(
          {
            finalConfidence: smartAnalysis.finalConfidence,
            finalConfidenceScore: smartAnalysis.finalConfidenceScore,
            recommendation: smartAnalysis.recommendation,
            appliedRules: smartAnalysis.appliedRules.map((rule) => ({
              ruleName: rule.ruleName,
              confidence: rule.confidence,
              recommendation: rule.recommendation,
              reasoning: rule.reasoning,
              businessJustification: rule.businessJustification,
              flags: rule.flags,
            })),
            businessContext: smartAnalysis.businessContext,
            riskFactors: smartAnalysis.riskFactors,
            exemptions: smartAnalysis.exemptions,
          },
          null,
          2
        ),
        businessRulesContext: smartAnalysis.businessContext || 'Standard analysis applied',
      };

      // AI analysis
      const { output } = await prompt(promptInput);

      // Combine AI output with smart analysis details
      const enhancedOutput: AnalyzeDuplicateConfidenceOutput = {
        ...output!,
        businessContext: smartAnalysis.businessContext,
        riskFactors: smartAnalysis.riskFactors,
        exemptionReasons: smartAnalysis.exemptions,
        rulesApplied: smartAnalysis.appliedRules.map((rule) => `${rule.ruleName}: ${rule.reasoning}`),
        smartAnalysis,
      };

      return enhancedOutput;
    }
  );

  analyzeDuplicateConfidence = analyzeDuplicateConfidenceFlow;
} else {
  /* ------------------------------ Client side ----------------------------- */
  analyzeDuplicateConfidence = async () => {
    throw new Error(
      'analyzeDuplicateConfidence can only be invoked on the server. ' +
        'Ensure you call this function within server components, API routes, or server actions.'
    );
  };
}

/* -------------------------------------------------------------------------- */
/*                                Exports                                     */
/* -------------------------------------------------------------------------- */

export { analyzeDuplicateConfidence };
