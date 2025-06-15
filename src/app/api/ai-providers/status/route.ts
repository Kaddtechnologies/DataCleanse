import { NextRequest, NextResponse } from 'next/server';
import { getProviderStatus } from '@/services/multi-provider-ai.service';

export async function GET(request: NextRequest) {
  try {
    const status = await getProviderStatus();
    
    return NextResponse.json({
      success: true,
      currentProvider: status.currentProvider,
      providers: status.allProviders.map(provider => ({
        name: provider.name,
        type: provider.type,
        priority: provider.priority,
        isHealthy: provider.isHealthy,
        lastChecked: provider.lastChecked,
        errorCount: provider.errorCount || 0
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting AI provider status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get provider status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, providerName } = await request.json();
    
    if (action === 'refresh') {
      // Force refresh all provider health checks
      const status = await getProviderStatus();
      return NextResponse.json({
        success: true,
        message: 'Health checks refreshed',
        currentProvider: status.currentProvider,
        providers: status.allProviders
      });
    }
    
    if (action === 'switch' && providerName) {
      // Force switch to a specific provider (for testing)
      const { getAIProviderManager } = await import('@/lib/ai-provider-manager');
      const manager = getAIProviderManager();
      const success = await manager.switchProvider(providerName);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: `Switched to ${providerName}`,
          currentProvider: manager.getCurrentProvider()
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `Failed to switch to ${providerName}`
        }, { status: 400 });
      }
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in AI provider action:', error);
    return NextResponse.json(
      { 
        error: 'Action failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 