const { Pool } = require('pg');

// Database configuration - same as other scripts
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'mdm_dedup',
  user: 'mdm_user',
  password: 'mdm_password123',
  ssl: false
});

async function seedBusinessRules() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Seeding predefined business rules for demo...');
    
    // Predefined business rules for demo
    const predefinedRules = [
      {
        id: 'rule_joint_venture_detection',
        name: 'Joint Venture & Strategic Partnership Detection',
        description: 'Identifies legitimate joint ventures and strategic partnerships that should remain as separate entities despite naming similarities. Prevents over-merging of related but distinct business entities.',
        category: 'business-relationship',
        priority: 9,
        enabled: true,
        status: 'active',
        version: '2.1.0',
        created_by: 'AI Rule Generator',
        created_at: new Date('2024-01-15T10:30:00Z'),
        updated_at: new Date('2024-01-20T14:45:00Z'),
        conditions: {
          similarity_threshold: 0.75,
          name_patterns: ['joint venture', 'partnership', 'alliance', 'coalition'],
          industry_contexts: ['energy', 'oil_gas', 'petrochemical', 'manufacturing'],
          geographic_scope: 'global'
        },
        actions: [
          {
            type: 'set_confidence',
            parameters: { confidence: 'high', score: 0.942 }
          },
          {
            type: 'add_flag',
            parameters: { flag: 'joint_venture_detected' }
          },
          {
            type: 'set_recommendation',
            parameters: { action: 'keep_separate', reasoning: 'Joint venture relationship confirmed' }
          }
        ],
        test_cases: [
          {
            id: 'test_shell_partnership',
            description: 'Shell Chemical vs Shell Oil joint venture scenario',
            input: {
              record1: { name: 'Shell Chemical LP', type: 'Joint Venture', ownership: 'Shell 50%, BASF 50%' },
              record2: { name: 'Shell Oil Company', type: 'Corporation', ownership: 'Shell 100%' }
            },
            expected_result: 'keep_separate',
            confidence_threshold: 0.90
          },
          {
            id: 'test_exxon_mobil_ventures',
            description: 'ExxonMobil ventures detection',
            input: {
              record1: { name: 'ExxonMobil Chemical Company', type: 'Subsidiary' },
              record2: { name: 'ExxonMobil Upstream Ventures', type: 'Joint Venture' }
            },
            expected_result: 'keep_separate',
            confidence_threshold: 0.85
          }
        ],
        metadata: {
          ai_generated: true,
          original_prompt: 'Create rules for joint venture detection in energy companies',
          performance_stats: {
            execution_count: 2847,
            success_rate: 0.942,
            avg_execution_time_ms: 145,
            last_execution: new Date('2024-01-20T14:30:00Z'),
            test_cases_passed: 15,
            test_cases_total: 16
          },
          business_impact: 'Prevents incorrect merging of joint ventures, maintaining accurate business relationship mapping for energy sector partnerships.',
          author: 'MDM AI Assistant',
          approval_status: 'approved',
          approval_date: new Date('2024-01-16T09:00:00Z'),
          approved_by: 'Data Steward Team'
        }
      },
      {
        id: 'rule_energy_division_detection',
        name: 'Energy Company Division Legitimacy Detection',
        description: 'Distinguishes between legitimate company divisions and potential duplicates by analyzing business structure, operational scope, and regulatory filings in the energy sector.',
        category: 'organizational-structure',
        priority: 8,
        enabled: true,
        status: 'active',
        version: '1.8.2',
        created_by: 'Energy Sector SME',
        created_at: new Date('2024-01-10T08:15:00Z'),
        updated_at: new Date('2024-01-18T16:20:00Z'),
        conditions: {
          similarity_threshold: 0.80,
          division_indicators: ['division', 'subsidiary', 'business unit', 'operating company'],
          energy_sectors: ['upstream', 'downstream', 'midstream', 'renewable', 'petrochemical'],
          regulatory_contexts: ['SEC filings', 'regulatory permits', 'operational licenses']
        },
        actions: [
          {
            type: 'set_confidence',
            parameters: { confidence: 'very_high', score: 0.967 }
          },
          {
            type: 'add_flag',
            parameters: { flag: 'legitimate_division' }
          },
          {
            type: 'set_recommendation',
            parameters: { action: 'keep_separate', reasoning: 'Legitimate business division structure confirmed' }
          }
        ],
        test_cases: [
          {
            id: 'test_chevron_divisions',
            description: 'Chevron upstream vs downstream divisions',
            input: {
              record1: { name: 'Chevron Upstream Company', division: 'Exploration & Production' },
              record2: { name: 'Chevron Downstream Division', division: 'Refining & Marketing' }
            },
            expected_result: 'keep_separate',
            confidence_threshold: 0.95
          },
          {
            id: 'test_bp_business_units',
            description: 'BP business unit legitimacy',
            input: {
              record1: { name: 'BP America Production Company', type: 'Operating Unit' },
              record2: { name: 'BP Products North America Inc', type: 'Business Division' }
            },
            expected_result: 'keep_separate',
            confidence_threshold: 0.92
          }
        ],
        metadata: {
          ai_generated: true,
          original_prompt: 'Detect legitimate energy company divisions vs duplicates',
          performance_stats: {
            execution_count: 1923,
            success_rate: 0.967,
            avg_execution_time_ms: 128,
            last_execution: new Date('2024-01-19T11:45:00Z'),
            test_cases_passed: 23,
            test_cases_total: 24
          },
          business_impact: 'Maintains accurate organizational structure mapping for energy companies, preventing consolidation of legitimate business divisions.',
          author: 'Energy Domain Expert',
          approval_status: 'approved',
          approval_date: new Date('2024-01-12T10:30:00Z'),
          approved_by: 'Chief Data Officer'
        }
      },
      {
        id: 'rule_freight_forwarder_exemption',
        name: 'Freight Forwarder & Intermediate Consignee Exemption',
        description: 'Specialized rule for logistics and supply chain entities. Recognizes freight forwarders and intermediate consignees as distinct entities even with location overlap, preventing incorrect consolidation of logistics service providers.',
        category: 'logistics-supply-chain',
        priority: 7,
        enabled: true,
        status: 'active',
        version: '3.0.1',
        created_by: 'Supply Chain Analytics Team',
        created_at: new Date('2024-01-08T14:20:00Z'),
        updated_at: new Date('2024-01-22T09:15:00Z'),
        conditions: {
          similarity_threshold: 0.85,
          logistics_indicators: ['freight', 'logistics', 'forwarding', 'shipping', 'consignee', 'carrier'],
          service_types: ['transportation', 'warehousing', 'distribution', 'customs_clearance'],
          geographic_overlap_tolerance: 0.3
        },
        actions: [
          {
            type: 'set_confidence',
            parameters: { confidence: 'very_high', score: 0.981 }
          },
          {
            type: 'add_flag',
            parameters: { flag: 'freight_forwarder_exemption' }
          },
          {
            type: 'set_recommendation',
            parameters: { action: 'keep_separate', reasoning: 'Distinct logistics service providers identified' }
          }
        ],
        test_cases: [
          {
            id: 'test_dhl_services',
            description: 'DHL freight vs express services',
            input: {
              record1: { name: 'DHL Global Forwarding', service_type: 'Freight Forwarding' },
              record2: { name: 'DHL Express', service_type: 'Express Delivery' }
            },
            expected_result: 'keep_separate',
            confidence_threshold: 0.97
          },
          {
            id: 'test_fedex_logistics',
            description: 'FedEx logistics divisions',
            input: {
              record1: { name: 'FedEx Logistics Inc', service_type: 'Supply Chain Solutions' },
              record2: { name: 'FedEx Trade Networks', service_type: 'Customs Brokerage' }
            },
            expected_result: 'keep_separate',
            confidence_threshold: 0.94
          }
        ],
        metadata: {
          ai_generated: true,
          original_prompt: 'Handle freight forwarders with similar names but different locations',
          performance_stats: {
            execution_count: 3456,
            success_rate: 0.981,
            avg_execution_time_ms: 98,
            last_execution: new Date('2024-01-22T08:30:00Z'),
            test_cases_passed: 28,
            test_cases_total: 29
          },
          business_impact: 'Ensures accurate logistics provider mapping, preventing consolidation of distinct freight forwarding and intermediate consignee services.',
          author: 'Logistics Domain Expert',
          approval_status: 'approved',
          approval_date: new Date('2024-01-10T13:45:00Z'),
          approved_by: 'Supply Chain Director'
        }
      },
      {
        id: 'rule_testing_sandbox',
        name: 'Testing Sandbox Rule',
        description: 'A comprehensive testing rule for validating the AI rule generation and testing framework. Used for development and validation purposes.',
        category: 'testing',
        priority: 1,
        enabled: false,
        status: 'draft',
        version: '0.9.0',
        created_by: 'Development Team',
        created_at: new Date('2024-01-25T16:00:00Z'),
        updated_at: new Date('2024-01-25T16:00:00Z'),
        conditions: {
          similarity_threshold: 0.5,
          test_patterns: ['test', 'demo', 'sandbox', 'development'],
          validation_scope: 'development_environment'
        },
        actions: [
          {
            type: 'set_confidence',
            parameters: { confidence: 'medium', score: 0.75 }
          },
          {
            type: 'add_flag',
            parameters: { flag: 'testing_rule' }
          },
          {
            type: 'set_recommendation',
            parameters: { action: 'review', reasoning: 'Testing rule for development validation' }
          }
        ],
        test_cases: [
          {
            id: 'test_basic_functionality',
            description: 'Basic rule execution test',
            input: {
              record1: { name: 'Test Company A', type: 'Test Entity' },
              record2: { name: 'Test Company B', type: 'Test Entity' }
            },
            expected_result: 'review',
            confidence_threshold: 0.70
          }
        ],
        metadata: {
          ai_generated: false,
          original_prompt: 'Create a testing rule for framework validation',
          performance_stats: {
            execution_count: 0,
            success_rate: 0,
            avg_execution_time_ms: 0,
            last_execution: null,
            test_cases_passed: 0,
            test_cases_total: 1
          },
          business_impact: 'Enables comprehensive testing of the rule generation and execution framework.',
          author: 'Development Team',
          approval_status: 'draft',
          approval_date: null,
          approved_by: null
        }
      }
    ];

    // Insert each rule
    for (const rule of predefinedRules) {
      await client.query(`
        INSERT INTO business_rules (
          id, name, description, category, priority, enabled, status, version,
          created_by, created_at, updated_at, conditions, actions, test_cases, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = EXCLUDED.updated_at,
          metadata = EXCLUDED.metadata
      `, [
        rule.id,
        rule.name,
        rule.description,
        rule.category,
        rule.priority,
        rule.enabled,
        rule.status,
        rule.version,
        rule.created_by,
        rule.created_at,
        rule.updated_at,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        JSON.stringify(rule.test_cases),
        JSON.stringify(rule.metadata)
      ]);
      
      console.log(`   ✅ Added rule: ${rule.name}`);
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Successfully seeded predefined business rules!');
    console.log('\nThe following rules are now available in the Rule Library:');
    console.log('• Joint Venture & Strategic Partnership Detection (94.2%)');
    console.log('• Energy Company Division Legitimacy Detection (96.7%)');
    console.log('• Freight Forwarder & Intermediate Consignee Exemption (98.1%)');
    console.log('• Testing Sandbox Rule (75.0%)');
    console.log('\n🎯 Demo ready! Visit the Rule Library tab to see the rules.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to seed business rules:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeder
if (require.main === module) {
  seedBusinessRules().catch(console.error);
}

module.exports = { seedBusinessRules }; 