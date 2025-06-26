/**
 * AI Provider Management System
 * Handles health checks, validation, and automatic fallback between AI providers
 */
import Anthropic from "@anthropic-ai/sdk";
import { serverConfig } from '@/config/environment';

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
  private isInitialized: boolean = false;
  private initializationPromise?: Promise<AIProvider | null>;

  constructor(config: AIProviderConfig) {
    this.providers = config.providers.sort((a, b) => a.priority - b.priority);
    this.healthCheckInterval = config.healthCheckInterval || 300000; // 5 minutes instead of 1 minute
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 10000; // 10 seconds instead of 5
  }

  /**
   * Initialize the provider manager and run initial health checks
   */
  async initialize(): Promise<AIProvider | null> {
    // If already initializing, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create initialization promise
    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<AIProvider | null> {
    console.log('🔍 Initializing AI Provider Manager...');
    
    // Run initial health checks in background
    this.runHealthChecks().catch(err => {
      console.error('Error during initial health checks:', err);
    });
    
    // Start periodic health checks
    this.startPeriodicHealthChecks();
    
    // Set a reasonable provider as default while health checks run
    if (this.providers.length > 0) {
      this.currentProvider = this.providers[0];
      console.log(`🚀 Using ${this.currentProvider.name} as initial provider (health check pending)`);
    }
    
    this.isInitialized = true;
    return this.currentProvider;
  }

  /**
   * Run health checks for all providers
   */
  async runHealthChecks(): Promise<void> {
    console.log('🏥 Running health checks for all AI providers...');
    
    // Run all health checks in parallel
    const healthCheckPromises = this.providers.map(async (provider) => {
      const isHealthy = await this.checkProviderHealth(provider);
      provider.isHealthy = isHealthy;
      provider.lastChecked = new Date();
      return { provider, isHealthy };
    });

    // Wait for all health checks to complete with a timeout
    const results = await Promise.allSettled(healthCheckPromises);
    
    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { provider, isHealthy } = result.value;
        if (isHealthy && !this.currentProvider) {
          this.currentProvider = provider;
          console.log(`✅ Selected ${provider.name} as primary AI provider`);
        }
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
      
      // If provider was recently checked and marked healthy, skip the check
      if (provider.isHealthy && provider.lastChecked) {
        const timeSinceLastCheck = Date.now() - provider.lastChecked.getTime();
        if (timeSinceLastCheck < 60000) { // 1 minute grace period
          console.log(`✅ ${provider.name} recently checked and healthy, skipping`);
          return true;
        }
      }
      
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

      // Don't fail immediately on 4xx errors - they might be temporary
      if (response.status >= 400 && response.status < 500) {
        console.log(`⚠️ ${provider.name} returned ${response.status}, treating as temporarily unhealthy`);
        provider.errorCount = (provider.errorCount || 0) + 1;
        
        // Only mark as unhealthy after multiple failures
        return provider.errorCount < 3;
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

      const anthropic = new Anthropic();
      anthropic.apiKey = serverConfig.anthropicApiKey;
      const msg = await anthropic.messages.create({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1000,
        temperature: 1,
        system: "Respond only with short poems.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Why is the ocean salty?"
              }
            ]
          }
        ]
      });

      clearTimeout(timeoutId);

      if (msg) {
        console.log(`✅ ${provider.name} is healthy`);
        provider.errorCount = 0;
        return true;
      }

      console.log(`❌ ${provider.name} returned status: ${msg}`);
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
   * Mark a provider as temporarily failed (used when API calls fail)
   */
  markProviderTemporarilyFailed(providerName: string): void {
    const provider = this.providers.find(p => p.name === providerName);
    if (provider) {
      provider.errorCount = (provider.errorCount || 0) + 1;
      provider.lastChecked = new Date();
      
      // Mark as unhealthy if too many errors
      if (provider.errorCount >= 3) {
        provider.isHealthy = false;
        console.log(`❌ ${providerName} marked as unhealthy due to repeated failures`);
        
        // Switch to next available provider if this was the current one
        if (this.currentProvider?.name === providerName) {
          this.selectHealthyProvider();
        }
      }
    }
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