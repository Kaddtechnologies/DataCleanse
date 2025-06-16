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

import { serverConfig } from '@/config/environment';
import { getAIProviderManager } from '@/lib/ai-provider-manager';

/* -------------------------------------------------------------------------- */
/*                            Prompt (unchanged)                              */
/* -------------------------------------------------------------------------- */

// Legacy prompt - No longer used
// The active prompt is now in src/services/multi-provider-ai.service.ts
// This file is kept for potential future Genkit integration

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
  const { azureOpenAI } = require('genkitx-azure-openai');

  ai = genkit({
    plugins: [
      azureOpenAI({
        apiKey: serverConfig.azureOpenAi.apiKey,
        endpoint: serverConfig.azureOpenAi.endpoint,
        apiVersion: serverConfig.azureOpenAi.apiVersion,
      }),
    ],
    model: `azure_openai/${serverConfig.azureOpenAi.deploymentName}`,
  });
} else {
  // ----- Running in the browser (client) -----
  ai = createClientStub();
}
/* eslint-enable @typescript-eslint/no-var-requires */

export { ai };
