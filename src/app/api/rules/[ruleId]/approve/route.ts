import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const body = await request.json();
    const { level, comments, approverName } = body;

    if (!level || !approverName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map level to approver role
    const approverRoleMap: Record<number, string> = {
      1: 'technical_reviewer',
      2: 'business_owner',
      3: 'data_governance'
    };

    const approverRole = approverRoleMap[level];
    if (!approverRole) {
      return NextResponse.json(
        { error: 'Invalid approval level' },
        { status: 400 }
      );
    }

    // Check if approval already exists
    const existing = await db.query(
      'SELECT * FROM rule_approvals WHERE rule_id = $1 AND approval_level = $2',
      [params.ruleId, level]
    );

    if (existing.rows.length > 0) {
      // Update existing approval
      const result = await db.query(
        `UPDATE rule_approvals 
         SET status = 'approved', 
             approver_name = $1, 
             comments = $2, 
             approved_at = NOW()
         WHERE rule_id = $3 AND approval_level = $4
         RETURNING *`,
        [approverName, comments || '', params.ruleId, level]
      );

      return NextResponse.json({
        success: true,
        approval: result.rows[0]
      });
    } else {
      // Create new approval
      const result = await db.query(
        `INSERT INTO rule_approvals 
         (rule_id, approval_level, approver_role, approver_name, status, comments, approved_at)
         VALUES ($1, $2, $3, $4, 'approved', $5, NOW())
         RETURNING *`,
        [params.ruleId, level, approverRole, approverName, comments || '']
      );

      return NextResponse.json({
        success: true,
        approval: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error approving rule:', error);
    return NextResponse.json(
      { error: 'Failed to approve rule' },
      { status: 500 }
    );
  }
}