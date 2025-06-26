import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const body = await request.json();
    const { submittedBy, reason } = body;

    if (!submittedBy) {
      return NextResponse.json(
        { error: 'Missing submittedBy field' },
        { status: 400 }
      );
    }

    // Update rule status to pending_approval
    const result = await db.query(
      `UPDATE business_rules 
       SET status = 'pending_approval', 
           updated_at = NOW(),
           last_modified_by = $1,
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'submitted_for_approval', NOW()::text,
             'submitted_by', $1,
             'approval_reason', $2
           )
       WHERE id = $3
       RETURNING *`,
      [submittedBy, reason || 'Submitted for manager approval', params.ruleId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Create approval workflow entries
    const approvalLevels = [
      { level: 1, role: 'technical_reviewer', approver: 'Technical Reviewer' },
      { level: 2, role: 'business_owner', approver: 'Business Owner' },
      { level: 3, role: 'data_governance', approver: 'Data Governance' }
    ];

    for (const approval of approvalLevels) {
      await db.query(
        `INSERT INTO rule_approvals 
         (rule_id, approval_level, approver_role, approver_name, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())
         ON CONFLICT (rule_id, approval_level) DO NOTHING`,
        [params.ruleId, approval.level, approval.role, approval.approver]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rule submitted for approval',
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting rule for approval:', error);
    return NextResponse.json(
      { error: 'Failed to submit rule for approval' },
      { status: 500 }
    );
  }
} 