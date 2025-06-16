/**
 * @deprecated This file is deprecated. Use src/config/environment.ts instead.
 * This file is kept for backward compatibility only.
 */

import { serverConfig, publicConfig } from './src/config/environment';

export const environment = {
  apiBaseUrl: publicConfig.apiBaseUrl,
  azureOpenAiEndpoint: serverConfig.azureOpenAi.endpoint,
  azureOpenAiApiKey: serverConfig.azureOpenAi.apiKey,
  openAiApiVersion: serverConfig.azureOpenAi.apiVersion,
  azureOpenAiDeploymentName: serverConfig.azureOpenAi.deploymentName,
  googleApiKey: serverConfig.googleApiKey,
  openAiApiKey: serverConfig.openAiApiKey,
  anthropicApiKey: serverConfig.anthropicApiKey,
};