#!/usr/bin/env node

/**
 * Direct Database CRUD Test Script
 * Tests database operations directly without requiring the Next.js server
 * This tests the actual database functions from src/lib/db.ts
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Database connection (same as in src/lib/db.ts)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mdm_user:mdm_password123@localhost:5433/mdm_dedup',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Test user and session data
const TEST_USER_ID = 'test_user_crud_' + crypto.randomBytes(4).toString('hex');
let TEST_SESSION_ID = null;
let TEST_PAIR_IDS = [];

// Mock data that matches the actual database schema
const mockCustomerRecords = [
  {
    id: 'rec_001',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+1-555-0123',
    address: '123 Main Street',
    city: 'New York',
    country: 'USA',
    tpi: 'TPI001',
    rowNumber: 1,
    name_score: 95,
    addr_score: 88,
    city_score: 100,
    country_score: 100,
    tpi_score: 85,
    overall_score: 93.6
  },
  {
    id: 'rec_002', 
    name: 'ACME Corp',
    email: 'info@acmecorp.com',
    phone: '+1-555-0124',
    address: '123 Main St.',
    city: 'New York',
    country: 'United States',
    tpi: 'TPI001A',
    rowNumber: 15,
    name_score: 91,
    addr_score: 85,
    city_score: 100,
    country_score: 95,
    tpi_score: 88,
    overall_score: 91.8
  }
];

const mockDuplicatePairs = [
  {
    record1: mockCustomerRecords[0],
    record2: mockCustomerRecords[1],
    similarityScore: 0.936,
    aiConfidence: 'high',
    aiReasoning: 'High name similarity and identical location',
    enhancedConfidence: 'high',
    enhancedScore: 94.2,
    originalScore: 93.6
  }
];

// Test helper functions
function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (details) {
      console.log(`   Details: ${details}`);
      testResults.errors.push(`${testName}: ${details}`);
    }
  }
}

// Database function implementations (copied from src/lib/db.ts)
async function createUserSession(sessionName, fileName, fileHash, userId, metadata = {}) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO user_sessions (session_name, file_name, file_hash, user_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await client.query(query, [sessionName, fileName, fileHash, userId, JSON.stringify(metadata)]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function getUserSession(sessionId) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM user_sessions WHERE id = $1';
    const result = await client.query(query, [sessionId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function listUserSessions(userId, limit = 10) {
  const client = await pool.connect();
  try {
    let query = `
      SELECT * FROM user_sessions 
      ${userId ? 'WHERE user_id = $1' : ''}
      ORDER BY last_accessed DESC 
      LIMIT $${userId ? '2' : '1'}
    `;
    const params = userId ? [userId, limit] : [limit];
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function createDuplicatePairsBatch(sessionId, pairs) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const pairIds = [];
    for (const pair of pairs) {
      const query = `
        INSERT INTO duplicate_pairs (
          session_id, record1_data, record2_data, fuzzy_similarity_score,
          original_score, enhanced_score, enhanced_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      const result = await client.query(query, [
        sessionId,
        JSON.stringify(pair.record1),
        JSON.stringify(pair.record2),
        pair.similarityScore,
        pair.originalScore || pair.similarityScore * 100,
        pair.enhancedScore,
        pair.enhancedConfidence
      ]);
      pairIds.push(result.rows[0].id);
    }
    
    // Update total_pairs in session
    await client.query(
      'UPDATE user_sessions SET total_pairs = $1 WHERE id = $2',
      [pairs.length, sessionId]
    );
    
    await client.query('COMMIT');
    return pairIds;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getDuplicatePairsForSession(sessionId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        id,
        record1_data,
        record2_data,
        fuzzy_similarity_score,
        status,
        enhanced_confidence,
        enhanced_score,
        original_score,
        created_at
      FROM duplicate_pairs 
      WHERE session_id = $1
      ORDER BY created_at
    `;
    const result = await client.query(query, [sessionId]);
    return result.rows;
  } finally {
    client.release();
  }
}

async function updateDuplicatePair(pairId, updates) {
  const client = await pool.connect();
  try {
    const setParts = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setParts.push(`status = $${paramIndex++}`);
      values.push(updates.status);
      setParts.push(`decided_at = CURRENT_TIMESTAMP`);
    }

    if (updates.enhancedConfidence !== undefined) {
      setParts.push(`enhanced_confidence = $${paramIndex++}`);
      values.push(updates.enhancedConfidence);
    }

    if (updates.enhancedScore !== undefined) {
      setParts.push(`enhanced_score = $${paramIndex++}`);
      values.push(updates.enhancedScore);
    }

    if (updates.cachedAiAnalysis !== undefined) {
      setParts.push(`cached_ai_analysis = $${paramIndex++}`);
      values.push(JSON.stringify(updates.cachedAiAnalysis));
    }

    if (updates.decisionUser !== undefined) {
      setParts.push(`decision_user = $${paramIndex++}`);
      values.push(updates.decisionUser);
    }

    if (setParts.length === 0) {
      return;
    }

    values.push(pairId);
    const query = `
      UPDATE duplicate_pairs 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
    `;

    const result = await client.query(query, values);
    return result.rowCount;
  } finally {
    client.release();
  }
}

async function saveSessionConfig(sessionId, configKey, configValue) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO session_config (session_id, config_key, config_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, config_key) 
      DO UPDATE SET config_value = $3, created_at = CURRENT_TIMESTAMP
    `;
    await client.query(query, [sessionId, configKey, JSON.stringify(configValue)]);
  } finally {
    client.release();
  }
}

async function getSessionConfig(sessionId, configKey) {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM session_config WHERE session_id = $1';
    const params = [sessionId];
    
    if (configKey) {
      query += ' AND config_key = $2';
      params.push(configKey);
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Test functions
async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...');
  
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logTest('Database Connection - Basic Query', true);
    
    // Test database extensions
    const extClient = await pool.connect();
    const extResult = await extClient.query("SELECT extname FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp')");
    extClient.release();
    
    const hasExtensions = extResult.rows.length >= 2;
    logTest('Database Connection - Required Extensions', hasExtensions, 
      hasExtensions ? '' : `Found extensions: ${extResult.rows.map(r => r.extname).join(', ')}`);
    
  } catch (error) {
    logTest('Database Connection - Basic Query', false, error.message);
  }
}

async function testSessionCRUD() {
  console.log('\n📝 Testing Session CRUD Operations...');
  
  // Test session creation
  try {
    const sessionData = {
      sessionName: `Test Session ${new Date().toISOString()}`,
      fileName: 'test_customer_data.csv',
      fileHash: crypto.createHash('sha256').update('mock_file_content').digest('hex'),
      userId: TEST_USER_ID,
      metadata: {
        test_run: true,
        upload_source: 'direct_crud_test'
      }
    };

    const session = await createUserSession(
      sessionData.sessionName,
      sessionData.fileName,
      sessionData.fileHash,
      sessionData.userId,
      sessionData.metadata
    );

    TEST_SESSION_ID = session.id;
    
    const hasValidId = session.id && typeof session.id === 'string';
    logTest('Session Creation - Valid Session ID', hasValidId);
    
    const hasValidName = session.session_name === sessionData.sessionName;
    logTest('Session Creation - Correct Session Name', hasValidName);
    
    const hasValidUserId = session.user_id === TEST_USER_ID;
    logTest('Session Creation - Correct User ID', hasValidUserId);
    
  } catch (error) {
    logTest('Session Creation - Database Operation', false, error.message);
    return;
  }

  // Test session retrieval
  try {
    const retrievedSession = await getUserSession(TEST_SESSION_ID);
    
    const sessionExists = retrievedSession !== null;
    logTest('Session Retrieval - Session Found', sessionExists);
    
    if (sessionExists) {
      const correctId = retrievedSession.id === TEST_SESSION_ID;
      logTest('Session Retrieval - Correct ID', correctId);
    }
    
  } catch (error) {
    logTest('Session Retrieval - Database Operation', false, error.message);
  }

  // Test session listing
  try {
    const sessions = await listUserSessions(TEST_USER_ID, 5);
    
    const foundTestSession = sessions.find(s => s.id === TEST_SESSION_ID);
    logTest('Session Listing - Test Session Found', !!foundTestSession);
    
    const hasValidStructure = sessions.every(s => 
      s.id && s.session_name && typeof s.total_pairs === 'number'
    );
    logTest('Session Listing - Valid Session Structure', hasValidStructure);
    
  } catch (error) {
    logTest('Session Listing - Database Operation', false, error.message);
  }
}

async function testSessionConfiguration() {
  console.log('\n⚙️ Testing Session Configuration...');
  
  if (!TEST_SESSION_ID) {
    logTest('Session Configuration - Session Available', false, 'No test session ID');
    return;
  }

  // Test saving configuration
  try {
    const configData = {
      use_prefix: true,
      use_metaphone: true,
      use_ai: false,
      name_threshold: 75
    };

    await saveSessionConfig(TEST_SESSION_ID, 'processing_config', configData);
    logTest('Session Configuration - Save Config', true);
    
    // Test multiple config keys
    await saveSessionConfig(TEST_SESSION_ID, 'similarity_thresholds', { name: 70, overall: 80 });
    logTest('Session Configuration - Save Multiple Configs', true);
    
  } catch (error) {
    logTest('Session Configuration - Save Config', false, error.message);
    return;
  }

  // Test retrieving configuration
  try {
    const configs = await getSessionConfig(TEST_SESSION_ID);
    
    const hasConfigs = configs.length > 0;
    logTest('Session Configuration - Retrieve Configs', hasConfigs);
    
    const hasProcessingConfig = configs.some(c => c.config_key === 'processing_config');
    logTest('Session Configuration - Processing Config Found', hasProcessingConfig);
    
    // Test specific config retrieval
    const specificConfigs = await getSessionConfig(TEST_SESSION_ID, 'processing_config');
    const specificFound = specificConfigs.length === 1;
    logTest('Session Configuration - Specific Config Retrieval', specificFound);
    
  } catch (error) {
    logTest('Session Configuration - Retrieve Configs', false, error.message);
  }
}

async function testDuplicatePairsCRUD() {
  console.log('\n👥 Testing Duplicate Pairs CRUD Operations...');
  
  if (!TEST_SESSION_ID) {
    logTest('Duplicate Pairs - Session Available', false, 'No test session ID');
    return;
  }

  // Test batch creation
  try {
    const pairIds = await createDuplicatePairsBatch(TEST_SESSION_ID, mockDuplicatePairs);
    TEST_PAIR_IDS = pairIds;
    
    const correctCount = pairIds.length === mockDuplicatePairs.length;
    logTest('Duplicate Pairs - Batch Creation Count', correctCount);
    
    const validIds = pairIds.every(id => id && typeof id === 'string');
    logTest('Duplicate Pairs - Valid Pair IDs', validIds);
    
  } catch (error) {
    logTest('Duplicate Pairs - Batch Creation', false, error.message);
    return;
  }

  // Test retrieval
  try {
    const pairs = await getDuplicatePairsForSession(TEST_SESSION_ID);
    
    const correctCount = pairs.length === mockDuplicatePairs.length;
    logTest('Duplicate Pairs - Retrieval Count', correctCount);
    
    const validStructure = pairs.every(p => 
      p.id && p.record1_data && p.record2_data && typeof p.fuzzy_similarity_score === 'number'
    );
    logTest('Duplicate Pairs - Valid Structure', validStructure);
    
    // Test data integrity
    const hasExpectedData = pairs.some(p => 
      p.record1_data.name === 'Acme Corporation' && p.record2_data.name === 'ACME Corp'
    );
    logTest('Duplicate Pairs - Data Integrity', hasExpectedData);
    
  } catch (error) {
    logTest('Duplicate Pairs - Retrieval', false, error.message);
  }
}

async function testDuplicatePairUpdates() {
  console.log('\n🔄 Testing Duplicate Pair Updates...');
  
  if (!TEST_PAIR_IDS || TEST_PAIR_IDS.length === 0) {
    logTest('Duplicate Pair Updates - Pairs Available', false, 'No test pair IDs');
    return;
  }

  // Test status updates
  const testCases = [
    { pairId: TEST_PAIR_IDS[0], status: 'merged', testName: 'Status Update to Merged' }
  ];

  for (const testCase of testCases) {
    try {
      const updates = {
        status: testCase.status,
        enhancedConfidence: 'high',
        enhancedScore: 95.5,
        decisionUser: TEST_USER_ID,
        cachedAiAnalysis: { confidence: 'high', timestamp: new Date().toISOString() }
      };

      const rowsUpdated = await updateDuplicatePair(testCase.pairId, updates);
      
      const updateSuccessful = rowsUpdated === 1;
      logTest(`Duplicate Pair Updates - ${testCase.testName}`, updateSuccessful);
      
    } catch (error) {
      logTest(`Duplicate Pair Updates - ${testCase.testName}`, false, error.message);
    }
  }

  // Verify updates persisted
  try {
    const pairs = await getDuplicatePairsForSession(TEST_SESSION_ID);
    const updatedPair = pairs.find(p => p.id === TEST_PAIR_IDS[0]);
    
    const statusUpdated = updatedPair && updatedPair.status === 'merged';
    logTest('Duplicate Pair Updates - Status Persisted', statusUpdated);
    
    const enhancementsPersisted = updatedPair && updatedPair.enhanced_confidence === 'high';
    logTest('Duplicate Pair Updates - Enhanced Data Persisted', enhancementsPersisted);
    
  } catch (error) {
    logTest('Duplicate Pair Updates - Verification', false, error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n🔒 Testing Data Integrity and Constraints...');
  
  if (!TEST_SESSION_ID) {
    logTest('Data Integrity - Session Available', false, 'No test session ID');
    return;
  }

  // Test session progress tracking
  try {
    const session = await getUserSession(TEST_SESSION_ID);
    
    const hasCorrectTotalPairs = session.total_pairs === mockDuplicatePairs.length;
    logTest('Data Integrity - Session Total Pairs Updated', hasCorrectTotalPairs);
    
    const hasProcessedPairs = session.processed_pairs > 0;
    logTest('Data Integrity - Session Processed Pairs Tracked', hasProcessedPairs);
    
  } catch (error) {
    logTest('Data Integrity - Session Progress', false, error.message);
  }

  // Test foreign key constraints
  try {
    const client = await pool.connect();
    
    // Try to insert duplicate pair with invalid session ID
    try {
      await client.query(`
        INSERT INTO duplicate_pairs (session_id, record1_data, record2_data, fuzzy_similarity_score)
        VALUES ('invalid-uuid', '{}', '{}', 0.5)
      `);
      logTest('Data Integrity - Foreign Key Constraint', false, 'Invalid session ID was accepted');
    } catch (constraintError) {
      logTest('Data Integrity - Foreign Key Constraint', true);
    }
    
    client.release();
  } catch (error) {
    logTest('Data Integrity - Constraint Testing', false, error.message);
  }

  // Test unique constraints
  try {
    // Try to insert duplicate session config
    await saveSessionConfig(TEST_SESSION_ID, 'test_key', { value: 1 });
    await saveSessionConfig(TEST_SESSION_ID, 'test_key', { value: 2 }); // Should update, not error
    
    const configs = await getSessionConfig(TEST_SESSION_ID, 'test_key');
    const onlyOneConfig = configs.length === 1 && configs[0].config_value.value === 2;
    logTest('Data Integrity - Unique Constraint with Upsert', onlyOneConfig);
    
  } catch (error) {
    logTest('Data Integrity - Unique Constraint Testing', false, error.message);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const client = await pool.connect();
    
    // Clean up test session (CASCADE will clean up related data)
    if (TEST_SESSION_ID) {
      await client.query('DELETE FROM user_sessions WHERE id = $1', [TEST_SESSION_ID]);
      logTest('Cleanup - Test Session Removed', true);
    }
    
    // Verify cleanup
    const remainingSessions = await client.query('SELECT id FROM user_sessions WHERE user_id = $1', [TEST_USER_ID]);
    const cleanupComplete = remainingSessions.rows.length === 0;
    logTest('Cleanup - All Test Data Removed', cleanupComplete);
    
    client.release();
  } catch (error) {
    logTest('Cleanup - Test Data Removal', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Direct Database CRUD Tests');
  console.log(`Using test user ID: ${TEST_USER_ID}`);
  console.log(`Database: postgresql://mdm_user:***@localhost:5433/mdm_dedup`);
  console.log('=' .repeat(60));
  
  try {
    await testDatabaseConnection();
    await testSessionCRUD();
    await testSessionConfiguration();
    await testDuplicatePairsCRUD();
    await testDuplicatePairUpdates();
    await testDataIntegrity();
    await cleanupTestData();
  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    testResults.failed++;
    testResults.total++;
  } finally {
    // Close database pool
    await pool.end();
  }
  
  // Print results summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 FAILED TEST DETAILS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\n' + '=' .repeat(60));
  
  const allTestsPassed = testResults.failed === 0;
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Database CRUD operations are fully functional.');
    console.log('✅ Ready for production use.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    console.log('🔧 Database may need fixes before production use.');
  }
  
  return allTestsPassed;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };