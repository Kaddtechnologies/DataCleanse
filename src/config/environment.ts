/**
 * Environment configuration for Next.js application
 * Uses Next.js environment variable conventions
 * 
 * Server-side variables (without NEXT_PUBLIC_ prefix) are only available in API routes and server components
 * Client-side variables (with NEXT_PUBLIC_ prefix) are available everywhere but are exposed to the browser
 */

// Server-side only environment variables (sensitive data)
export const serverConfig = {
  // Azure OpenAI Configuration (server-side only for security)
  azureOpenAi: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview',
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'dai-gpt-4.1-nano',
  },
  
  // Other API Keys (server-side only)
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://mdm_user:mdm_password123@localhost:5433/mdm_dedup',
  }
};

// Client-side environment variables (public data)
export const publicConfig = {
  // API Base URL (can be exposed to client)
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || (
    process.env.NODE_ENV === 'production'
      ? 'https://datacleanse.sliplane.app'
      : 'http://localhost:8000'
  ),
  
  // Application metadata
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'MDM Master Data Governance Platform',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Feature flags
  features: {
    aiRulesEnabled: process.env.NEXT_PUBLIC_FEATURE_AI_RULES === 'true',
    erpIntegrationEnabled: process.env.NEXT_PUBLIC_FEATURE_ERP_INTEGRATION === 'true',
    dataQualityEnabled: process.env.NEXT_PUBLIC_FEATURE_DATA_QUALITY === 'true',
  }
};

// Validation function to ensure required environment variables are set
export function validateEnvironment() {
  const requiredServerVars = [
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_DEPLOYMENT_NAME',
  ];
  
  const missingVars = requiredServerVars.filter(
    varName => !process.env[varName]
  );
  
  if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
  
  return true;
}

// Helper to check if we're running on the server
export const isServer = typeof window === 'undefined';

// Export the old environment object for backward compatibility
// This will be deprecated in future versions
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