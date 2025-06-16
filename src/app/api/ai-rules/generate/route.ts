import { NextRequest, NextResponse } from 'next/server';
import { BusinessRule, ConversationContext } from '@/types/business-rules';
import { ClaudeRuleGenerator } from '@/lib/ai/claude-client';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario, context, stewardId, messages } = body;

    if (!scenario || !stewardId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create conversation context
    const conversationContext: ConversationContext = {
      sessionId: `session_${Date.now()}`,
      type: 'rule-creation',
      state: 'active',
      phase: 'rule_creation',
      contextData: context || {},
      stewardId,
      existingRules: await getExistingRules(),
      messages: messages || [],
      user: {
        id: stewardId,
        name: 'Data Steward',
        role: 'steward'
      },
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Generate rule using AI
    const ruleGenerator = new ClaudeRuleGenerator();
    const result = await ruleGenerator.generateRulesFromConversation({
      conversation: scenario,
      existingRules: conversationContext.existingRules?.map(rule => rule.name) || [],
      businessContext: context || {}
    });

    // Save conversation to database (without generated rule for now - type conversion needed)
    await saveConversation(conversationContext, null);

    return NextResponse.json({
      success: true,
      rules: result.rules,
      summary: result.summary,
      insights: result.insights,
      context: {
        records: 347, // This would be dynamic
        similarity: 87,
        existingRules: conversationContext.existingRules?.length || 0
      }
    });
  } catch (error) {
    console.error('Error generating rule:', error);
    return NextResponse.json(
      { error: 'Failed to generate rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getExistingRules(): Promise<BusinessRule[]> {
  try {
    const result = await db.query(
      'SELECT * FROM business_rules WHERE enabled = true ORDER BY priority DESC'
    );
    return result.rows.map(row => ({
      ...row,
      conditions: row.conditions || {},
      actions: row.actions || [],
      testCases: []
    }));
  } catch (error) {
    console.error('Error fetching existing rules:', error);
    return [];
  }
}

async function saveConversation(context: ConversationContext, rule: BusinessRule | null) {
  try {
    // Save conversation session
    const sessionResult = await db.query(
      `INSERT INTO conversation_sessions 
       (id, steward_id, session_context, phase, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id`,
      [context.sessionId, context.stewardId, JSON.stringify(context.businessContext), context.phase]
    );

    // Save messages
    for (const message of context.messages || []) {
      await db.query(
        `INSERT INTO conversation_messages 
         (session_id, message_type, content, timestamp) 
         VALUES ($1, $2, $3, $4)`,
        [sessionResult.rows[0].id, message.type, message.content, message.timestamp]
      );
    }

    // Save generated rule draft
    if (rule) {
      await db.query(
        `INSERT INTO business_rules 
         (id, name, description, category, priority, enabled, version, created_by, created_at,
          conditions, actions, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, 'draft')`,
        [
          rule.id,
          rule.name,
          rule.description,
          rule.category,
          rule.priority,
          false, // Start disabled
          '1.0.0',
          context.stewardId,
          JSON.stringify(rule.conditions),
          JSON.stringify(rule.actions)
        ]
      );
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}