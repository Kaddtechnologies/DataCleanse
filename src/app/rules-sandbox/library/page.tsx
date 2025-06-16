"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Search, Filter, MoreHorizontal, Play, Edit, TestTube, CheckCircle, AlertTriangle, Loader2, X } from "lucide-react";

// Test Modal Component
function TestRuleModal({ rule, isOpen, onClose }: { rule: any; isOpen: boolean; onClose: () => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const runTest = async () => {
    setIsRunning(true);
    setTestResults(null);
    
    // Simulate API call to Python backend
    setTimeout(() => {
      const mockResults = {
        passed: Math.floor(Math.random() * 40) + 35,
        total: 45,
        duration: `${(Math.random() * 3 + 1).toFixed(1)}s`,
        accuracy: rule.accuracy + (Math.random() * 2 - 1),
        details: [
          { test: "Joint Venture Detection", status: "passed", time: "0.3s" },
          { test: "Parent Company Validation", status: "passed", time: "0.2s" },
          { test: "Industry Classification", status: "failed", time: "0.1s", error: "Missing SIC code mapping" },
          { test: "Confidence Scoring", status: "passed", time: "0.4s" }
        ]
      };
      setTestResults(mockResults);
      setIsRunning(false);
    }, 3000);
  };

  const handleSubmitForApproval = () => {
    if (confirm("Submit this rule for manager approval? This action cannot be undone.")) {
      alert("Rule submitted for approval. You will be notified when the review is complete.");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TestTube className="w-5 h-5" />
            <span>Test Rule: {rule.name}</span>
          </DialogTitle>
          <DialogDescription>
            Run comprehensive tests on this business rule before deployment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rule Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Current Accuracy:</span>
                  <span className="ml-2 font-semibold text-emerald-600">{rule.accuracy}%</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Version:</span>
                  <span className="ml-2 font-semibold">{rule.version}</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Category:</span>
                  <span className="ml-2 font-semibold">{rule.category}</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Priority:</span>
                  <span className="ml-2 font-semibold">{rule.priority}/10</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Controls */}
          <div className="flex items-center space-x-3">
            <Button 
              onClick={runTest} 
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Full Test Suite
                </>
              )}
            </Button>
            {testResults && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                {testResults.passed}/{testResults.total} Passed
              </Badge>
            )}
          </div>

          {/* Test Results */}
          {testResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400">Tests Passed</div>
                      <div className="text-2xl font-bold text-emerald-600">{testResults.passed}/{testResults.total}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400">Duration</div>
                      <div className="text-2xl font-bold text-blue-600">{testResults.duration}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400">Accuracy</div>
                      <div className="text-2xl font-bold text-emerald-600">{testResults.accuracy.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Test Details</h4>
                    {testResults.details.map((test: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center space-x-2">
                          {test.status === "passed" ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm">{test.test}</span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          {test.time}
                        </div>
                      </div>
                    ))}
                  </div>

                  {testResults.passed === testResults.total && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        All tests passed! This rule is ready for production deployment.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {testResults && testResults.passed === testResults.total && (
            <Button onClick={handleSubmitForApproval} className="bg-emerald-600 hover:bg-emerald-700">
              Submit for Approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RuleLibraryPage() {
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  const rules = [
    {
      id: "joint-venture-detection-001",
      name: "Joint Venture & Strategic Partnership Detection",
      description: "Prevents merging legitimate joint ventures and strategic partnerships that share addresses or have similar naming patterns. Based on real examples like Ruhr Oel GmbH (BP Europa SE + Rosneft JV) and Shell/Solvay partnerships.",
      status: "active",
      version: "1.0",
      accuracy: 94.2,
      lastRun: "2 hours ago",
      category: "Deduplication",
      priority: 9,
      businessImpact: "Prevents incorrect mergers of legitimate business partnerships",
      features: [
        "Detects JV keywords in company names",
        "Validates different parent companies at same address",
        "Industry-specific logic for Oil & Gas, Chemicals, Engineering",
        "Confidence scoring based on name patterns and business context"
      ]
    },
    {
      id: "energy-division-legitimacy-002",
      name: "Energy Company Division Legitimacy Detection",
      description: "Handles legitimate business divisions within energy companies that serve different markets but share facilities. Based on real examples: 'ExxonMobil is both an Oil&Gas company and a Chemical account' and Shell Chemical vs Shell Oil scenarios.",
      status: "active",
      version: "1.1",
      accuracy: 96.7,
      lastRun: "4 hours ago",
      category: "Energy Sector",
      priority: 8,
      businessImpact: "Handles 80% of energy sector duplicates automatically",
      features: [
        "Multi-industry detection for Oil & Gas, Chemicals, Petrochemicals",
        "Division keyword analysis (Chemical, Oil, Petroleum, Exploration)",
        "Same-address validation with different business lines",
        "Parent company extraction and relationship mapping"
      ]
    },
    {
      id: "freight-forwarder-exemption-003",
      name: "Freight Forwarder & Intermediate Consignee Exemption",
      description: "Prevents merging freight forwarders and intermediate consignees with actual customers when they share shipping addresses. Based on real examples of 300+ records with SIC code 470000 and drop-shipment scenarios.",
      status: "active",
      version: "1.0",
      accuracy: 98.1,
      lastRun: "1 hour ago",
      category: "Logistics",
      priority: 7,
      businessImpact: "Eliminates false positives from freight forwarder scenarios",
      features: [
        "SIC code detection (470000 for freight/transportation)",
        "Keyword pattern matching for logistics companies",
        "Drop-shipment address analysis with C/O prefixes",
        "Industry classification validation"
      ]
    },
    {
      id: "customer-validation-rule-004",
      name: "Enhanced Customer Data Validation",
      description: "Advanced validation rules for customer records including name, email, address checks, and data completeness scoring with AI-powered anomaly detection.",
      status: "testing",
      version: "2.1",
      accuracy: 87.3,
      lastRun: "Testing in progress",
      category: "Data Quality",
      priority: 6,
      businessImpact: "Improves data quality by 40% before duplicate detection",
      features: [
        "Multi-field validation with business context",
        "AI-powered anomaly detection",
        "Configurable validation thresholds",
        "Real-time data quality scoring"
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "testing":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "pending":
        return "bg-red-50 text-red-600 border-red-200";
      case "disabled":
        return "bg-slate-50 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "testing":
        return <TestTube className="w-4 h-4" />;
      case "pending":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "text-red-600 font-bold";
    if (priority >= 6) return "text-orange-600 font-semibold";
    return "text-blue-600 font-medium";
  };

  return (
    <div className="space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Rule Library
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {rules.length} business rules • Production ready
            </p>
          </div>
        </div>
        
        {/* Status Summary */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
            ✓ 3 Production
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
            ⚡ 1 Testing
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
            📊 94-98% Accuracy
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Search className="w-4 h-4 mr-2" />
          Search Rules
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
          <Play className="w-4 h-4 mr-2" />
          Run All
        </Button>
      </div>

      {/* Rules Grid - Mobile First */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card
            key={rule.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
          >
            {/* Card Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={`text-xs ${getStatusBadge(rule.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(rule.status)}
                      <span>{rule.status === "active" ? "Live" : rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}</span>
                    </div>
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700">
                    v{rule.version}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-lg font-bold text-emerald-600">{rule.accuracy}%</span>
                  <span className="text-xs text-slate-500">accuracy</span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 leading-tight">
                {rule.name}
              </h3>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {rule.description}
              </p>
            </div>

            {/* Card Content */}
            <div className="p-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Priority {rule.priority}/10
                  </div>
                  <div className="text-xs text-slate-500">{rule.category}</div>
                </div>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {rule.lastRun}
                  </div>
                  <div className="text-xs text-slate-500">Last Run</div>
                </div>
              </div>

              {/* Business Impact */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Business Impact</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">{rule.businessImpact}</div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={rule.status === "testing"}
                  onClick={() => {
                    setSelectedRule(rule);
                    setIsTestModalOpen(true);
                  }}
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  {rule.status === "testing" ? "Testing" : "Test"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Test Modal */}
      {selectedRule && (
        <TestRuleModal
          rule={selectedRule}
          isOpen={isTestModalOpen}
          onClose={() => {
            setIsTestModalOpen(false);
            setSelectedRule(null);
          }}
        />
      )}
    </div>
  );
}