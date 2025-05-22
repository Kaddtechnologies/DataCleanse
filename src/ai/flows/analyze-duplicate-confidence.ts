// src/ai/flows/analyze-duplicate-confidence.ts
'use server';

/**
 * @fileOverview AI flow to analyze potential duplicate records and suggest a confidence level.
 *
 * - analyzeDuplicateConfidence - Analyzes potential duplicate records and provides a confidence level.
 * - AnalyzeDuplicateConfidenceInput - The input type for the analyzeDuplicateConfidence function.
 * - AnalyzeDuplicateConfidenceOutput - The return type for the analyzeDuplicateConfidence function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDuplicateConfidenceInputSchema = z.object({
  record1: z.record(z.string()).describe('The first record to compare, as a key-value object.'),
  record2: z.record(z.string()).describe('The second record to compare, as a key-value object.'),
  fuzzyScore: z.number().describe('The fuzzy matching score between the two records.'),
});
export type AnalyzeDuplicateConfidenceInput = z.infer<
  typeof AnalyzeDuplicateConfidenceInputSchema
>;

const AnalyzeDuplicateConfidenceOutputSchema = z.object({
  confidenceLevel: z
    .string()
    .describe(
      'The AI-suggested confidence level for the match (e.g., High, Medium, Low).'
    ),
  what: z
    .string()
    .describe('Clear description of the comparison and key differences found.'),
  why: z
    .string()
    .describe('Detailed reasoning for the confidence assessment.'),
  recommendation: z
    .string()
    .describe('Specific actions or areas needing attention.'),
  confidenceChange: z
    .string()
    .optional()
    .describe('Explanation of confidence score changes if any.'),
  reasoning: z
    .string()
    .describe('The AI reasoning behind the assigned confidence level.')
    .optional(),
});
export type AnalyzeDuplicateConfidenceOutput = z.infer<
  typeof AnalyzeDuplicateConfidenceOutputSchema
>;

// Schema for the data structured specifically for the prompt
const AnalyzeDuplicateConfidencePromptInputSchema = z.object({
  record1String: z.string().describe('The first record to compare, as a JSON string.'),
  record2String: z.string().describe('The second record to compare, as a JSON string.'),
  fuzzyScore: z.number().describe('The fuzzy matching score between the two records.'),
});


export async function analyzeDuplicateConfidence(
  input: AnalyzeDuplicateConfidenceInput
): Promise<AnalyzeDuplicateConfidenceOutput> {
  return analyzeDuplicateConfidenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDuplicateConfidencePrompt',
  input: {schema: AnalyzeDuplicateConfidencePromptInputSchema}, // Use the prompt-specific input schema
  output: {schema: AnalyzeDuplicateConfidenceOutputSchema},
  prompt: `You are an AI assistant that analyzes potential duplicate records and suggests a confidence level for the match.

  Given two records and their fuzzy matching score, provide a structured analysis including:
  1. WHAT: Clear description of the comparison and key differences found
  2. WHY: Detailed reasoning for your confidence assessment
  3. RECOMMENDATION: Specific actions or areas needing attention
  4. CONFIDENCE LEVEL: High, Medium, or Low based on your analysis
  5. CONFIDENCE CHANGE: If applicable, explain why the confidence score was upgraded or downgraded
     (e.g., "Confidence upgraded from 89% to 92% due to additional matching phone numbers"
           "Confidence downgraded from 77% to 60% - recommend manual review of rows X and Y")

  Record 1: {{{record1String}}}
  Record 2: {{{record2String}}}
  Fuzzy Matching Score: {{{fuzzyScore}}}

  Consider factors like:
  - Name similarity and variations
  - Address matching and formatting differences
  - City, state, and country consistency
  - TPI number matches if available
  - Overall fuzzy matching score

  If the fuzzy matching score is borderline (e.g., around 0.7-0.8), carefully analyze the records to identify any discrepancies or similarities that might affect the confidence level.
  
  Return your analysis in a structured format with clear sections for what, why, recommendation, confidence level, and any confidence changes.
  `,
});

const analyzeDuplicateConfidenceFlow = ai.defineFlow(
  {
    name: 'analyzeDuplicateConfidenceFlow',
    inputSchema: AnalyzeDuplicateConfidenceInputSchema, // Flow's public input schema
    outputSchema: AnalyzeDuplicateConfidenceOutputSchema,
  },
  async (flowInput: AnalyzeDuplicateConfidenceInput) => {
    // Prepare the input for the prompt by stringifying the records
    const promptInput = {
      record1String: JSON.stringify(flowInput.record1),
      record2String: JSON.stringify(flowInput.record2),
      fuzzyScore: flowInput.fuzzyScore,
    };
    
    const {output} = await prompt(promptInput); // Pass the transformed input to the prompt
    return output!;
  }
);
