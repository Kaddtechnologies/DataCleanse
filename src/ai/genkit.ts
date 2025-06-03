/**
 * Genkit configuration
 *
 * IMPORTANT: Genkit and its provider plugins rely on many Node-only APIs and
 * MUST NOT be bundled into the browser.  We therefore:
 *
 *  1.  Avoid static `import` of Genkit / plugins so that Next.js (webpack)
 *      never even tries to bundle them for the client.
 *  2.  Dynamically `require()` them only when the code is executing on the
 *      server (`typeof window === 'undefined'`).
 *  3.  On the client, export a lightweight stub that throws if accessed,
 *      guarding against accidental usage.
 */

import { environment } from '../../environment';

/* -------------------------------------------------------------------------- */
/*                            Prompt (unchanged)                              */
/* -------------------------------------------------------------------------- */

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

For each entry, provide a clear and concise explanation of your confidence assessment.
Do not over explain, but do not be too concise.
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

/* -------------------------------------------------------------------------- */
/*                        Server-only Genkit initialization                   */
/* -------------------------------------------------------------------------- */

type AnyObject = Record<string, unknown>;

/**
 * A stub proxy returned on the client to immediately warn developers if they
 * inadvertently call Genkit code that must run server-side.
 */
function createClientStub(): AnyObject {
  return new Proxy(
    {},
    {
      // Allow property access (e.g. ai.definePrompt) but return a function
      // that throws when *invoked*. This prevents errors during module
      // initialisation in the browser while still safeguarding execution.
      get() {
        return () => {
          throw new Error(
            'Genkit AI functions are only available on the server. ' +
              'Ensure calls to `ai` utilities run in server components or API routes.'
          );
        };
      },
    }
  );
}

let ai: any;

/* eslint-disable @typescript-eslint/no-var-requires */
if (typeof window === 'undefined') {
  // ----- Running on the server -----
  // Dynamic requires so webpack doesn’t include these in the client bundle.
  const { genkit } = require('genkit');
  const { azureOpenAI, gpt4o } = require('genkitx-azure-openai');

  ai = genkit({
    plugins: [
      azureOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: environment.azureOpenAiEndpoint,
        apiVersion: environment.openAiApiVersion,
        deployment: environment.azureOpenAiDeploymentName,
      }),
    ],
    model: gpt4o,
  });
} else {
  // ----- Running in the browser (client) -----
  ai = createClientStub();
}
/* eslint-enable @typescript-eslint/no-var-requires */

export { ai };
