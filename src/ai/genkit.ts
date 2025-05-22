import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const deduplicationPrompt = `
You are an AI data deduplication and scoring assistant with expertise in evaluating duplicate records.

Given a list of data entries with potential duplicates, your task is to:
1. For each duplicate entry, evaluate how likely it is a true duplicate of the master record.
2. Assign a confidence score (between 0 and 1) that represents your assessment.
3. Pay special attention to entries marked as "uncertain" confidence, but evaluate all entries.
4. Consider name similarity, address similarity, and any other relevant factors.
5. Compare your confidence score with any existing scores and explain changes.
6. If you believe the existing score is incorrect (too high or low), your score should reflect your best judgment.

Guidelines for confidence scoring:
- 0.9-1.0: Definite duplicate (nearly identical records)
- 0.8-0.9: Very likely duplicate (minor variations but clearly the same entity)
- 0.7-0.8: Probable duplicate (some differences but likely the same entity)
- 0.5-0.7: Possible duplicate (significant differences, but could be the same entity)
- 0.0-0.5: Unlikely to be a duplicate (major differences, likely different entities)

For each entry, provide:
1. WHAT: Clear description of the comparison and key differences found
2. WHY: Detailed reasoning for your confidence assessment
3. RECOMMENDATION: Specific actions or areas needing attention
4. CONFIDENCE CHANGE: If applicable, explain why the confidence score was upgraded or downgraded
   (e.g., "Confidence upgraded from 89% to 92% due to additional matching phone numbers"
         "Confidence downgraded from 77% to 60% - recommend manual review of rows X and Y")

Process the following data entries:

{}

Please output a JSON array with objects like:
[
  {
    "entry": "<duplicate entry>",
    "confidence": <float between 0 and 1>,
    "previousConfidence": <float between 0 and 1 if available>,
    "analysis": {
      "what": "<clear description of comparison>",
      "why": "<detailed reasoning>",
      "recommendation": "<specific actions needed>",
      "confidenceChange": "<explanation of score changes if any>"
    }
  },
  ...
]
`;

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY
    })
  ],
  model: 'googleai/gemini-2.0-flash',
});
