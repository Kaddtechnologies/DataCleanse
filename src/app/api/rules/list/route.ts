import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const enabled = searchParams.get('enabled');

    let query = 'SELECT * FROM business_rules WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
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

    const result = await db.query(query, params);

    // Parse JSON fields
    const rules = result.rows.map(row => ({
      ...row,
      conditions: row.conditions || {},
      actions: row.actions || [],
      testCases: row.test_cases || [],
      metadata: row.metadata || {}
    }));

    return NextResponse.json({
      success: true,
      rules,
      total: rules.length
    });
  } catch (error) {
    console.error('Error listing rules:', error);
    return NextResponse.json(
      { error: 'Failed to list rules' },
      { status: 500 }
    );
  }
}