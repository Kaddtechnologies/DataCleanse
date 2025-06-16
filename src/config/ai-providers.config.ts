import { AIProviderConfig } from '@/lib/ai-provider-manager';
import { serverConfig } from '@/config/environment';

/**
 * AI Provider Configuration
 * Priority order: 1. Azure OpenAI, 2. OpenAI, 3. Google Gemini, 4. Anthropic
 */
export const aiProviderConfig: AIProviderConfig = {
  providers: [
    {
      name: 'Azure OpenAI',
      priority: 1,
      type: 'azure_openai',
      config: {
        apiKey: serverConfig.azureOpenAi.apiKey || '',
        endpoint: serverConfig.azureOpenAi.endpoint || 'https://dev-openai-35t-16k.openai.azure.com',
        apiVersion: serverConfig.azureOpenAi.apiVersion || '2025-01-01-preview',
        deployment: serverConfig.azureOpenAi.deploymentName || 'dai-gpt-4-1-nano'
      }
    },
    {
      name: 'OpenAI',
      priority: 2,
      type: 'openai',
      config: {
        apiKey: serverConfig.openAiApiKey || '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',
        model: 'gpt-4.1-nano'
      }
    },
    {
      name: 'Google Gemini',
      priority: 3,
      type: 'google_gemini',
      config: {
        apiKey: serverConfig.googleApiKey || 'AIzaSyAGxugbJDi84dIQeIvx6moBPdCDwJdhJIw',
        model: 'gemini-2.0-flash-lite'
      }
    },
    {
      name: 'Anthropic Claude',
      priority: 4,
      type: 'anthropic',
      config: {
        apiKey: serverConfig.anthropicApiKey || '', // Add your Anthropic key
        model: 'claude-3-5-haiku-latest'
      }
    }
  ],
  healthCheckInterval:160000, // Check every 2.5 minutes
  maxRetries: 0,
  timeout: 60000 // 5 second timeout for health checks
};

/**
 * Get backup API keys for providers (if you have multiple keys)
 */
export const backupKeys = {
  azure_openai: [
    // Add backup Azure keys here if available
  ],
  openai: [
    // Add backup OpenAI keys here if available
  ],
  google_gemini: [
    // Add backup Google keys here if available
  ],
  anthropic: [
    // Add backup Anthropic keys here if available
  ]
}; 