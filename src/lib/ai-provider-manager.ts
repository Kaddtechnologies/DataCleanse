/**
 * AI Provider Management System
 * Handles health checks, validation, and automatic fallback between AI providers
 */

export interface AIProvider {
  name: string;
  priority: number;
  type: 'azure_openai' | 'openai' | 'google_gemini' | 'anthropic';
  config: {
    apiKey?: string;
    endpoint?: string;
    deployment?: string;
    apiVersion?: string;
    model?: string;
  };
  healthCheckEndpoint?: string;
  isHealthy?: boolean;
  lastChecked?: Date;
  errorCount?: number;
}

export interface AIProviderConfig {
  providers: AIProvider[];
  healthCheckInterval?: number; // milliseconds
  maxRetries?: number;
  timeout?: number; // milliseconds for health checks
}

class AIProviderManager {
  private providers: AIProvider[];
  private currentProvider: AIProvider | null = null;
  private healthCheckInterval: number;
  private maxRetries: number;
  private timeout: number;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: AIProviderConfig) {
    this.providers = config.providers.sort((a, b) => a.priority - b.priority);
    this.healthCheckInterval = config.healthCheckInterval || 60000; // 1 minute
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 5000; // 5 seconds
  }

  /**
   * Initialize the provider manager and run initial health checks
   */
  async initialize(): Promise<AIProvider | null> {
    console.log('🔍 Initializing AI Provider Manager...');
    
    // Run initial health checks
    await this.runHealthChecks();
    
    // Start periodic health checks
    this.startPeriodicHealthChecks();
    
    return this.currentProvider;
  }

  /**
   * Run health checks for all providers
   */
  async runHealthChecks(): Promise<void> {
    console.log('🏥 Running health checks for all AI providers...');
    
    for (const provider of this.providers) {
      const isHealthy = await this.checkProviderHealth(provider);
      provider.isHealthy = isHealthy;
      provider.lastChecked = new Date();
      
      if (isHealthy && !this.currentProvider) {
        this.currentProvider = provider;
        console.log(`✅ Selected ${provider.name} as primary AI provider`);
      }
    }

    // If current provider is unhealthy, find a new one
    if (this.currentProvider && !this.currentProvider.isHealthy) {
      console.log(`⚠️ Current provider ${this.currentProvider.name} is unhealthy, finding alternative...`);
      this.selectHealthyProvider();
    }
  }

  /**
   * Check health of a specific provider
   */
  private async checkProviderHealth(provider: AIProvider): Promise<boolean> {
    try {
      console.log(`🔍 Checking health of ${provider.name}...`);
      
      switch (provider.type) {
        case 'azure_openai':
          return await this.checkAzureOpenAIHealth(provider);
        case 'openai':
          return await this.checkOpenAIHealth(provider);
        case 'google_gemini':
          return await this.checkGeminiHealth(provider);
        case 'anthropic':
          return await this.checkAnthropicHealth(provider);
        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ Health check failed for ${provider.name}:`, error);
      provider.errorCount = (provider.errorCount || 0) + 1;
      return false;
    }
  }

  /**
   * Azure OpenAI health check
   */
  private async checkAzureOpenAIHealth(provider: AIProvider): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${provider.config.endpoint}/openai/models?api-version=${provider.config.apiVersion}`, {
        method: 'GET',
        headers: {
          'api-key': provider.config.apiKey || '',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ ${provider.name} is healthy`);
        provider.errorCount = 0;
        return true;
      }

      console.log(`❌ ${provider.name} returned status: ${response.status}`);
      return false;
    } catch (error) {
      console.error(`❌ ${provider.name} health check error:`, error);
      return false;
    }
  }

  /**
   * OpenAI health check
   */
  private async checkOpenAIHealth(provider: AIProvider): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.config.apiKey}`,
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ ${provider.name} is healthy`);
        provider.errorCount = 0;
        return true;
      }

      console.log(`❌ ${provider.name} returned status: ${response.status}`);
      return false;
    } catch (error) {
      console.error(`❌ ${provider.name} health check error:`, error);
      return false;
    }
  }

  /**
   * Google Gemini health check
   */
  private async checkGeminiHealth(provider: AIProvider): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Gemini uses a different endpoint structure
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${provider.config.apiKey}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ ${provider.name} is healthy`);
        provider.errorCount = 0;
        return true;
      }

      console.log(`❌ ${provider.name} returned status: ${response.status}`);
      return false;
    } catch (error) {
      console.error(`❌ ${provider.name} health check error:`, error);
      return false;
    }
  }

  /**
   * Anthropic health check
   */
  private async checkAnthropicHealth(provider: AIProvider): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Anthropic doesn't have a direct health endpoint, so we'll do a minimal completion
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.config.apiKey || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: provider.config.model || 'claude-3-5-haiku-latest',
          prompt: '\n\nHuman: Hi\n\nAssistant:',
          max_tokens_to_sample: 1,
          temperature: 0
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ ${provider.name} is healthy`);
        provider.errorCount = 0;
        return true;
      }

      console.log(`❌ ${provider.name} returned status: ${response.status}`);
      return false;
    } catch (error) {
      console.error(`❌ ${provider.name} health check error:`, error);
      return false;
    }
  }

  /**
   * Select the next healthy provider
   */
  private selectHealthyProvider(): void {
    const healthyProvider = this.providers.find(p => p.isHealthy);
    
    if (healthyProvider) {
      this.currentProvider = healthyProvider;
      console.log(`🔄 Switched to ${healthyProvider.name} as AI provider`);
    } else {
      console.error('❌ No healthy AI providers available!');
      this.currentProvider = null;
    }
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.healthCheckInterval);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): AIProvider | null {
    return this.currentProvider;
  }

  /**
   * Get all providers with their health status
   */
  getProviderStatus(): AIProvider[] {
    return this.providers;
  }

  /**
   * Force switch to a specific provider (for testing)
   */
  async switchProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.find(p => p.name === providerName);
    
    if (!provider) {
      console.error(`Provider ${providerName} not found`);
      return false;
    }

    const isHealthy = await this.checkProviderHealth(provider);
    
    if (isHealthy) {
      this.currentProvider = provider;
      console.log(`🔄 Manually switched to ${provider.name}`);
      return true;
    }

    console.error(`❌ Cannot switch to ${providerName} - provider is unhealthy`);
    return false;
  }

  /**
   * Get provider configuration for Genkit
   */
  getGenkitConfig(): any {
    if (!this.currentProvider) {
      throw new Error('No healthy AI provider available');
    }

    switch (this.currentProvider.type) {
      case 'azure_openai':
        return {
          type: 'azure_openai',
          apiKey: this.currentProvider.config.apiKey,
          endpoint: this.currentProvider.config.endpoint,
          apiVersion: this.currentProvider.config.apiVersion,
          deployment: this.currentProvider.config.deployment,
          model: `azure_openai/${this.currentProvider.config.deployment}`
        };
      
      case 'openai':
        return {
          type: 'openai',
          apiKey: this.currentProvider.config.apiKey,
          model: this.currentProvider.config.model || 'gpt-4-turbo-preview'
        };
      
      case 'google_gemini':
        return {
          type: 'google_gemini',
          apiKey: this.currentProvider.config.apiKey,
          model: this.currentProvider.config.model || 'gemini-pro'
        };
      
      case 'anthropic':
        return {
          type: 'anthropic',
          apiKey: this.currentProvider.config.apiKey,
          model: this.currentProvider.config.model || 'claude-3-opus-20240229'
        };
      
      default:
        throw new Error(`Unknown provider type: ${this.currentProvider.type}`);
    }
  }
}

// Singleton instance
let aiProviderManager: AIProviderManager | null = null;

/**
 * Initialize the AI Provider Manager
 */
export async function initializeAIProviderManager(config: AIProviderConfig): Promise<AIProvider | null> {
  aiProviderManager = new AIProviderManager(config);
  return await aiProviderManager.initialize();
}

/**
 * Get the AI Provider Manager instance
 */
export function getAIProviderManager(): AIProviderManager {
  if (!aiProviderManager) {
    throw new Error('AI Provider Manager not initialized. Call initializeAIProviderManager first.');
  }
  return aiProviderManager;
}

export default AIProviderManager; 