export const environment = {
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://datacleansing.redocean-27211e6a.centralus.azurecontainerapps.io'
    : 'http://localhost:8000',
     azureOpenAiEndpoint:'https://devoai.openai.azure.com' ,
     azureOpenAiApiKey: '',
     openAiApiVersion: '2025-01-01-preview',
     azureOpenAiDeploymentName: 'dai-gpt-4.1-nano'

};