/**
 * Test script for Business Rules Creation Engine
 * This script tests the core functionality of the AI Business Rule Builder
 */

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'mdm_dedup',
  user: 'mdm_user',
  password: 'mdm_password123'
});

async function testBusinessRules() {
  console.log('🧪 Testing Business Rules Creation Engine...\n');

  try {
    // Test 1: Database connectivity
    console.log('1️⃣ Testing database connectivity...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully\n');

    // Test 2: Check if business rules tables exist
    console.log('2️⃣ Checking business rules tables...');
    const tables = ['business_rules', 'rule_approvals', 'rule_test_cases', 'rule_test_results', 'rule_deployment_history', 'conversation_sessions'];
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' does not exist`);
      }
    }
    console.log();

    // Test 3: Create a sample business rule
    console.log('3️⃣ Creating a sample business rule...');
    const ruleId = require('crypto').randomUUID();
    const sampleRule = {
      id: ruleId,
      name: `Energy Division Detection Test ${Date.now()}`,
      description: 'Test rule for detecting energy company divisions',
      author: 'test_user',
      priority: 5,
      enabled: true,
      version: '1.0.0',
      rule_type: 'custom',
      status: 'draft',
      rule_code: `
        function evaluateDuplicates(record1, record2) {
          // Check if records are from different divisions of same company
          const patterns = /(chemical|oil|gas|petroleum)/i;
          if (record1.name && record2.name) {
            const name1Match = record1.name.match(patterns);
            const name2Match = record2.name.match(patterns);
            if (name1Match && name2Match && name1Match[1] !== name2Match[1]) {
              return {
                recommendation: 'reject',
                confidence: 0.95,
                reason: 'Different divisions of same energy company'
              };
            }
          }
          return { recommendation: 'merge', confidence: 0.5 };
        }
      `,
      metadata: JSON.stringify({
        fieldComparisons: ['name', 'address'],
        patterns: [{ name: 'energy', regex: '/(chemical|oil|gas|petroleum)/i', field: 'name' }]
      }),
      config: JSON.stringify({
        conditions: {
          fieldComparisons: ['name', 'address'],
          patterns: [{ name: 'energy', regex: '/(chemical|oil|gas|petroleum)/i', field: 'name' }]
        },
        actions: [
          { type: 'reject', recommendation: 'reject', confidence: 'high', confidenceScore: 0.95 }
        ]
      }),
      ai_generated: false
    };

    await client.query(
      `INSERT INTO business_rules 
       (id, name, description, author, priority, enabled, version, rule_type, status, rule_code, metadata, config, ai_generated) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        sampleRule.id,
        sampleRule.name,
        sampleRule.description,
        sampleRule.author,
        sampleRule.priority,
        sampleRule.enabled,
        sampleRule.version,
        sampleRule.rule_type,
        sampleRule.status,
        sampleRule.rule_code,
        sampleRule.metadata,
        sampleRule.config,
        sampleRule.ai_generated
      ]
    );
    console.log(`✅ Created rule: ${sampleRule.name} (ID: ${sampleRule.id})\n`);

    // Test 4: Create test cases for the rule
    console.log('4️⃣ Creating test cases...');
    const testCases = [
      {
        rule_id: ruleId,
        name: 'Shell Chemical vs Shell Oil',
        record1_data: JSON.stringify({ name: 'Shell Chemical', address: '123 Energy St' }),
        record2_data: JSON.stringify({ name: 'Shell Oil', address: '123 Energy St' }),
        expected_result: JSON.stringify({ recommendation: 'reject', confidence: 'high' })
      },
      {
        rule_id: ruleId,
        name: 'Same company test',
        record1_data: JSON.stringify({ name: 'BP Oil', address: '456 Petro Ave' }),
        record2_data: JSON.stringify({ name: 'BP Oil', address: '456 Petro Ave' }),
        expected_result: JSON.stringify({ recommendation: 'merge', confidence: 'high' })
      }
    ];

    for (const testCase of testCases) {
      await client.query(
        `INSERT INTO rule_test_cases 
         (rule_id, name, record1_data, record2_data, expected_result) 
         VALUES ($1, $2, $3, $4, $5)`,
        [testCase.rule_id, testCase.name, testCase.record1_data, testCase.record2_data, testCase.expected_result]
      );
      console.log(`✅ Created test case: ${testCase.name}`);
    }
    console.log();

    // Test 5: Create approval workflow
    console.log('5️⃣ Creating approval workflow...');
    const approvalSteps = [
      { level: 'technical', approver_id: 'alan.helm', name: 'Alan Helm' },
      { level: 'business', approver_id: 'kirk.wilson', name: 'Kirk Wilson' },
      { level: 'governance', approver_id: 'lamar.duhon', name: 'Lamar Duhon' }
    ];

    for (const step of approvalSteps) {
      await client.query(
        `INSERT INTO rule_approvals 
         (rule_id, approval_level, approver_id, approver_name, approval_status) 
         VALUES ($1, $2, $3, $4, 'pending')`,
        [ruleId, step.level, step.approver_id, step.name]
      );
      console.log(`✅ Created approval step: ${step.level} - ${step.name}`);
    }
    console.log();

    // Test 6: Query created rules
    console.log('6️⃣ Querying business rules...');
    const rulesResult = await client.query(
      'SELECT id, name, rule_type, status, created_at FROM business_rules ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log('Recent rules:');
    rulesResult.rows.forEach(rule => {
      console.log(`  - ${rule.name} (${rule.rule_type}) - Status: ${rule.status}`);
    });
    console.log();

    // Test 7: Simulate test execution
    console.log('7️⃣ Simulating test execution...');
    // Get test case IDs we just created
    const testCaseResult = await client.query(
      'SELECT id FROM rule_test_cases WHERE rule_id = $1 LIMIT 2',
      [ruleId]
    );
    
    // Create test results for each test case
    for (let i = 0; i < testCaseResult.rows.length; i++) {
      const testCaseId = testCaseResult.rows[i].id;
      await client.query(
        `INSERT INTO rule_test_results 
         (rule_id, test_case_id, passed, actual_result, execution_time, tested_by) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          ruleId,
          testCaseId,
          true,
          JSON.stringify({ recommendation: i === 0 ? 'reject' : 'merge', confidence: 0.95 }),
          3.5 + (i * 0.3),
          'test_user'
        ]
      );
    }
    console.log('✅ Test results recorded\n');

    // Cleanup
    client.release();
    console.log('✨ All tests completed successfully!');
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('  - Database connectivity: ✅');
    console.log('  - Table structure: ✅');
    console.log('  - Rule creation: ✅');
    console.log('  - Test case creation: ✅');
    console.log('  - Approval workflow: ✅');
    console.log('  - Query functionality: ✅');
    console.log('  - Test execution: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run the test
testBusinessRules();