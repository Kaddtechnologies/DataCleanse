export const environment = {
  apiBaseUrl: process.env.NODE_ENV === 'production'
    ? 'https://datacleansing.redocean-27211e6a.centralus.azurecontainerapps.io'
    : 'http://localhost:8000',
     azureOpenAiEndpoint:'https://dev-openai-35t-16k.openai.azure.com/openai/deployments/dai-gpt-4.1-nano' ,
     azureOpenAiApiKey: '6kEA8jhAvaSiqoIDVUXygVWyLEKsmSUY0zIBOqsNeN2g0O6QWtWuJQQJ99BDACHYHv6XJ3w3AAABACOGTeiK',
     openAiApiVersion: '2025-01-01-preview',
     azureOpenAiDeploymentName: 'dai-gpt-4.1-nano',
     googleApiKey: 'AIzaSyAGxugbJDi84dIQeIvx6moBPdCDwJdhJIw',
     openAiApiKey: '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',
     anthropicApiKey: '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'

};