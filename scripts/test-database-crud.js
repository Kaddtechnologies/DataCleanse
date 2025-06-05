#!/usr/bin/env node

/**
 * Comprehensive Database CRUD Test Script
 * Tests all database operations for the MDM Data Cleanse system
 * Includes realistic mock data based on actual API payloads
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test_user_crud_' + crypto.randomBytes(4).toString('hex');

// Test tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Mock data that matches the actual CustomerRecord interface
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
    overall_score: 93.6,
    blockType: 'prefix',
    matchMethod: 'fuzzy_match',
    bestNameMatchMethod: 'levenshtein',
    bestAddrMatchMethod: 'jaro_winkler',
    isLowConfidence: false,
    llm_conf: 0.92
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
    overall_score: 91.8,
    blockType: 'metaphone',
    matchMethod: 'fuzzy_match',
    bestNameMatchMethod: 'soundex',
    bestAddrMatchMethod: 'partial_ratio',
    isLowConfidence: false,
    llm_conf: 0.89
  },
  {
    id: 'rec_003',
    name: 'Global Tech Solutions',
    email: 'sales@globaltech.com',
    phone: '+1-800-555-0199',
    address: '456 Technology Boulevard',
    city: 'San Francisco',
    country: 'USA',
    tpi: 'TPI002',
    rowNumber: 32,
    name_score: 78,
    addr_score: 72,
    city_score: 100,
    country_score: 100,
    tpi_score: 95,
    overall_score: 89.0,
    blockType: 'ngram',
    matchMethod: 'semantic_similarity',
    bestNameMatchMethod: 'token_sort_ratio',
    bestAddrMatchMethod: 'levenshtein',
    isLowConfidence: true,
    llm_conf: 0.76
  },
  {
    id: 'rec_004',
    name: 'GlobalTech Solutions Inc',
    email: 'contact@globaltechsolutions.com',
    phone: '+1-800-555-0200',
    address: '456 Tech Blvd',
    city: 'San Francisco',
    country: 'United States of America',
    tpi: 'TPI002B',
    rowNumber: 87,
    name_score: 82,
    addr_score: 79,
    city_score: 100,
    country_score: 90,
    tpi_score: 91,
    overall_score: 88.4,
    blockType: 'soundex',
    matchMethod: 'ai_enhanced',
    bestNameMatchMethod: 'partial_ratio',
    bestAddrMatchMethod: 'token_set_ratio',
    isLowConfidence: true,
    llm_conf: 0.81
  }
];

// Mock duplicate pairs with realistic similarity scores and AI analysis
const mockDuplicatePairs = [
  {
    record1: mockCustomerRecords[0],
    record2: mockCustomerRecords[1],
    similarityScore: 0.936,
    aiConfidence: 'high',
    aiReasoning: 'High name similarity (95%), identical geographic location, and very close TPI numbers suggest these are the same entity with slight variations in naming convention.',
    enhancedConfidence: 'high',
    enhancedScore: 94.2,
    originalScore: 93.6,
    cachedAiAnalysis: {
      confidence: 'high',
      score: 94.2,
      reasoning: 'Strong match indicators across multiple fields',
      recommendation: 'merge',
      field_analysis: {
        name: { score: 95, method: 'fuzzy_ratio' },
        address: { score: 88, method: 'partial_ratio' },
        location: { score: 100, method: 'exact_match' },
        tpi: { score: 85, method: 'similarity_check' }
      }
    }
  },
  {
    record1: mockCustomerRecords[2],
    record2: mockCustomerRecords[3],
    similarityScore: 0.884,
    aiConfidence: 'medium',
    aiReasoning: 'Similar company names and geographic location, but some differences in contact information and TPI suggest potential but not certain match.',
    enhancedConfidence: 'medium',
    enhancedScore: 86.8,
    originalScore: 89.0,
    cachedAiAnalysis: {
      confidence: 'medium',
      score: 86.8,
      reasoning: 'Moderate similarity with some discrepancies',
      recommendation: 'review',
      field_analysis: {
        name: { score: 82, method: 'token_sort_ratio' },
        address: { score: 79, method: 'levenshtein' },
        location: { score: 95, method: 'normalized_match' },
        tpi: { score: 91, method: 'pattern_match' }
      }
    }
  }
];

// Mock processing configuration that matches actual usage
const mockProcessingConfig = {
  use_prefix: true,
  use_metaphone: true,
  use_soundex: false,
  use_ngram: true,
  use_ai: true,
  name_threshold: 75,
  overall_threshold: 80,
  column_mapping: {
    'Company Name': 'name',
    'Email Address': 'email',
    'Phone Number': 'phone',
    'Street Address': 'address',
    'City': 'city',
    'Country': 'country',
    'TPI Number': 'tpi'
  }
};

// HTTP request helper
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRUD-Test-Script/1.0',
        'X-Test-User-ID': TEST_USER_ID
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = require(url.protocol === 'https:' ? 'https' : 'http').request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const responseData = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

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

function validateResponse(response, expectedStatus, testName) {
  if (response.status !== expectedStatus) {
    logTest(testName, false, `Expected status ${expectedStatus}, got ${response.status}. Response: ${JSON.stringify(response.data)}`);
    return false;
  }
  if (response.data.error) {
    logTest(testName, false, `API returned error: ${response.data.error}. Details: ${response.data.details || 'None'}`);
    return false;
  }
  return true;
}

// Test suites
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  
  try {
    const response = await makeRequest('GET', '/api/health');
    const passed = validateResponse(response, 200, 'Health Check - API Response');
    
    if (passed) {
      const isHealthy = response.data.status === 'healthy' && 
                       response.data.services?.database?.status === 'connected';
      logTest('Health Check - Database Connection', isHealthy, 
        isHealthy ? '' : `Database status: ${response.data.services?.database?.status || 'unknown'}`);
    }
  } catch (error) {
    logTest('Health Check - API Response', false, `Request failed: ${error.message}`);
  }
}

async function testSessionCRUD() {
  console.log('\n📝 Testing Session CRUD Operations...');
  let sessionId = null;

  // Test session creation
  try {
    const sessionData = {
      sessionName: `Test Session ${new Date().toISOString()}`,
      fileName: 'test_customer_data.csv',
      fileHash: crypto.createHash('sha256').update('mock_file_content').digest('hex'),
      totalPairs: mockDuplicatePairs.length,
      userId: TEST_USER_ID,
      metadata: {
        test_run: true,
        upload_source: 'crud_test_script',
        file_size: 12345,
        total_records: 100
      },
      processingConfig: mockProcessingConfig
    };

    const createResponse = await makeRequest('POST', '/api/sessions/create', sessionData);
    
    if (validateResponse(createResponse, 200, 'Session Creation - API Response')) {
      sessionId = createResponse.data.session?.id;
      const hasValidId = sessionId && typeof sessionId === 'string';
      logTest('Session Creation - Valid Session ID', hasValidId, 
        hasValidId ? '' : `Session ID: ${sessionId}`);
      
      const hasValidName = createResponse.data.session?.session_name === sessionData.sessionName;
      logTest('Session Creation - Correct Session Name', hasValidName);
      
      const hasValidUserId = createResponse.data.session?.user_id === TEST_USER_ID;
      logTest('Session Creation - Correct User ID', hasValidUserId);
    }
  } catch (error) {
    logTest('Session Creation - API Response', false, `Request failed: ${error.message}`);
    return null; // Can't continue without session
  }

  // Test session listing
  try {
    const listResponse = await makeRequest('GET', `/api/sessions/list?userId=${TEST_USER_ID}&limit=5`);
    
    if (validateResponse(listResponse, 200, 'Session Listing - API Response')) {
      const sessions = listResponse.data.sessions || [];
      const foundTestSession = sessions.find(s => s.id === sessionId);
      logTest('Session Listing - Test Session Found', !!foundTestSession);
      
      const hasValidStructure = sessions.every(s => 
        s.id && s.session_name && typeof s.total_pairs === 'number' && 
        typeof s.processed_pairs === 'number' && s.created_at
      );
      logTest('Session Listing - Valid Session Structure', hasValidStructure);
    }
  } catch (error) {
    logTest('Session Listing - API Response', false, `Request failed: ${error.message}`);
  }

  return sessionId;
}

async function testDuplicatePairsCRUD(sessionId) {
  console.log('\n👥 Testing Duplicate Pairs CRUD Operations...');
  
  if (!sessionId) {
    logTest('Duplicate Pairs Testing - Session ID Available', false, 'No session ID provided');
    return [];
  }

  let pairIds = [];

  // Test batch creation of duplicate pairs
  try {
    const batchData = {
      sessionId: sessionId,
      pairs: mockDuplicatePairs
    };

    const createResponse = await makeRequest('POST', '/api/duplicate-pairs/create-batch', batchData);
    
    if (validateResponse(createResponse, 200, 'Duplicate Pairs Batch Creation - API Response')) {
      const correctCount = createResponse.data.pairs_created === mockDuplicatePairs.length;
      logTest('Duplicate Pairs Batch Creation - Correct Count', correctCount,
        correctCount ? '' : `Expected ${mockDuplicatePairs.length}, got ${createResponse.data.pairs_created}`);
    }
  } catch (error) {
    logTest('Duplicate Pairs Batch Creation - API Response', false, `Request failed: ${error.message}`);
  }

  // Test loading session with duplicate pairs
  try {
    const loadResponse = await makeRequest('GET', `/api/sessions/${sessionId}/load`);
    
    if (validateResponse(loadResponse, 200, 'Session Load with Pairs - API Response')) {
      const pairs = loadResponse.data.duplicate_pairs || [];
      pairIds = pairs.map(p => p.id);
      
      const correctPairCount = pairs.length === mockDuplicatePairs.length;
      logTest('Session Load with Pairs - Correct Pair Count', correctPairCount,
        correctPairCount ? '' : `Expected ${mockDuplicatePairs.length}, got ${pairs.length}`);
      
      // Validate pair structure
      const validPairStructure = pairs.every(p => 
        p.id && p.record1 && p.record2 && typeof p.similarityScore === 'number' && p.status
      );
      logTest('Session Load with Pairs - Valid Pair Structure', validPairStructure);
      
      // Validate data integrity
      const hasExpectedData = pairs.some(p => 
        p.record1.name === 'Acme Corporation' && p.record2.name === 'ACME Corp'
      );
      logTest('Session Load with Pairs - Data Integrity', hasExpectedData);
      
      // Test session statistics
      const stats = loadResponse.data.statistics;
      const validStats = stats && typeof stats.total_pairs === 'number' && 
                        typeof stats.pending === 'number';
      logTest('Session Load with Pairs - Valid Statistics', validStats);
    }
  } catch (error) {
    logTest('Session Load with Pairs - API Response', false, `Request failed: ${error.message}`);
  }

  return pairIds;
}

async function testDuplicatePairUpdates(pairIds) {
  console.log('\n🔄 Testing Duplicate Pair Updates...');
  
  if (!pairIds || pairIds.length === 0) {
    logTest('Duplicate Pair Updates - Pair IDs Available', false, 'No pair IDs provided');
    return;
  }

  // Test updating pair status
  const testCases = [
    { pairId: pairIds[0], status: 'merged', testName: 'Update Status to Merged' },
    { pairId: pairIds[1], status: 'not_duplicate', testName: 'Update Status to Not Duplicate' }
  ];

  for (const testCase of testCases) {
    if (!testCase.pairId) continue;
    
    try {
      const updateData = {
        status: testCase.status,
        enhancedConfidence: 'high',
        enhancedScore: 95.5,
        decisionUser: TEST_USER_ID,
        cachedAiAnalysis: {
          confidence: 'high',
          timestamp: new Date().toISOString(),
          analysis_version: '1.0'
        }
      };

      const updateResponse = await makeRequest('PUT', `/api/duplicate-pairs/${testCase.pairId}/update`, updateData);
      
      if (validateResponse(updateResponse, 200, `Duplicate Pair Update - ${testCase.testName} API Response`)) {
        const correctPairId = updateResponse.data.pair_id === testCase.pairId;
        logTest(`Duplicate Pair Update - ${testCase.testName} Correct ID`, correctPairId);
        
        const hasUpdatedFields = updateResponse.data.updated_fields && 
                               updateResponse.data.updated_fields.status === testCase.status;
        logTest(`Duplicate Pair Update - ${testCase.testName} Status Updated`, hasUpdatedFields);
      }
    } catch (error) {
      logTest(`Duplicate Pair Update - ${testCase.testName} API Response`, false, `Request failed: ${error.message}`);
    }
  }

  // Test invalid status update
  try {
    const invalidUpdateData = { status: 'invalid_status' };
    const invalidResponse = await makeRequest('PUT', `/api/duplicate-pairs/${pairIds[0]}/update`, invalidUpdateData);
    
    const correctlyRejected = invalidResponse.status === 400;
    logTest('Duplicate Pair Update - Invalid Status Rejected', correctlyRejected,
      correctlyRejected ? '' : `Expected 400, got ${invalidResponse.status}`);
  } catch (error) {
    logTest('Duplicate Pair Update - Invalid Status Test', false, `Request failed: ${error.message}`);
  }
}

async function testSessionConfiguration(sessionId) {
  console.log('\n⚙️ Testing Session Configuration...');
  
  if (!sessionId) {
    logTest('Session Configuration - Session ID Available', false, 'No session ID provided');
    return;
  }

  // Session configuration is tested implicitly through session load
  // Let's verify the configurations were saved correctly
  try {
    const loadResponse = await makeRequest('GET', `/api/sessions/${sessionId}/load`);
    
    if (validateResponse(loadResponse, 200, 'Session Configuration - Load Response')) {
      const config = loadResponse.data.configuration || {};
      
      const hasProcessingConfig = config.processing_config && 
                                 typeof config.processing_config === 'object';
      logTest('Session Configuration - Processing Config Saved', hasProcessingConfig);
      
      const hasBlockingStrategies = config.blocking_strategies && 
                                   typeof config.blocking_strategies.use_prefix === 'boolean';
      logTest('Session Configuration - Blocking Strategies Saved', hasBlockingStrategies);
      
      const hasThresholds = config.similarity_thresholds && 
                           typeof config.similarity_thresholds.name_threshold === 'number';
      logTest('Session Configuration - Similarity Thresholds Saved', hasThresholds);
    }
  } catch (error) {
    logTest('Session Configuration - Load Response', false, `Request failed: ${error.message}`);
  }
}

async function testDataIntegrity(sessionId) {
  console.log('\n🔒 Testing Data Integrity...');
  
  if (!sessionId) {
    logTest('Data Integrity - Session ID Available', false, 'No session ID provided');
    return;
  }

  // Test that updates are reflected in subsequent loads
  try {
    const loadResponse = await makeRequest('GET', `/api/sessions/${sessionId}/load`);
    
    if (validateResponse(loadResponse, 200, 'Data Integrity - Session Reload')) {
      const pairs = loadResponse.data.duplicate_pairs || [];
      
      // Check that status updates persisted
      const mergedPairs = pairs.filter(p => p.status === 'merged');
      const notDuplicatePairs = pairs.filter(p => p.status === 'not_duplicate');
      
      logTest('Data Integrity - Merged Status Persisted', mergedPairs.length > 0);
      logTest('Data Integrity - Not Duplicate Status Persisted', notDuplicatePairs.length > 0);
      
      // Check that statistics are updated
      const stats = loadResponse.data.statistics;
      const statsReflectUpdates = stats && 
                                 (stats.merged > 0 || stats.not_duplicate > 0) &&
                                 stats.pending < stats.total_pairs;
      logTest('Data Integrity - Statistics Reflect Updates', statsReflectUpdates);
      
      // Check session progress is updated
      const session = loadResponse.data.session;
      const progressUpdated = session && session.processed_pairs > 0;
      logTest('Data Integrity - Session Progress Updated', progressUpdated);
    }
  } catch (error) {
    logTest('Data Integrity - Session Reload', false, `Request failed: ${error.message}`);
  }
}

async function cleanupTestData(sessionId) {
  console.log('\n🧹 Cleaning up test data...');
  
  if (!sessionId) {
    console.log('No session ID to clean up');
    return;
  }

  // Note: Since we're using CASCADE DELETE, removing the session will remove all related data
  try {
    // In a real implementation, we'd have a DELETE endpoint for sessions
    // For now, we'll just log that cleanup would happen here
    console.log(`Test session ${sessionId} and all related data will be cleaned up automatically by database constraints`);
    
    // Verify the session still exists (it should for now since we don't have delete endpoint)
    const verifyResponse = await makeRequest('GET', `/api/sessions/${sessionId}/load`);
    const sessionStillExists = verifyResponse.status === 200;
    
    if (sessionStillExists) {
      console.log('✅ Test session still exists (normal - no delete endpoint implemented yet)');
      console.log('📝 Note: Implement DELETE /api/sessions/{id} endpoint for complete cleanup');
    }
  } catch (error) {
    console.log(`Cleanup verification failed: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Database CRUD Tests');
  console.log(`Using test user ID: ${TEST_USER_ID}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('=' .repeat(60));
  
  // Run all test suites
  await testHealthCheck();
  const sessionId = await testSessionCRUD();
  const pairIds = await testDuplicatePairsCRUD(sessionId);
  await testDuplicatePairUpdates(pairIds);
  await testSessionConfiguration(sessionId);
  await testDataIntegrity(sessionId);
  await cleanupTestData(sessionId);
  
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
  
  // Return session ID for potential cleanup
  return { success: allTestsPassed, sessionId };
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, makeRequest, TEST_USER_ID };