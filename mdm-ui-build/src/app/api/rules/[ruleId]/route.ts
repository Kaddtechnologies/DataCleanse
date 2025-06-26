import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const result = await db.query(
      'SELECT * FROM business_rules WHERE id = $1',
      [params.ruleId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const rule = result.rows[0];
    
    // Parse JSON fields
    rule.conditions = rule.conditions || {};
    rule.actions = rule.actions || [];
    rule.testCases = rule.test_cases || [];
    rule.metadata = rule.metadata || {};

    return NextResponse.json({
      success: true,
      rule
    });
  } catch (error) {
    console.error('Error fetching rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rule' },
      { status: 500 }
    );
  }
}