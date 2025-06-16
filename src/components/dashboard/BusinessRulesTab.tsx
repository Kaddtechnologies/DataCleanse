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
    testing: 0,
    pending_approval: 0
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
        const rules = data.rules || [];
        
        // Map database fields to component interface
        const mappedRules = rules.map((rule: any) => ({
          ...rule,
          category: rule.rule_type || rule.category || 'custom',
          // Convert database fields to expected format
          action: rule.actions ? rule.actions[0] : {
            type: 'set-recommendation',
            parameters: { recommendation: 'review', confidence: 'medium' }
          },
          condition: rule.conditions || 'true',
          tags: rule.metadata?.flags || [],
          metadata: {
            ...rule.metadata,
            createdBy: rule.author,
            createdAt: rule.created_at,
            approvalStatus: rule.status === 'active' ? 'approved' : 'draft'
          }
        }));
        
        setExistingRules(mappedRules);
        
        // Calculate stats
        const stats = {
          total: rules.length,
          active: rules.filter((r: any) => r.status === 'active').length,
          draft: rules.filter((r: any) => r.status === 'draft').length,
          testing: rules.filter((r: any) => r.status === 'testing').length,
          pending_approval: rules.filter((r: any) => r.status === 'pending_approval').length
        };
        setRuleStats(stats);
      }
    } catch (error) {
      console.error('Error loading rules:', error);
      toast({
        title: "Error",
        description: "Failed to load rules from the database.",
        variant: "destructive"
      });
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

  const handleSubmitForApproval = async (rule: BusinessRule) => {
    try {
      const response = await fetch(`/api/rules/${rule.id}/submit-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedBy: 'Current User', // This would come from auth
          reason: 'Rule ready for manager review and production deployment'
        })
      });

      if (response.ok) {
        toast({
          title: "Submitted for approval",
          description: "Rule has been submitted to manager for approval."
        });
        loadRules(); // Refresh the list
      } else {
        throw new Error('Failed to submit for approval');
      }
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Failed to submit rule for approval.",
        variant: "destructive"
      });
    }
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
      <div className="grid grid-cols-5 gap-4">
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-orange-600">{ruleStats.pending_approval}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600 opacity-20" />
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Rule Library</h3>
              <p className="text-sm text-muted-foreground">
                Browse and manage your business rules collection
              </p>
            </div>
            <Button onClick={() => setActiveView('create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Rule
            </Button>
          </div>
          
          {existingRules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <Library className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-lg font-medium mb-2">No rules found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first business rule using AI assistance
                </p>
                <Button onClick={() => setActiveView('create')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {existingRules.map((rule) => (
                <Card 
                  key={rule.id} 
                  className="group hover:shadow-lg transition-all duration-200 border hover:border-blue-200 dark:hover:border-blue-700 cursor-pointer"
                  onClick={() => {
                    // Navigate to the business rules page for this specific rule
                    window.open(`/rules-sandbox/library?rule=${rule.id}`, '_blank');
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {rule.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={rule.enabled ? 'default' : 'secondary'}
                            className={rule.enabled ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                          >
                            {rule.status || (rule.enabled ? 'Active' : 'Draft')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rule.rule_type || rule.category || 'Custom'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {rule.accuracy ? `${rule.accuracy}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {rule.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Executions</div>
                        <div className="font-medium">{rule.execution_count || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Time</div>
                        <div className="font-medium">{rule.avg_execution_time ? `${rule.avg_execution_time}ms` : 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>v{rule.version || '1.0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {rule.ai_generated && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span>AI Generated</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {rule.status === 'draft' ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentRule(rule);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitForApproval(rule);
                            }}
                          >
                            Submit for Approval
                          </Button>
                        </>
                      ) : rule.status === 'pending_approval' ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open('/rules-sandbox/approvals', '_blank');
                            }}
                          >
                            View Approval
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/rules-sandbox/library?rule=${rule.id}`, '_blank');
                            }}
                          >
                            View Details
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentRule(rule);
                            }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/rules-sandbox/library?rule=${rule.id}`, '_blank');
                            }}
                          >
                            View Details
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
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