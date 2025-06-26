"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Square,
  FileText, 
  BarChart3,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { BusinessRule, TestResult } from '@/types/business-rules';
import { useToast } from '@/hooks/use-toast';

import { LiveTestCard, TestCase, TestCaseResult, TestStatus } from './LiveTestCard';
import { PhaseProgressIndicator, TestPhase, TEST_PHASES } from './PhaseProgressIndicator';
import { LiveMetricsDashboard, LiveTestMetrics } from './LiveMetricsDashboard';

interface EnhancedTestingFrameworkProps {
  rule?: BusinessRule;
  onTestComplete?: (results: TestResult) => void;
  onDeploy?: () => void;
}

interface TestProgressUpdate {
  phase: TestPhase;
  currentTest: number;
  totalTests: number;
  currentTestId: string;
  currentTestName: string;
  completedTests: TestCaseResult[];
  estimatedTimeRemaining: number;
  metrics: LiveTestMetrics;
}

export function EnhancedTestingFramework({ 
  rule, 
  onTestComplete, 
  onDeploy 
}: EnhancedTestingFrameworkProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<TestPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveTestMetrics>({
    totalTests: 0,
    completedTests: 0,
    passedTests: 0,
    failedTests: 0,
    avgExecutionTime: 0,
    totalExecutionTime: 0,
    successRate: 0,
    currentThroughput: 0,
    estimatedTimeRemaining: 0,
    memoryUsage: 0.8,
    cpuUsage: 15
  });
  
  const [testStatuses, setTestStatuses] = useState<Map<string, TestStatus>>(new Map());
  const [completedResults, setCompletedResults] = useState<Map<string, TestCaseResult>>(new Map());
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Generate mock test cases for demonstration
  const generateTestCases = useCallback((rule: BusinessRule): TestCase[] => {
    return [
      {
        id: 'test-1',
        name: 'Energy Division Detection',
        description: 'Test detection of different energy company divisions at same address'
      },
      {
        id: 'test-2', 
        name: 'Similar Names Different Industries',
        description: 'Test handling of similar company names in different industries'
      },
      {
        id: 'test-3',
        name: 'Subsidiary Recognition',
        description: 'Test recognition of parent-subsidiary relationships'
      },
      {
        id: 'test-4',
        name: 'International Entities',
        description: 'Test handling of international company variations'
      },
      {
        id: 'test-5',
        name: 'Joint Venture Detection',
        description: 'Test identification of joint venture partnerships'
      },
      {
        id: 'test-6',
        name: 'Address Variations',
        description: 'Test handling of slight address variations for same company'
      }
    ];
  }, []);

  const simulateRealtimeTests = useCallback(async (testCases: TestCase[]) => {
    if (!rule) return;

    abortControllerRef.current = new AbortController();
    setCanCancel(true);

    try {
      // Phase 1: Thinking
      setCurrentPhase('thinking');
      setProgress(0);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (abortControllerRef.current?.signal.aborted) return;

      // Phase 2: Examining (run tests progressively)
      setCurrentPhase('examining');
      
      const startTime = Date.now();
      let passedCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < testCases.length; i++) {
        if (abortControllerRef.current?.signal.aborted) return;
        
        const testCase = testCases[i];
        setCurrentTestIndex(i + 1);
        
        // Mark test as running
        setTestStatuses(prev => new Map(prev.set(testCase.id, 'running')));
        
        // Simulate test execution time
        const executionTime = Math.random() * 200 + 50; // 50-250ms
        await new Promise(resolve => setTimeout(resolve, executionTime));
        
        if (abortControllerRef.current?.signal.aborted) return;
        
        // Generate random test result (mostly passes for demo)
        const passed = Math.random() > 0.2; // 80% pass rate
        const result: TestCaseResult = {
          testCaseId: testCase.id,
          passed,
          executionTime,
          expected: { recommendation: 'reject', confidence: 'high' },
          actual: { recommendation: passed ? 'reject' : 'accept', confidence: 'high' },
          error: !passed ? 'Unexpected recommendation result' : undefined
        };
        
        // Update test status and results
        setTestStatuses(prev => new Map(prev.set(testCase.id, passed ? 'passed' : 'failed')));
        setCompletedResults(prev => new Map(prev.set(testCase.id, result)));
        
        if (passed) passedCount++;
        else failedCount++;
        
        // Update metrics
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const avgTime = elapsedTime / (i + 1);
        const remainingTests = testCases.length - (i + 1);
        const estimatedRemaining = remainingTests * avgTime;
        const currentThroughput = (i + 1) / (elapsedTime / 1000);
        
        setLiveMetrics({
          totalTests: testCases.length,
          completedTests: i + 1,
          passedTests: passedCount,
          failedTests: failedCount,
          avgExecutionTime: avgTime,
          totalExecutionTime: elapsedTime,
          successRate: ((passedCount / (i + 1)) * 100),
          currentThroughput,
          estimatedTimeRemaining: estimatedRemaining,
          memoryUsage: 0.8 + Math.random() * 0.4,
          cpuUsage: 15 + Math.random() * 30
        });
        
        // Update progress
        setProgress(((i + 1) / testCases.length) * 85); // Leave 15% for finishing phase
        
        // Show progress toast for failed tests
        if (!passed) {
          toast({
            title: `Test Failed: ${testCase.name}`,
            description: result.error || 'Test did not meet expectations',
            variant: "destructive",
            duration: 3000,
          });
        }
      }
      
      // Phase 3: Finishing
      setCurrentPhase('finishing');
      setProgress(90);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      if (abortControllerRef.current?.signal.aborted) return;
      
      // Complete
      setCurrentPhase('complete');
      setProgress(100);
      
      const finalResult: TestResult = {
        totalTests: testCases.length,
        passed: passedCount,
        failed: failedCount,
        accuracy: (passedCount / testCases.length) * 100,
        avgExecutionTime: liveMetrics.avgExecutionTime,
        results: Array.from(completedResults.values())
      };
      
      setTestResults(finalResult);
      
      if (onTestComplete) {
        onTestComplete(finalResult);
      }
      
      toast({
        title: "Tests Completed! 🎉",
        description: `${passedCount} passed, ${failedCount} failed (${finalResult.accuracy.toFixed(1)}% accuracy)`,
        variant: failedCount === 0 ? "default" : "destructive",
        duration: 5000,
      });
      
    } catch (error) {
      console.error('Test execution error:', error);
      toast({
        title: "Test execution failed",
        description: "An error occurred during test execution",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCanCancel(false);
      abortControllerRef.current = null;
    }
  }, [rule, onTestComplete, toast, liveMetrics.avgExecutionTime, completedResults]);

  const runTests = useCallback(async () => {
    if (!rule) return;

    setIsRunning(true);
    setTestResults(null);
    setTestStatuses(new Map());
    setCompletedResults(new Map());
    setExpandedTest(null);
    setCurrentTestIndex(0);
    
    const testCases = generateTestCases(rule);
    
    // Initialize test statuses
    const initialStatuses = new Map<string, TestStatus>();
    testCases.forEach(test => initialStatuses.set(test.id, 'pending'));
    setTestStatuses(initialStatuses);
    
    // Initialize metrics
    setLiveMetrics({
      totalTests: testCases.length,
      completedTests: 0,
      passedTests: 0,
      failedTests: 0,
      avgExecutionTime: 0,
      totalExecutionTime: 0,
      successRate: 0,
      currentThroughput: 0,
      estimatedTimeRemaining: 0,
      memoryUsage: 0.8,
      cpuUsage: 15
    });
    
    await simulateRealtimeTests(testCases);
  }, [rule, generateTestCases, simulateRealtimeTests]);

  const cancelTests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
      setCanCancel(false);
      setCurrentPhase('idle');
      setProgress(0);
      
      toast({
        title: "Tests cancelled",
        description: "Test execution was cancelled by user",
        variant: "default"
      });
    }
  }, [toast]);

  const resetTests = useCallback(() => {
    setTestResults(null);
    setTestStatuses(new Map());
    setCompletedResults(new Map());
    setExpandedTest(null);
    setCurrentPhase('idle');
    setProgress(0);
    setCurrentTestIndex(0);
    setLiveMetrics({
      totalTests: 0,
      completedTests: 0,
      passedTests: 0,
      failedTests: 0,
      avgExecutionTime: 0,
      totalExecutionTime: 0,
      successRate: 0,
      currentThroughput: 0,
      estimatedTimeRemaining: 0,
      memoryUsage: 0.8,
      cpuUsage: 15
    });
  }, []);

  if (!rule) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground">
            No rule selected for testing.
          </p>
        </CardContent>
      </Card>
    );
  }

  const testCases = generateTestCases(rule);
  const accuracy = testResults ? testResults.accuracy : 0;
  const passed = testResults ? testResults.passed : 0;
  const failed = testResults ? testResults.failed : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Enhanced Testing Environment
          </CardTitle>
          <div className="flex items-center gap-2">
            {testResults && (
              <Badge 
                variant={failed === 0 ? "default" : "destructive"}
                className={failed === 0 ? "bg-green-500 hover:bg-green-600" : ""}
              >
                {accuracy.toFixed(1)}% Accuracy
              </Badge>
            )}
            <div className="flex gap-2">
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelTests}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Square className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
              {!isRunning && testResults && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetTests}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
              <Button
                size="sm"
                onClick={runTests}
                disabled={isRunning}
                className={isRunning ? "bg-blue-600" : ""}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Run Tests
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        {isRunning || testResults ? (
          <Tabs defaultValue="live" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
              <TabsTrigger value="live" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                Live Progress
              </TabsTrigger>
              <TabsTrigger value="tests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                Test Cases
              </TabsTrigger>
              <TabsTrigger value="metrics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                Metrics
              </TabsTrigger>
              {testResults && (
                <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                  Summary
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="live" className="flex-1 p-6 space-y-6">
              <PhaseProgressIndicator
                currentPhase={currentPhase}
                progress={progress}
                currentTestIndex={currentTestIndex}
                totalTests={testCases.length}
                estimatedTimeRemaining={liveMetrics.estimatedTimeRemaining}
              />
              
              <LiveMetricsDashboard
                metrics={liveMetrics}
                isRunning={isRunning}
                showDetailedMetrics={false}
              />
            </TabsContent>
            
            <TabsContent value="tests" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-6">
                <div className="space-y-3">
                  {testCases.map((testCase) => (
                    <LiveTestCard
                      key={testCase.id}
                      test={testCase}
                      status={testStatuses.get(testCase.id) || 'pending'}
                      result={completedResults.get(testCase.id)}
                      isExpanded={expandedTest === testCase.id}
                      onToggleExpand={() => setExpandedTest(
                        expandedTest === testCase.id ? null : testCase.id
                      )}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="metrics" className="flex-1 p-6 overflow-auto">
              <LiveMetricsDashboard
                metrics={liveMetrics}
                isRunning={isRunning}
                showDetailedMetrics={true}
              />
            </TabsContent>
            
            {testResults && (
              <TabsContent value="summary" className="flex-1 p-6 space-y-6">
                {failed === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">All Tests Passed! 🎉</h3>
                    <p className="text-muted-foreground mb-6">
                      This rule is ready for deployment to production.
                    </p>
                    <Button
                      size="lg"
                      onClick={onDeploy}
                      disabled={!onDeploy}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Deploy to Production
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Tests Completed with Issues</h3>
                    <p className="text-muted-foreground mb-6">
                      {failed} test{failed !== 1 ? 's' : ''} failed. Please review and fix before deployment.
                    </p>
                    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Passed</p>
                        <p className="text-lg font-semibold text-green-600">{passed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-lg font-semibold text-red-600">{failed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Accuracy</p>
                        <p className="text-lg font-semibold">{accuracy.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Ready for Real-time Testing</p>
              <p className="text-sm text-muted-foreground mb-6">
                Click "Run Tests" to start comprehensive rule validation with live progress updates
              </p>
              <Button onClick={runTests} disabled={isRunning} size="lg">
                <Play className="w-4 h-4 mr-2" />
                Run Enhanced Tests
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}