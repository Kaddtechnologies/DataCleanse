import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const rule = await request.json();

    if (!rule.name || !rule.description || !rule.category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO business_rules 
       (id, name, description, category, priority, enabled, version, 
        created_by, created_at, conditions, actions, status, code, 
        test_cases, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        rule.id || `rule_${Date.now()}`,
        rule.name,
        rule.description,
        rule.category,
        rule.priority || 5,
        false, // Start disabled
        rule.version || '1.0.0',
        rule.createdBy || 'system',
        JSON.stringify(rule.conditions || {}),
        JSON.stringify(rule.actions || []),
        'draft',
        rule.code || '',
        JSON.stringify(rule.testCases || []),
        JSON.stringify(rule.metadata || {})
      ]
    );

    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}