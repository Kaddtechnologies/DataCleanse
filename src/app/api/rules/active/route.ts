import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await db.query(
      `SELECT * FROM business_rules 
       WHERE enabled = true AND status = 'active' 
       ORDER BY priority DESC, created_at DESC`
    );

    const rules = result.rows.map(row => ({
      ...row,
      conditions: row.conditions || {},
      actions: row.actions || [],
      testCases: row.test_cases || [],
      metadata: row.metadata || {}
    }));

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching active rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active rules' },
      { status: 500 }
    );
  }
}