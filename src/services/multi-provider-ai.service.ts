/**
 * Multi-Provider AI Service
 * Handles AI analysis with automatic fallback between providers
 */

import { getAIProviderManager, initializeAIProviderManager } from '@/lib/ai-provider-manager';
import { aiProviderConfig } from '@/config/ai-providers.config';
import { z } from 'zod';
import { SmartDuplicateRulesEngine, type SmartAnalysisResult } from '@/ai/types';
import Anthropic from "@anthropic-ai/sdk";

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Define the output schema
const AnalyzeDuplicateConfidenceOutputSchema = z.object({
  confidenceLevel: z.string(),
  what: z.string(),
  why: z.string(),
  recommendation: z.string(),
  confidenceChange: z.string().optional(),
  businessContext: z.string().optional(),
  riskFactors: z.array(z.string()).optional(),
  exemptionReasons: z.array(z.string()).optional(),
  rulesApplied: z.array(z.string()).optional(),
  smartAnalysis: z.any().optional(),
});

export type AnalyzeDuplicateConfidenceOutput = z.infer<typeof AnalyzeDuplicateConfidenceOutputSchema>;

// Provider manager instance
let isInitialized = false;

/**
 * Initialize the AI provider manager
 */
async function ensureProviderManagerInitialized() {
  if (!isInitialized) {
    await initializeAIProviderManager(aiProviderConfig);
    isInitialized = true;
  }
}

/**
 * Analyze duplicate confidence using the active AI provider
 */
