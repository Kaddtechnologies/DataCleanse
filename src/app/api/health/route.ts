import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

export async function GET() {
  try {
    const isDatabaseHealthy = await checkDatabaseHealth();
    
    const healthStatus = {
      status: isDatabaseHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: isDatabaseHealthy ? 'connected' : 'disconnected',
          type: 'PostgreSQL with pgvector'
        },
        api: {
          status: 'running',
          version: '1.0.0'
        }
      }
    };

    const statusCode = isDatabaseHealthy ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: statusCode });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: { status: 'error' },
          api: { status: 'error' }
        }
      },
      { status: 503 }
    );
  }
}