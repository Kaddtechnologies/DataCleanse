import { NextRequest, NextResponse } from 'next/server';
import { BusinessRule, ConversationContext } from '@/types/business-rules';
import { ClaudeRuleGenerator } from '@/lib/ai/claude-client';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  console.log('🚀 AI Rules Generate API called');
  try {
    console.log('📝 Parsing request body...');
    const body = await request.json();
    console.log('📝 Request body parsed:', { scenario: body.scenario?.substring(0, 50) + '...', stewardId: body.stewardId });
    
    const { scenario, context, stewardId, messages } = body;

    if (!scenario || !stewardId) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

        console.log('📊 Getting existing rules...');
    const existingRules = await Promise.race([
      getExistingRules(),
      new Promise<BusinessRule[]>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      )
    ]);
    console.log(`📋 Found ${existingRules.length} existing rules`);

    // Create conversation context
    const conversationContext: ConversationContext = {
      sessionId: randomUUID(),
      type: 'rule-creation',
      state: 'active',
      phase: 'rule_creation',
      contextData: context || {},
      stewardId,
      existingRules: existingRules,
      messages: messages || [],
      user: {
        id: stewardId,
        name: 'Data Steward',
        role: 'steward'
      },
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };



    console.log('🤖 Initializing AI generator...');
    // Generate rule using AI
    const ruleGenerator = new ClaudeRuleGenerator();
    
    console.log('🔄 Calling AI to generate rules...');
    const result = await Promise.race([
      ruleGenerator.generateRulesFromConversation({
        conversation: scenario,
        existingRules: conversationContext.existingRules?.map(rule => rule.name) || [],
        businessContext: context || {}
      }),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('AI generation timeout after 45 seconds')), 45000)
      )
    ]);
    console.log('✅ AI generation completed');

    console.log('💾 Saving conversation...');
    // Save conversation to database (without generated rule for now - type conversion needed)
    try {
      await Promise.race([
        saveConversation(conversationContext, null),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Save conversation timeout')), 5000)
        )
      ]);
      console.log('✅ Conversation saved');
    } catch (saveError) {
      console.warn('⚠️ Failed to save conversation (continuing):', saveError);
    }

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
    console.error('❌ Error generating rule:', error);
    
    // Check if this is an API key issue
    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { 
          error: 'API Configuration Missing', 
          details: 'ANTHROPIC_API_KEY environment variable is not set. Please configure the Anthropic API key to use AI rule generation.',
          solution: 'Set the ANTHROPIC_API_KEY environment variable with your Anthropic API key.'
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getExistingRules(): Promise<BusinessRule[]> {
  try {
    console.log('📊 Attempting database connection...');
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM business_rules WHERE enabled = true ORDER BY priority DESC'
      );
      console.log('✅ Database query successful');
      return result.rows.map(row => ({
        ...row,
        conditions: row.conditions || {},
        actions: row.actions || [],
        testCases: []
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function saveConversation(context: ConversationContext, rule: BusinessRule | null) {
  const client = await pool.connect();
  try {
    // Save conversation session
    const sessionResult = await client.query(
      `INSERT INTO conversation_sessions 
       (id, steward_id, business_context, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING id`,
      [context.sessionId, context.stewardId, JSON.stringify(context.contextData)]
    );

    // Save messages
    for (const message of context.messages || []) {
      await client.query(
        `INSERT INTO conversation_messages 
         (session_id, message_type, content, created_at, sequence_number) 
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionResult.rows[0].id, message.role, message.content, message.timestamp, 1]
      );
    }

    // Save generated rule draft
    if (rule) {
      await client.query(
        `INSERT INTO business_rules 
         (id, name, description, rule_type, priority, enabled, version, author, 
          rule_code, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')`,
        [
          rule.id,
          rule.name,
          rule.description,
          rule.category,
          rule.priority,
          false, // Start disabled
          '1.0.0',
          context.stewardId,
          'function evaluate() { return true; }' // Placeholder rule code
        ]
      );
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  } finally {
    client.release();
  }
}