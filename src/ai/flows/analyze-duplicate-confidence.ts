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
  reasoning: z.string().describe('The AI reasoning behind the assigned confidence level.'),
});
export type AnalyzeDuplicateConfidenceOutput = z.infer<
  typeof AnalyzeDuplicateConfidenceOutputSchema
>;

export async function analyzeDuplicateConfidence(
  input: AnalyzeDuplicateConfidenceInput
): Promise<AnalyzeDuplicateConfidenceOutput> {
  return analyzeDuplicateConfidenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDuplicateConfidencePrompt',
  input: {schema: AnalyzeDuplicateConfidenceInputSchema},
  output: {schema: AnalyzeDuplicateConfidenceOutputSchema},
  prompt: `You are an AI assistant that analyzes potential duplicate records and suggests a confidence level for the match.

  Given two records and their fuzzy matching score, determine a confidence level (High, Medium, or Low) and provide a brief reasoning.

  Record 1: {{{JSON.stringify record1}}}
  Record 2: {{{JSON.stringify record2}}}
  Fuzzy Matching Score: {{{fuzzyScore}}}

  Consider factors like the similarity of names, addresses, and other key fields when determining the confidence level.
  If the fuzzy matching score is borderline (e.g., around 0.7-0.8), carefully analyze the records to identify any discrepancies or similarities that might affect the confidence level.
  Return the confidence level and reasoning in a structured format.
  `,
});

const analyzeDuplicateConfidenceFlow = ai.defineFlow(
  {
    name: 'analyzeDuplicateConfidenceFlow',
    inputSchema: AnalyzeDuplicateConfidenceInputSchema,
    outputSchema: AnalyzeDuplicateConfidenceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

