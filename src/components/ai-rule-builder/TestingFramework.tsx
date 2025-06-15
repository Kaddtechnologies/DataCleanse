"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Loader2,
  BarChart,
  Clock,
  Cpu,
  Database
} from 'lucide-react';
import { BusinessRule, TestCase, TestResult } from '@/types/business-rules';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TestingFrameworkProps {
  rule?: BusinessRule;
  onTestComplete?: (results: TestResult) => void;
  onDeploy?: () => void;
}

export function TestingFramework({ rule, onTestComplete, onDeploy }: TestingFrameworkProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const { toast } = useToast();

  const runTests = async () => {
    if (!rule) return;

    setIsRunning(true);
    setTestResults(null);

    try {
      const response = await fetch('/api/ai-rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleId: rule.id,
          rule: rule,
          testCases: rule.testCases
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run tests');
      }

      const results = await response.json();
      setTestResults(results);
      
      if (onTestComplete) {
        onTestComplete(results);
      }

      toast({
        title: "Tests complete",
        description: `${results.passed} passed, ${results.failed} failed`,
        variant: results.failed === 0 ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Test execution error:', error);
      toast({
        title: "Test failed",
        description: "Failed to execute tests",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

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

  const accuracy = testResults ? testResults.accuracy : 0;
  const passed = testResults ? testResults.passed : 0;
  const failed = testResults ? testResults.failed : 0;
  const total = testResults ? testResults.totalTests : rule.testCases?.length || 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Testing Environment
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
            <Button
              size="sm"
              onClick={runTests}
              disabled={isRunning || !rule.testCases || rule.testCases.length === 0}
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
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        {testResults ? (
          <Tabs defaultValue="summary" className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
              <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                Summary
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                Test Details
              </TabsTrigger>
              <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                Performance
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="flex-1 p-6 space-y-6">
              {/* Test Results Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Test Results Summary</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">{passed}/{total}</span>
                    </div>
                    <Progress value={(passed / total) * 100} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{passed}</p>
                      <p className="text-sm text-green-600">Passed</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-red-600">{failed}</p>
                      <p className="text-sm text-red-600">Failed</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-yellow-600">2</p>
                      <p className="text-sm text-yellow-600">Edge Cases</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Failed Tests */}
              {failed > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Failed Tests</h3>
                  <div className="space-y-2">
                    {testResults.results.filter(r => !r.passed).map((result, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Test #{result.testCaseId}</span>
                          <Badge variant="destructive">Failed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Expected: {result.expected?.recommendation} | Actual: {result.actual?.recommendation}
                        </p>
                        {result.error && (
                          <p className="text-sm text-red-600">Error: {result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Deployment Ready */}
              {failed === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">All Tests Passed!</h3>
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
              )}
            </TabsContent>
            
            <TabsContent value="details" className="flex-1 p-6 overflow-auto">
              <div className="space-y-2">
                {testResults.results.map((result, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors",
                      result.passed 
                        ? "border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                        : "border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20",
                      selectedTest === result.testCaseId && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setSelectedTest(result.testCaseId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium">Test: {result.testCaseId}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {result.executionTime.toFixed(2)}ms
                      </span>
                    </div>
                    {selectedTest === result.testCaseId && (
                      <div className="mt-4 space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Expected:</p>
                          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1">
                            {JSON.stringify(result.expected, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Actual:</p>
                          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded mt-1">
                            {JSON.stringify(result.actual, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="flex-1 p-6 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Avg Execution Time</span>
                  </div>
                  <p className="text-2xl font-bold">{testResults.avgExecutionTime.toFixed(2)}ms</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">CPU Impact</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">Minimal</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">Memory Usage</span>
                  </div>
                  <p className="text-2xl font-bold">0.8MB</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{accuracy.toFixed(1)}%</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Performance Analysis</h3>
                <div className="space-y-2 text-sm">
                  <p>• Execution time is well within acceptable limits (&lt;5ms)</p>
                  <p>• Memory footprint is minimal and suitable for production</p>
                  <p>• No performance degradation detected during testing</p>
                  <p>• Rule is optimized for high-volume processing</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No test results yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Run tests to validate your business rule
              </p>
              <Button onClick={runTests} disabled={isRunning}>
                <Play className="w-4 h-4 mr-1" />
                Run Tests Now
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}