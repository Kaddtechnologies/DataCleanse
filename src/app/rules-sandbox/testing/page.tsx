"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestTube, Play, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

export default function TestingPage() {
  const testResults = [
    {
      id: "test-1",
      ruleName: "Customer Validation",
      status: "passed",
      duration: "2.3s",
      passedTests: 45,
      totalTests: 45,
      lastRun: "2 minutes ago"
    },
    {
      id: "test-2",
      ruleName: "Duplicate Detection",
      status: "failed",
      duration: "1.8s",
      passedTests: 38,
      totalTests: 42,
      lastRun: "5 minutes ago"
    },
    {
      id: "test-3",
      ruleName: "Address Standardization",
      status: "running",
      duration: "1.2s",
      passedTests: 22,
      totalTests: 30,
      lastRun: "Running now"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "failed":
        return "bg-red-50 text-red-600 border-red-200";
      case "running":
        return "bg-blue-50 text-blue-600 border-blue-200";
      default:
        return "bg-yellow-50 text-yellow-600 border-yellow-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <TestTube className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-slate-900 dark:text-white">
              Rule Testing
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Validate and test your business rules
            </p>
          </div>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Play className="w-4 h-4 mr-2" />
          Run All Tests
        </Button>
      </div>

      {/* Testing Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              117
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Across 12 rules
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              105
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              89.7% success rate
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              12
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Need attention
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              1.8s
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Per test execution
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="results" className="space-y-4">
          <div className="space-y-4">
            {testResults.map((result) => (
              <Card
                key={result.id}
                className="border-slate-200/50 dark:border-slate-700/50"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <CardTitle className="text-lg">{result.ruleName}</CardTitle>
                        <CardDescription className="text-sm">
                          Last run: {result.lastRun}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(result.status)}`}
                      >
                        {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-1" />
                        Run
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Test Results
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {result.passedTests}/{result.totalTests}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {Math.round((result.passedTests / result.totalTests) * 100)}% passed
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Duration
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {result.duration}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Execution time
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Actions
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          Debug
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="coverage" className="space-y-4">
          <Card className="border-slate-200/50 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle>Test Coverage</CardTitle>
              <CardDescription>
                Coverage analysis for your business rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Coverage analysis will be available in the next phase
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card className="border-slate-200/50 dark:border-slate-700/50">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Rule execution performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Performance metrics will be available in the next phase
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}