export async function analyzeWithFallback(
  record1: Record<string, string>,
  record2: Record<string, string>,
  fuzzyScore: number,
  maxRetries: number = 2
): Promise<AnalyzeDuplicateConfidenceOutput> {
  if (maxRetries <= 0) {
    throw new Error('Maximum retry attempts exceeded for AI analysis');
  }
  // Ensure provider manager is initialized
  await ensureProviderManagerInitialized();
  
  const providerManager = getAIProviderManager();
  const currentProvider = providerManager.getCurrentProvider();
  
  if (!currentProvider) {
    throw new Error('No healthy AI providers available');
  }

  console.log(`🤖 Using AI Provider: ${currentProvider.name}`);

  // Filter out TPI numbers and other unique identifiers
  const filterRecord = (record: Record<string, string>): Record<string, string> => {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase().includes('tpi') || 
          key.toLowerCase().includes('id') ||
          key.toLowerCase().includes('uid') ||
          key.toLowerCase().includes('rowNumber')) {
        if (record1[key] === record2[key]) {
          filtered[key] = value;
        }
      } else {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  const filteredRecord1 = filterRecord(record1);
  const filteredRecord2 = filterRecord(record2);

  // Smart rules engine analysis
  const rulesEngine = new SmartDuplicateRulesEngine();
  const smartAnalysis: SmartAnalysisResult = await rulesEngine.analyzeRecords({
    record1: filteredRecord1,
    record2: filteredRecord2,
    fuzzyScore: fuzzyScore,
  });

  try {

    // Call the provider-specific AI analysis
    const result = await callProviderAPI(
      currentProvider,
      filteredRecord1,
      filteredRecord2,
      fuzzyScore,
      smartAnalysis
    );

    // Validate the response
    const validatedResult = AnalyzeDuplicateConfidenceOutputSchema.parse(result);
    
    return validatedResult;
  } catch (error) {
    console.error(`❌ Error with ${currentProvider.name}:`, error);
    
    // Check if this is a retryable error (network, timeout, parsing) vs a permanent error
    const isRetryableError = error instanceof Error && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('JSON') ||
      error.message.includes('SyntaxError')
    );
    
    if (isRetryableError) {
      // For retryable errors, try the same provider once more before switching
      console.log(`🔄 Retrying with same provider ${currentProvider.name} due to retryable error`);
      try {
        const result = await callProviderAPI(
          currentProvider,
          filteredRecord1,
          filteredRecord2,
          fuzzyScore,
          smartAnalysis
        );
        const validatedResult = AnalyzeDuplicateConfidenceOutputSchema.parse(result);
        return validatedResult;
      } catch (retryError) {
        console.error(`❌ Retry failed for ${currentProvider.name}:`, retryError);
        // Now try fallback
      }
    }
    
    // Mark the current provider as temporarily failed
    if (providerManager && 'markProviderTemporarilyFailed' in providerManager) {
      (providerManager as any).markProviderTemporarilyFailed(currentProvider.name);
    }
    
    // Try to get a different provider
    const allProviders = providerManager.getProviderStatus();
    const nextProvider = allProviders.find(p => 
      p.name !== currentProvider.name && 
      p.isHealthy !== false && 
      (p.errorCount || 0) < 3
    );
    
    if (nextProvider) {
      console.log(`🔄 Switching to fallback provider: ${nextProvider.name}`);
      
      // Manually set the provider without running health checks
      const manager = providerManager as any;
      manager.currentProvider = nextProvider;
      
      // Single recursive call with new provider (prevent infinite recursion)
      return analyzeWithFallback(record1, record2, fuzzyScore, maxRetries - 1);
    }
    
    throw new Error(`All AI providers failed. Last error from ${currentProvider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Call the specific provider's API
 */
async function callProviderAPI(
  provider: any,
  record1: Record<string, string>,
  record2: Record<string, string>,
  fuzzyScore: number,
  smartAnalysis: SmartAnalysisResult
): Promise<AnalyzeDuplicateConfidenceOutput> {
  const prompt = createAnalysisPrompt(record1, record2, fuzzyScore, smartAnalysis);
  
  switch (provider.type) {
    case 'azure_openai':
      return await callAzureOpenAI(provider, prompt);
    case 'openai':
      return await callOpenAI(provider, prompt);
    case 'google_gemini':
      return await callGoogleGemini(provider, prompt);
    case 'anthropic':
      return await callAnthropic(provider, prompt);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

/**
 * Create the analysis prompt
 */
function createAnalysisPrompt(
  record1: Record<string, string>,
  record2: Record<string, string>,
  fuzzyScore: number,
  smartAnalysis: SmartAnalysisResult
): string {
  // Check for invalid names first - if either record has an invalid name, return low confidence
  const isRecord1NameInvalid = !record1.name || ['nan', 'null', 'undefined', '', 'n/a', 'na', 'none', 'unknown'].includes(String(record1.name).toLowerCase().trim());
  const isRecord2NameInvalid = !record2.name || ['nan', 'null', 'undefined', '', 'n/a', 'na', 'none', 'unknown'].includes(String(record2.name).toLowerCase().trim());
  
  if (isRecord1NameInvalid || isRecord2NameInvalid) {
    const invalidRecord = isRecord1NameInvalid && isRecord2NameInvalid ? 'Both records' : (isRecord1NameInvalid ? 'Record 1' : 'Record 2');
    return `INVALID NAME DETECTED: ${invalidRecord} has invalid or missing customer name. Return this exact JSON:
{
  "confidenceLevel": "Low",
  "what": "${invalidRecord} ${isRecord1NameInvalid && isRecord2NameInvalid ? 'have' : 'has'} invalid or missing customer name (${isRecord1NameInvalid ? record1.name || '[empty]' : ''}${isRecord1NameInvalid && isRecord2NameInvalid ? ', ' : ''}${isRecord2NameInvalid ? record2.name || '[empty]' : ''}). Cannot perform meaningful comparison.",
  "why": "Records with missing, null, undefined, or placeholder names (like 'nan') cannot be meaningfully compared for duplicate detection.",
  "recommendation": "REMOVE FROM ANALYSIS - Invalid data quality. These records should be cleaned or excluded from duplicate analysis.",
  "confidenceChange": "Automatic 0% confidence due to invalid name data",
  "businessContext": "Data quality validation failed",
  "riskFactors": ["Invalid name data", "Poor data quality"],
  "exemptionReasons": [],
  "rulesApplied": ["Data Quality Rule: Invalid name detection"],
  "smartAnalysis": ${JSON.stringify(smartAnalysis)}
}`;
  }

  return `You are an expert data deduplication and scoring assistant with expertise in evaluating duplicate records for enterprise ERP systems.

**MISSION:** Analyze these two customer records and determine if they represent the same business entity.

**CONFIDENCE SCORING GUIDELINES:**
- High (90%+ confidence): Nearly identical records, clear match with minor variations
- Medium (60-89% confidence): Significant similarities but some concerning differences  
- Low (Below 60%): Major differences, likely different entities

**ANALYSIS REQUIREMENTS:**
1. **WHAT**: Clear description of the comparison and key differences found
2. **WHY**: Detailed reasoning for your confidence assessment, referencing specific field matches/mismatches
3. **RECOMMENDATION**: Specific, actionable recommendation (MERGE, MANUAL REVIEW, DO NOT MERGE, FLAG FOR CLEANUP)
4. **CONFIDENCE CHANGE**: If applicable, explain how smart business rules influenced the assessment

**IMPORTANT NOTES:**
- TPI numbers, IDs, UIDs, and row numbers have been filtered out as they are unique primary keys
- Focus on business-relevant fields: company names, addresses, phone numbers, contact details
- Only identical TPI/ID numbers would indicate true duplicates and will be included if present
- You MUST analyze the ACTUAL data provided, not generic examples
- Reference actual field values, addresses, names, phone numbers, etc. from the records
- DO NOT use placeholder examples like "John Doe" or "123 Elm Street"

**CRITICAL JSON OUTPUT REQUIREMENTS:**
You MUST return valid JSON with these exact fields:
{
  "confidenceLevel": "High|Medium|Low",
  "what": "Clear, specific comparison of the ACTUAL records with exact field values referenced",
  "why": "Detailed reasoning explaining which exact field matches/mismatches influenced your decision and how the fuzzy score aligns with your assessment", 
  "recommendation": "Specific, actionable recommendation based on your analysis",
  "confidenceChange": "Explanation of how smart business rules influenced the confidence assessment",
  "businessContext": "${smartAnalysis.businessContext || 'Standard analysis applied'}",
  "riskFactors": ${JSON.stringify(smartAnalysis.riskFactors || [])},
  "exemptionReasons": ${JSON.stringify(smartAnalysis.exemptions || [])},
  "rulesApplied": ${JSON.stringify(smartAnalysis.appliedRules.map(r => `${r.ruleName}: ${r.reasoning}`))},
  "smartAnalysis": ${JSON.stringify(smartAnalysis)}
}

**DATA TO ANALYZE:**

**Record 1 (Business Fields Only):**
${JSON.stringify(record1, null, 2)}

**Record 2 (Business Fields Only):**
${JSON.stringify(record2, null, 2)}

**Fuzzy Match Score:** ${fuzzyScore} (0.0 to 1.0)

**Smart Business Rules Analysis Results:**
- Final Confidence: ${smartAnalysis.finalConfidence}
- Final Score: ${smartAnalysis.finalConfidenceScore}%
- Business Rules Recommendation: ${smartAnalysis.recommendation}
- Applied Rules: ${smartAnalysis.appliedRules.map(r => r.ruleName).join(', ')}
- Risk Factors: ${smartAnalysis.riskFactors?.join(', ') || 'None'}

**EXAMPLES OF GOOD ANALYSIS:**

**"what" field example:**
"Company names 'ABC Corp' vs 'ABC Corporation' show same entity with abbreviation variation. Addresses differ only in formatting: '123 Main St' vs '123 Main Street'. Phone numbers match exactly: (555) 123-4567."

**"recommendation" field examples:**
- "MERGE: Records represent the same entity. Use Record 1 as primary due to more complete address data."
- "MANUAL REVIEW: Investigate phone number discrepancy before merging. Verify with customer."
- "DO NOT MERGE: Different entities. Company names indicate separate subsidiaries."
- "FLAG FOR CLEANUP: Same entity but address formatting needs standardization."

Analyze these specific records and provide a JSON response with your detailed assessment.`;
}

/**
 * Azure OpenAI API call
 */
async function callAzureOpenAI(provider: any, prompt: string): Promise<AnalyzeDuplicateConfidenceOutput> {
  const response = await fetchWithTimeout(
    `${provider.config.endpoint}/openai/deployments/${provider.config.deployment}/chat/completions?api-version=${provider.config.apiVersion}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': provider.config.apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that analyzes duplicate records. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    },
    20000 // 20 second timeout for AI calls
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI error: ${response.status} - ${error} endpoint: ${provider.config.endpoint} deployment: ${provider.config.deployment} apiVersion: ${provider.config.apiVersion}`);
  }

  const data = await response.json();
  
  // Validate response structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
    console.error('Invalid Azure OpenAI response structure:', data);
    throw new Error('Invalid response structure from Azure OpenAI');
  }
  
  const content = data.choices[0].message.content;
  
  try {
    // Try to parse the JSON content
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse Azure OpenAI JSON response:', {
      content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
    });
    
    // Try to extract JSON from the content if it's embedded in text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (secondParseError) {
        console.error('Failed to parse extracted JSON:', secondParseError);
      }
    }
    
    throw new Error(`Failed to parse JSON response from Azure OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

/**
 * OpenAI API call
 */
async function callOpenAI(provider: any, prompt: string): Promise<AnalyzeDuplicateConfidenceOutput> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.config.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.config.model || 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes duplicate records. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    }),
  }, 20000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Google Gemini API call
 */
