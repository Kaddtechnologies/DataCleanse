import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🏥 Database health check started...');
    console.log('🔧 Environment:', process.env.NODE_ENV);
    
    const client = await pool.connect();
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Database connection acquired in ${connectionTime}ms`);
    
    try {
      // Test basic connectivity
      const result = await client.query('SELECT NOW() as current_time, version() as db_version, current_database() as db_name, current_user as db_user');
      console.log('✅ Database query successful:', result.rows[0]);
      
      // Get database size information
      const dbSizeResult = await client.query(`
        SELECT 
          pg_database.datname as db_name,
          pg_size_pretty(pg_database_size(pg_database.datname)) as db_size
        FROM pg_database 
        WHERE pg_database.datname = current_database()
      `);
      
      // Test if business_rules table exists
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'business_rules'
      `);
      
      const hasBusinessRulesTable = tableCheck.rows.length > 0;
      console.log('📋 Business rules table exists:', hasBusinessRulesTable);
      
      // Get all tables in the database
      const allTablesResult = await client.query(`
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      // Test if we can query business_rules table
      let rulesCount = 0;
      if (hasBusinessRulesTable) {
        const rulesResult = await client.query('SELECT COUNT(*) as count FROM business_rules');
        rulesCount = parseInt(rulesResult.rows[0].count);
        console.log('📊 Rules count:', rulesCount);
      }
      
      // Get user_sessions count if table exists
      let sessionsCount = 0;
      const sessionsTableExists = allTablesResult.rows.some(row => row.table_name === 'user_sessions');
      if (sessionsTableExists) {
        const sessionsResult = await client.query('SELECT COUNT(*) as count FROM user_sessions');
        sessionsCount = parseInt(sessionsResult.rows[0].count);
      }
      
      const totalTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        status: 'healthy',
        performance: {
          connection_time_ms: connectionTime,
          total_time_ms: totalTime
        },
        database: {
          connected: true,
          name: result.rows[0].db_name,
          user: result.rows[0].db_user,
          version: result.rows[0].db_version,
          current_time: result.rows[0].current_time,
          size: dbSizeResult.rows[0]?.db_size || 'unknown',
          environment: process.env.NODE_ENV,
          host: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? 'mdm-postgres-pgvector.westus2.azurecontainer.io' : 'localhost'),
          port: process.env.DB_PORT || (process.env.NODE_ENV === 'production' ? '5432' : '5433'),
        },
        tables: {
          total_tables: allTablesResult.rows.length,
          business_rules_table_exists: hasBusinessRulesTable,
          rules_count: rulesCount,
          sessions_count: sessionsCount,
          all_tables: allTablesResult.rows.map(row => row.table_name)
        },
        pool_stats: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        }
      });
      
    } finally {
      client.release();
      console.log('✅ Database connection released');
    }
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      performance: {
        total_time_ms: totalTime
      },
      error: error instanceof Error ? error.message : 'Unknown database error',
      database: {
        connected: false,
        environment: process.env.NODE_ENV,
        host: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? 'mdm-postgres-pgvector.westus2.azurecontainer.io' : 'localhost'),
        port: process.env.DB_PORT || (process.env.NODE_ENV === 'production' ? '5432' : '5433'),
      },
      pool_stats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    }, { status: 500 });
  }
} 