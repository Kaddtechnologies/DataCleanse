"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Plus, 
  Library, 
  BarChart3, 
  Rocket,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ConversationalInterface } from '@/components/ai-rule-builder/ConversationalInterface';
import { RuleCodeEditor } from '@/components/ai-rule-builder/RuleCodeEditor';
import { TestingFramework } from '@/components/ai-rule-builder/TestingFramework';
import { DeploymentManager } from '@/components/ai-rule-builder/DeploymentManager';
import { BusinessRule, TestResult } from '@/types/business-rules';
import { useToast } from '@/hooks/use-toast';

export function BusinessRulesTab() {
  const [activeView, setActiveView] = useState<'create' | 'library' | 'metrics'>('create');
  const [currentRule, setCurrentRule] = useState<BusinessRule | undefined>();
  const [testResults, setTestResults] = useState<TestResult | undefined>();
  const [existingRules, setExistingRules] = useState<BusinessRule[]>([]);
  const [ruleStats, setRuleStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    testing: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const response = await fetch('/api/rules/list');
      if (response.ok) {
        const data = await response.json();
        setExistingRules(data.rules || []);
        
        // Calculate stats
        const stats = {
          total: data.rules.length,
          active: data.rules.filter((r: any) => r.status === 'active').length,
          draft: data.rules.filter((r: any) => r.status === 'draft').length,
          testing: data.rules.filter((r: any) => r.status === 'testing').length
        };
        setRuleStats(stats);
      }
    } catch (error) {
      console.error('Error loading rules:', error);
    }
  };

  const handleRuleGenerated = (rule: BusinessRule) => {
    setCurrentRule(rule);
    toast({
      title: "Rule generated",
      description: "Review the generated code and run tests before deployment."
    });
  };

  const handleTestComplete = (results: TestResult) => {
    setTestResults(results);
  };

  const handleSaveRule = async (rule: BusinessRule) => {
    try {
      const response = await fetch('/api/rules/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });

      if (response.ok) {
        toast({
          title: "Rule saved",
          description: "Business rule has been saved to the library."
        });
        loadRules(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save the rule.",
        variant: "destructive"
      });
    }
  };

  const handleDeploy = async (rule: BusinessRule) => {
    // Deployment is handled by the DeploymentManager
    loadRules(); // Refresh after deployment
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">AI Business Rule Builder</h2>
          <p className="text-muted-foreground">
            Create and manage intelligent business rules for deduplication
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={activeView === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveView('create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
          <Button
            variant={activeView === 'library' ? 'default' : 'outline'}
            onClick={() => setActiveView('library')}
          >
            <Library className="w-4 h-4 mr-2" />
            Rule Library
          </Button>
          <Button
            variant={activeView === 'metrics' ? 'default' : 'outline'}
            onClick={() => setActiveView('metrics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Metrics
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rules</p>
                <p className="text-2xl font-bold">{ruleStats.total}</p>
              </div>
              <Library className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{ruleStats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold text-yellow-600">{ruleStats.draft}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Testing</p>
                <p className="text-2xl font-bold text-blue-600">{ruleStats.testing}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {activeView === 'create' && (
        <div className="space-y-6">
          {/* Conversation and Code Editor */}
          <div className="h-[600px]">
            <ConversationalInterface 
              onRuleGenerated={handleRuleGenerated}
              existingRules={existingRules}
            />
          </div>

          {currentRule && (
            <Tabs defaultValue="code" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="code">Code Editor</TabsTrigger>
                <TabsTrigger value="test">Testing</TabsTrigger>
                <TabsTrigger value="deploy">Deployment</TabsTrigger>
              </TabsList>
              
              <TabsContent value="code" className="h-[500px]">
                <RuleCodeEditor
                  rule={currentRule}
                  onTest={() => setActiveView('create')}
                  onSave={handleSaveRule}
                />
              </TabsContent>
              
              <TabsContent value="test" className="h-[500px]">
                <TestingFramework
                  rule={currentRule}
                  onTestComplete={handleTestComplete}
                  onDeploy={() => setActiveView('create')}
                />
              </TabsContent>
              
              <TabsContent value="deploy" className="h-[500px]">
                <DeploymentManager
                  rule={currentRule}
                  testResults={testResults}
                  onDeploy={handleDeploy}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {activeView === 'library' && (
        <Card>
          <CardHeader>
            <CardTitle>Rule Library</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {existingRules.map((rule) => (
                <div key={rule.id} className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{rule.category}</Badge>
                      <Badge 
                        variant={rule.enabled ? 'default' : 'outline'}
                        className={rule.enabled ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {rule.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentRule(rule)}
                  >
                    View
                  </Button>
                </div>
              ))}
              {existingRules.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No rules created yet. Start by creating your first rule.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'metrics' && (
        <Card>
          <CardHeader>
            <CardTitle>Rule Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Performance metrics will be available once rules are deployed and running.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}