async function callGoogleGemini(provider: any, prompt: string): Promise<AnalyzeDuplicateConfidenceOutput> {
  const model = provider.config.model || 'gemini-2.0-flash-lite'; // Use the fastest model
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      }),
    },
    20000
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Gemini error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const responseText = data.candidates[0].content.parts[0].text;
  
  // Extract JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Anthropic Claude API call
 */
async function callAnthropic(provider: any, prompt: string): Promise<AnalyzeDuplicateConfidenceOutput> {
  const anthropic = new Anthropic();

const msg = await anthropic.messages.create({
  model: "claude-3-5-haiku-latest",
  max_tokens: 1000,
  temperature: 1,
  system: "You are an AI assistant that analyzes duplicate records. Always respond with valid JSON.",
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt
        }
      ]
    }
  ]
});

  if (!msg) {
    throw new Error(`Anthropic error: ${msg}`);
  }

  const firstContent = msg.content[0];
  if (firstContent.type !== 'text') {
    throw new Error('Expected text response from Anthropic');
  }
  const responseText = firstContent.text;
  
  // Extract JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Anthropic response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Get current provider status
 */
export async function getProviderStatus() {
  await ensureProviderManagerInitialized();
  const providerManager = getAIProviderManager();
  
  return {
    currentProvider: providerManager.getCurrentProvider(),
    allProviders: providerManager.getProviderStatus()
  };
} 