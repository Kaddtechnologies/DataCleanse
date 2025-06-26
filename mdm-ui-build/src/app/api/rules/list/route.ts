import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  let client;
  try {
    console.log('🔄 API /rules/list: Starting request');
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const enabled = searchParams.get('enabled');
    console.log('🔍 API /rules/list: Search params:', { category, status, enabled });

    // Get a client connection from the pool
    console.log('🔗 API /rules/list: Getting database client...');
    client = await pool.connect();
    console.log('✅ API /rules/list: Database client acquired');

    let query = 'SELECT * FROM business_rules WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND rule_type = $${paramIndex}`;  // Use rule_type instead of category
      params.push(category);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (enabled !== null) {
      query += ` AND enabled = $${paramIndex}`;
      params.push(enabled === 'true');
      paramIndex++;
    }

    query += ' ORDER BY priority DESC, created_at DESC';
    console.log('📝 API /rules/list: Executing query:', query, 'with params:', params);

    const result = await client.query(query, params);
    console.log('✅ API /rules/list: Query successful, rows:', result.rows.length);

    // Parse JSON fields safely
    const rules = result.rows.map(row => {
      try {
        return {
          ...row,
          conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : (row.conditions || {}),
          actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : (row.actions || []),
          testCases: typeof row.test_cases === 'string' ? JSON.parse(row.test_cases) : (row.test_cases || []),
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {})
        };
      } catch (parseError) {
        console.warn('⚠️ API /rules/list: Error parsing JSON for rule:', row.id, parseError);
        return {
          ...row,
          conditions: {},
          actions: [],
          testCases: [],
          metadata: {}
        };
      }
    });
    console.log('🔄 API /rules/list: Mapped rules:', rules.length);

    return NextResponse.json({
      success: true,
      rules,
      total: rules.length
    });
  } catch (error) {
    console.error('❌ API /rules/list: Error listing rules:', error);
    return NextResponse.json(
      { error: 'Failed to list rules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      console.log('🔓 API /rules/list: Releasing database client');
      client.release();
    }
  }
}