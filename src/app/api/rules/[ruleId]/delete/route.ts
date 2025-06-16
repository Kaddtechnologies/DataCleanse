import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ruleExecutionEngine } from '@/lib/rule-engine/executor';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // Check if rule exists
    const checkResult = await db.query(
      'SELECT * FROM business_rules WHERE id = $1',
      [params.ruleId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const rule = checkResult.rows[0];

    // If rule is active, disable it in the execution engine first
    if (rule.enabled) {
      await ruleExecutionEngine.disableRule(params.ruleId);
    }

    // Delete related records first (cascade)
    await db.query('DELETE FROM rule_approvals WHERE rule_id = $1', [params.ruleId]);
    await db.query('DELETE FROM rule_test_results WHERE rule_id = $1', [params.ruleId]);
    await db.query('DELETE FROM rule_deployment_history WHERE rule_id = $1', [params.ruleId]);

    // Delete the rule
    const result = await db.query(
      'DELETE FROM business_rules WHERE id = $1 RETURNING *',
      [params.ruleId]
    );

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}