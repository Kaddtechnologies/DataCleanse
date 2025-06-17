import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

export async function GET() {
  try {
    // For production environments without a database (like Sliplane), 
    // we can return healthy without checking the database
    const skipDatabaseCheck = process.env.SKIP_DB_HEALTH_CHECK === 'true' || 
                             (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production');
    
    let isDatabaseHealthy = true;
    let databaseStatus = 'not_configured';
    
    if (!skipDatabaseCheck) {
      try {
        isDatabaseHealthy = await checkDatabaseHealth();
        databaseStatus = isDatabaseHealthy ? 'connected' : 'disconnected';
      } catch (error) {
        console.error('Database health check failed:', error);
        isDatabaseHealthy = false;
        databaseStatus = 'error';
      }
    }
    
    const healthStatus = {
      status: 'healthy', // Always return healthy for app health
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: {
          status: databaseStatus,
          type: 'PostgreSQL with pgvector',
          required: !skipDatabaseCheck
        },
        api: {
          status: 'running',
          version: '1.0.0'
        }
      }
    };

    // Always return 200 for app health, regardless of database status
    return NextResponse.json(healthStatus, { status: 200 });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'partial', // App is running but may have issues
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: { status: 'error', required: false },
          api: { status: 'running' }
        }
      },
      { status: 200 } // Still return 200 for Sliplane health check
    );
  }
}