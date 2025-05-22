export const environment = {
  apiBaseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://datacleansing.redocean-27211e6a.centralus.azurecontainerapps.io'
    : 'http://localhost:8000',
     azureOpenAiEndpoint:'https://devoai.openai.azure.com/openai/deployments/gpt-4o-devoai-2024-08-06/chat/completions?api-version=2025-01-01-preview' ,
     azureOpenAiApiKey: '',
     openAiApiVersion: '2025-01-01-preview'
};