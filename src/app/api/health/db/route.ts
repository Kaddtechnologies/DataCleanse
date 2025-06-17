import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Database health check started...');
    
    const client = await pool.connect();
    console.log('✅ Database connection acquired');
    
    try {
      // Test basic connectivity
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      console.log('✅ Database query successful:', result.rows[0]);
      
      // Test if business_rules table exists
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'business_rules'
      `);
      
      const hasBusinessRulesTable = tableCheck.rows.length > 0;
      console.log('📋 Business rules table exists:', hasBusinessRulesTable);
      
      // Test if we can query business_rules table
      let rulesCount = 0;
      if (hasBusinessRulesTable) {
        const rulesResult = await client.query('SELECT COUNT(*) as count FROM business_rules');
        rulesCount = parseInt(rulesResult.rows[0].count);
        console.log('📊 Rules count:', rulesCount);
      }
      
      return NextResponse.json({
        success: true,
        status: 'healthy',
        database: {
          connected: true,
          version: result.rows[0].db_version,
          current_time: result.rows[0].current_time,
          business_rules_table_exists: hasBusinessRulesTable,
          rules_count: rulesCount
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
    
    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
      database: {
        connected: false
      }
    }, { status: 500 });
  }
} 