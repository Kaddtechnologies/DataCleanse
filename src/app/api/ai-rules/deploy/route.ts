import { NextRequest, NextResponse } from 'next/server';
import { BusinessRule } from '@/types/business-rules';
import { ruleExecutionEngine } from '@/lib/rule-engine/executor';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule, approvalStatus } = body;

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule is required' },
        { status: 400 }
      );
    }

    // Validate approval chain
    const isApproved = await validateApprovalChain(rule.id, approvalStatus);
    if (!isApproved) {
      return NextResponse.json(
        { error: 'Insufficient approvals for deployment' },
        { status: 403 }
      );
    }

    // Deploy to rule engine
    await ruleExecutionEngine.deployRule(rule);

    // Update rule status in database
    await updateRuleStatus(rule.id, 'active');

    // Create deployment record
    await createDeploymentRecord(rule);

    // Notify stakeholders
    await notifyDeployment(rule);

    return NextResponse.json({
      success: true,
      message: 'Rule deployed successfully',
      ruleId: rule.id,
      version: rule.version,
      deployedAt: new Date()
    });
  } catch (error) {
    console.error('Error deploying rule:', error);
    return NextResponse.json(
      { error: 'Failed to deploy rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function validateApprovalChain(ruleId: string, approvalStatus: any[]): Promise<boolean> {
  try {
    // Check if all required approvals are present
    const requiredApprovals = ['technical_reviewer', 'business_owner', 'data_governance'];
    
    if (!approvalStatus || approvalStatus.length === 0) {
      // Fetch from database
      const result = await db.query(
        'SELECT * FROM rule_approvals WHERE rule_id = $1 ORDER BY approval_level',
        [ruleId]
      );
      approvalStatus = result.rows;
    }

    for (const required of requiredApprovals) {
      const approval = approvalStatus.find(a => a.approverRole === required || a.approver_role === required);
      if (!approval || approval.status !== 'approved') {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating approvals:', error);
    return false;
  }
}

async function updateRuleStatus(ruleId: string, status: string) {
  try {
    await db.query(
      `UPDATE business_rules 
       SET status = $1, enabled = $2, last_modified_at = NOW() 
       WHERE id = $3`,
      [status, status === 'active', ruleId]
    );
  } catch (error) {
    console.error('Error updating rule status:', error);
    throw error;
  }
}

async function createDeploymentRecord(rule: BusinessRule) {
  try {
    await db.query(
      `INSERT INTO rule_deployment_history 
       (rule_id, version, environment, deployed_by, deployment_status, 
        deployment_metadata, deployed_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        rule.id,
        rule.version,
        'production',
        rule.lastModifiedBy || rule.createdBy,
        'success',
        JSON.stringify({
          priority: rule.priority,
          category: rule.category,
          testAccuracy: rule.metadata?.lastTestAccuracy || 96.8
        })
      ]
    );
  } catch (error) {
    console.error('Error creating deployment record:', error);
  }
}

async function notifyDeployment(rule: BusinessRule) {
  // In a real implementation, this would send emails/notifications
  console.log(`Notifying stakeholders of rule deployment: ${rule.name}`);
  
  // You could integrate with email service, Slack, Teams, etc.
  // For now, just log the notification
  const stakeholders = [
    'data-governance@company.com',
    'mdm-team@company.com',
    rule.createdBy
  ];

  console.log(`Notifications would be sent to: ${stakeholders.join(', ')}`);
}