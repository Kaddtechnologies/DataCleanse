import { NextRequest, NextResponse } from 'next/server';
import { BusinessRule, TestCase } from '@/types/business-rules';
import { ruleTestingFramework } from '@/lib/rule-engine/validator';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId, rule, testCases } = body;

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule is required' },
        { status: 400 }
      );
    }

    // Create a complete rule object with test cases
    const ruleToTest: BusinessRule = {
      ...rule,
      testCases: testCases || rule.testCases || generateDefaultTestCases(rule)
    };

    // Run tests
    const testResult = await ruleTestingFramework.testRule(ruleToTest);

    // Save test results to database
    if (ruleId) {
      await saveTestResults(ruleId, testResult);
    }

    // Generate additional test cases if accuracy is low
    if (testResult?.accuracy && testResult.accuracy < 95) {
      const additionalTests = await ruleTestingFramework.generateAdditionalTestCases(
        ruleToTest,
        'Low accuracy detected, generating edge cases'
      );
      testResult.suggestedTests = additionalTests;
    }

    return NextResponse.json({
      ...testResult,
      success: true
    });
  } catch (error) {
    console.error('Error testing rule:', error);
    return NextResponse.json(
      { error: 'Failed to test rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateDefaultTestCases(rule: BusinessRule): TestCase[] {
  const testCases: TestCase[] = [];

  // Generate test cases based on rule category
  if (rule.category === 'business-relationship') {
    testCases.push(
      {
        id: 'test-energy-1',
        name: 'Energy division test - different divisions',
        description: 'Should identify different energy divisions at same address',
        ruleId: rule.id || 'default-rule',
        input: {
          record1: {
            name: 'Shell Chemical Company',
            address: '123 Energy Boulevard',
            city: 'Houston',
            country: 'USA',
            tpi: 'SHC001'
          },
          record2: {
            name: 'Shell Oil Corporation',
            address: '123 Energy Boulevard',
            city: 'Houston',
            country: 'USA',
            tpi: 'SHO001'
          }
        },
        expectedOutput: {
          recommendation: 'reject',
          confidence: 'high',
          shouldTrigger: true
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          tags: ['business-relationship', 'energy', 'division']
        }
      },
      {
        id: 'test-energy-2',
        name: 'Energy company test - same company',
        description: 'Should merge same company with formatting differences',
        ruleId: rule.id || 'default-rule',
        input: {
          record1: {
            name: 'BP Oil & Gas',
            address: '456 Petroleum Way',
            city: 'London',
            country: 'UK',
            tpi: 'BP001'
          },
          record2: {
            name: 'BP Oil and Gas',
            address: '456 Petroleum Way',
            city: 'London',
            country: 'UK',
            tpi: 'BP001'
          }
        },
        expectedOutput: {
          recommendation: 'merge',
          confidence: 'high',
          shouldTrigger: true
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          tags: ['business-relationship', 'energy', 'same-company']
        }
      }
    );
  } else if (rule.category === 'geographic') {
    testCases.push(
      {
        id: 'test-geo-1',
        name: 'Geographic test - different countries',
        description: 'Should keep separate for different countries',
        ruleId: rule.id || 'default-rule',
        input: {
          record1: {
            name: 'Starbucks Corporation',
            address: '123 Coffee Street',
            city: 'Seattle',
            country: 'USA',
            tpi: 'SB001'
          },
          record2: {
            name: 'Starbucks Corporation',
            address: '456 Tea Road',
            city: 'London',
            country: 'UK',
            tpi: 'SB002'
          }
        },
        expectedOutput: {
          recommendation: 'reject',
          confidence: 'high',
          shouldTrigger: true
        },
        metadata: {
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          tags: ['geographic', 'different-countries']
        }
      }
    );
  }

  // Add edge case tests
  testCases.push(
    {
      id: 'test-edge-1',
      name: 'Edge case - missing data',
      description: 'Should handle missing critical data',
      ruleId: rule.id || 'default-rule',
      input: {
        record1: {
          name: '',
          address: null as any,
          city: 'Unknown'
        },
        record2: {
          name: 'Valid Company Inc',
          address: '789 Main Street',
          city: 'New York',
          country: 'USA'
        }
      },
      expectedOutput: {
        recommendation: 'flag',
        confidence: 'low',
        shouldTrigger: true
      },
      metadata: {
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: ['edge-case', 'data-quality', 'missing-data']
      }
    }
  );

  return testCases;
}

async function saveTestResults(ruleId: string, testResult: any) {
  try {
    await db.query(
      `INSERT INTO rule_test_results 
       (rule_id, accuracy, passed, failed, total_tests, avg_execution_time, 
        test_details, tested_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        ruleId,
        testResult.accuracy,
        testResult.passed,
        testResult.failed,
        testResult.totalTests,
        testResult.avgExecutionTime,
        JSON.stringify(testResult.results)
      ]
    );
  } catch (error) {
    console.error('Error saving test results:', error);
  }
}