"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Plus, 
  Library, 
  BarChart3, 
  Rocket,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  UserCheck,
  Code,
  TestTube,
  X,
  ChevronRight,
  Activity,
  Calendar,
  User,
  FileText,
  Settings,
  TrendingUp,
  Zap,
  Shield
} from 'lucide-react';
import { ConversationalInterface } from '@/components/ai-rule-builder/ConversationalInterface';
import { RuleCodeEditor } from '@/components/ai-rule-builder/RuleCodeEditor';
import { TestingFramework } from '@/components/ai-rule-builder/TestingFramework';
import { DeploymentManager } from '@/components/ai-rule-builder/DeploymentManager';
import { BusinessRule, TestResult, ApprovalStep } from '@/types/business-rules';
import { useToast } from '@/hooks/use-toast';

export function BusinessRulesTab() {
  const [activeView, setActiveView] = useState<'create' | 'library' | 'metrics'>('create');
  const [currentRule, setCurrentRule] = useState<BusinessRule | undefined>();
  const [testResults, setTestResults] = useState<TestResult | undefined>();
  const [existingRules, setExistingRules] = useState<BusinessRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [ruleStats, setRuleStats] = useState({
    total: 0,
    active: 0,
    draft: 0,
    testing: 0,
    pending_approval: 0
  });

  // New state for improved UX
  const [selectedRuleForDetails, setSelectedRuleForDetails] = useState<BusinessRule | null>(null);
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<BusinessRule | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalRule, setApprovalRule] = useState<BusinessRule | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionRule, setSubmissionRule] = useState<BusinessRule | null>(null);
  const [submissionComments, setSubmissionComments] = useState('');
  const [submissionPriority, setSubmissionPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [submissionLoading, setSubmissionLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    console.log('🔄 BusinessRulesTab: Starting loadRules()');
    setIsLoading(true);
    
    try {
      console.log('📡 BusinessRulesTab: Fetching rules from /api/rules/list');
      const response = await fetch('/api/rules/list');
      console.log('📡 BusinessRulesTab: API response received:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 BusinessRulesTab: API response data:', data);
        const rules = data.rules || [];
        console.log(`📊 BusinessRulesTab: Found ${rules.length} existing rules`);
        
        // If no rules exist, automatically seed predefined rules for demo
        if (rules.length === 0) {
          console.log('📋 BusinessRulesTab: No rules found, seeding predefined rules for demo...');
          setIsSeeding(true);
          
          toast({
            title: "Setting up Demo",
            description: "Loading predefined business rules for demonstration...",
          });
          
          try {
            console.log('🌱 BusinessRulesTab: Calling /api/rules/seed');
            const seedResponse = await fetch('/api/rules/seed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (seedResponse.ok) {
              const seedData = await seedResponse.json();
              console.log('✅ BusinessRulesTab: Successfully seeded rules:', seedData);
              
              toast({
                title: "Demo Rules Loaded! 🎉",
                description: "3 predefined business rules have been loaded: Joint Venture Detection, Energy Division Legitimacy, and Freight Forwarder Exemption.",
              });
              
              setIsSeeding(false);
              setIsLoading(false);
              
              // Reload rules after seeding
              return loadRules();
            } else {
              const errorData = await seedResponse.json();
              console.warn('⚠️ BusinessRulesTab: Failed to seed rules:', errorData);
              toast({
                title: "Seeding Failed",
                description: "Could not load demo rules. You can create your own rules instead.",
                variant: "destructive"
              });
            }
          } catch (seedError) {
            console.error('❌ BusinessRulesTab: Seeding failed with error:', seedError);
            toast({
              title: "Seeding Error",
              description: "Failed to load demo rules. Check console for details.",
              variant: "destructive"
            });
          } finally {
            setIsSeeding(false);
          }
        }
        
        // Map database fields to component interface
        console.log('🔄 BusinessRulesTab: Mapping database fields to component interface');
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
        
        console.log('📋 BusinessRulesTab: Mapped rules:', mappedRules.map(r => ({ id: r.id, name: r.name, status: r.status })));
        setExistingRules(mappedRules);
        
        // Calculate stats
        const stats = {
          total: rules.length,
          active: rules.filter((r: any) => r.status === 'active').length,
          draft: rules.filter((r: any) => r.status === 'draft').length,
          testing: rules.filter((r: any) => r.status === 'testing').length,
          pending_approval: rules.filter((r: any) => r.status === 'pending_approval').length
        };
        console.log('📊 BusinessRulesTab: Calculated stats:', stats);
        setRuleStats(stats);
        
        // If we just loaded rules and we're on create view, switch to library view to show them
        if (mappedRules.length > 0 && activeView === 'create') {
          console.log('📚 BusinessRulesTab: Auto-switching to library view to show loaded rules');
          setActiveView('library');
        }
      } else {
        console.error('❌ BusinessRulesTab: API response not OK:', response.status, response.statusText);
        toast({
          title: "API Error",
          description: `Failed to fetch rules: ${response.status} ${response.statusText}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ BusinessRulesTab: Error loading rules:', error);
      toast({
        title: "Error",
        description: "Failed to load rules from the database. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      console.log('✅ BusinessRulesTab: loadRules() completed');
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
    setSubmissionRule(rule);
    setShowSubmissionDialog(true);
  };

  const handleConfirmSubmission = async () => {
    if (!submissionRule) return;

    setSubmissionLoading(true);
    try {
      const response = await fetch(`/api/rules/${submissionRule.id}/submit-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedBy: 'Current User', // This would come from auth
          reason: submissionComments || 'Rule ready for manager review and production deployment',
          priority: submissionPriority,
          estimatedImpact: submissionRule.execution_count || 0,
          businessJustification: submissionComments,
          submissionTimestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Successfully Submitted! 🚀",
          description: `${submissionRule.name} has been submitted for ${submissionPriority} priority review.`
        });
        setShowSubmissionDialog(false);
        setSubmissionRule(null);
        setSubmissionComments('');
        setSubmissionPriority('medium');
        loadRules(); // Refresh the list
      } else {
        throw new Error('Failed to submit for approval');
      }
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Failed to submit rule for approval. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmissionLoading(false);
    }
  };

  const handleApproveRule = async (approve: boolean) => {
    if (!approvalRule) return;

    try {
      const response = await fetch(`/api/rules/${approvalRule.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: approve,
          comments: approvalComments,
          approvedBy: 'Current User' // This would come from auth
        })
      });

      if (response.ok) {
        toast({
          title: approve ? "Rule approved" : "Rule rejected",
          description: approve 
            ? "Rule has been approved and deployed to production."
            : "Rule has been rejected and sent back for revision."
        });
        setShowApprovalDialog(false);
        setApprovalRule(null);
        setApprovalComments('');
        loadRules(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Action failed",
        description: "Failed to process approval.",
        variant: "destructive"
      });
    }
  };

  const toggleCardExpansion = (ruleId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedCards(newExpanded);
  };

  const formatLastExecuted = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
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
          <div className="h-[600px]">
            <ConversationalInterface 
              onRuleGenerated={handleRuleGenerated}
              existingRules={existingRules}
            />
          </div>

          {/* {currentRule && (
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
          )} */}
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
          
          {(isLoading || isSeeding || existingRules.length === 0) ? (
            <Card>
              <CardContent className="text-center py-16">
                <Library className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                
                {isSeeding ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">Setting Up Demo Rules...</h3>
                    <p className="text-muted-foreground mb-4">
                      Loading 3 predefined business rules for demonstration:
                    </p>
                    <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                      <li>• Joint Venture & Strategic Partnership Detection (94.2% accuracy)</li>
                      <li>• Energy Company Division Legitimacy Detection (96.7% accuracy)</li>
                      <li>• Freight Forwarder & Intermediate Consignee Exemption (98.1% accuracy)</li>
                    </ul>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-muted-foreground">Seeding database...</span>
                    </div>
                  </>
                ) : isLoading ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">Loading Rules...</h3>
                    <p className="text-muted-foreground mb-4">
                      Checking for existing business rules...
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">No Rules Found</h3>
                    <p className="text-muted-foreground mb-4">
                      Demo seeding might have failed. Check the console for details or create a rule manually.
                    </p>
                  </>
                )}
                
                <Button 
                  onClick={() => setActiveView('create')} 
                  variant="outline"
                  disabled={isLoading || isSeeding}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Custom Rule
                </Button>
                
                {!isLoading && !isSeeding && existingRules.length === 0 && (
                  <Button 
                    onClick={() => {
                      console.log('🔄 Manual seed trigger');
                      loadRules();
                    }} 
                    className="ml-2"
                    variant="default"
                  >
                    Retry Loading Demo Rules
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {existingRules.map((rule) => (
                <Card 
                  key={rule.id} 
                  className="group hover:shadow-lg transition-all duration-200 border hover:border-blue-200 dark:hover:border-blue-700"
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {rule.description}
                    </p>
                    
                    {/* Expandable Details Section */}
                    {expandedCards.has(rule.id) && (
                      <div className="space-y-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Author:</span>
                            <p className="font-medium">{rule.author || rule.createdBy || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Executed:</span>
                            <p className="font-medium">{formatLastExecuted(rule.last_executed_at)}</p>
                          </div>
                        </div>
                        
                        {rule.metadata && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Business Impact:</span>
                            <p className="font-medium text-green-600">
                              {(rule.metadata as any).business_impact || 'Improves deduplication accuracy'}
                            </p>
                          </div>
                        )}
                        
                        {rule.ai_generated && (
                          <div className="flex items-center gap-2 text-xs text-purple-600">
                            <Sparkles className="w-3 h-3" />
                            <span>Generated with AI assistance</span>
                          </div>
                        )}
                      </div>
                    )}
                    
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCardExpansion(rule.id)}
                        className="h-6 px-2 text-xs"
                      >
                        {expandedCards.has(rule.id) ? 'Show Less' : 'Show More'}
                        <ChevronRight 
                          className={`w-3 h-3 ml-1 transition-transform ${
                            expandedCards.has(rule.id) ? 'rotate-90' : ''
                          }`} 
                        />
                      </Button>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {rule.status === 'draft' ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setSelectedRuleForEdit(rule)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleSubmitForApproval(rule)}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Submit
                          </Button>
                        </div>
                      ) : rule.status === 'pending_approval' ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setApprovalRule(rule);
                              setShowApprovalDialog(true);
                            }}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setSelectedRuleForDetails(rule)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setSelectedRuleForEdit(rule)}
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Configure
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setSelectedRuleForDetails(rule)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </Button>
                        </div>
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

      {/* Rule Details Slide-out Panel */}
      <Sheet open={!!selectedRuleForDetails} onOpenChange={() => setSelectedRuleForDetails(null)}>
        <SheetContent className="w-[600px] sm:w-[800px] max-w-[90vw]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Rule Details
            </SheetTitle>
            <SheetDescription>
              {selectedRuleForDetails?.name}
            </SheetDescription>
          </SheetHeader>
          
          {selectedRuleForDetails && (
            <ScrollArea className="h-[calc(100vh-120px)] mt-6">
              <div className="space-y-6">
                {/* Status and Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      <Badge 
                        variant={selectedRuleForDetails.enabled ? 'default' : 'secondary'}
                        className={selectedRuleForDetails.enabled ? 'bg-green-500 text-white' : ''}
                      >
                        {selectedRuleForDetails.status || (selectedRuleForDetails.enabled ? 'Active' : 'Draft')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Accuracy</Label>
                    <div className="mt-1 text-2xl font-bold text-blue-600">
                      {selectedRuleForDetails.accuracy ? `${selectedRuleForDetails.accuracy}%` : 'N/A'}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {selectedRuleForDetails.description}
                  </p>
                </div>

                {/* Performance Metrics */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Performance Metrics</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="text-xs text-muted-foreground">Executions</div>
                            <div className="text-lg font-semibold">{selectedRuleForDetails.execution_count || 0}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <div>
                            <div className="text-xs text-muted-foreground">Avg Time</div>
                            <div className="text-lg font-semibold">
                              {selectedRuleForDetails.avg_execution_time ? `${selectedRuleForDetails.avg_execution_time}ms` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <div>
                            <div className="text-xs text-muted-foreground">Success Rate</div>
                            <div className="text-lg font-semibold">
                              {selectedRuleForDetails.accuracy ? `${selectedRuleForDetails.accuracy}%` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Rule Code */}
                {selectedRuleForDetails.rule_code && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Rule Implementation</Label>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                          <code>{selectedRuleForDetails.rule_code}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Metadata */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Metadata</Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created by:</span>
                      <p className="font-medium">{selectedRuleForDetails.author || selectedRuleForDetails.createdBy || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Version:</span>
                      <p className="font-medium">v{selectedRuleForDetails.version || '1.0.0'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last executed:</span>
                      <p className="font-medium">{formatLastExecuted(selectedRuleForDetails.last_executed_at)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rule type:</span>
                      <p className="font-medium">{selectedRuleForDetails.rule_type || selectedRuleForDetails.category || 'Custom'}</p>
                    </div>
                  </div>
                </div>

                {/* AI Generation Info */}
                {selectedRuleForDetails.ai_generated && (
                  <div>
                    <Label className="text-sm font-medium mb-3 block">AI Generation</Label>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                          <Sparkles className="w-4 h-4" />
                          <span className="font-medium">Generated with AI assistance</span>
                        </div>
                        {(selectedRuleForDetails.metadata as any)?.business_impact && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Business Impact:</strong> {(selectedRuleForDetails.metadata as any).business_impact}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Rule Dialog */}
      <Dialog open={!!selectedRuleForEdit} onOpenChange={() => setSelectedRuleForEdit(null)}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md md:max-w-4xl lg:max-w-7xl h-[95vh] sm:h-[90vh] md:h-[85vh] p-0 gap-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                Edit Rule: {selectedRuleForEdit?.name}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Modify rule configuration and test changes before deployment.
              </DialogDescription>
            </DialogHeader>
            
            {selectedRuleForEdit && (
              <div className="flex-1 overflow-hidden min-h-0">
                <Tabs defaultValue="config" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 mx-4 sm:mx-6 mt-4 shrink-0">
                    <TabsTrigger value="config" className="text-xs sm:text-sm">Config</TabsTrigger>
                    <TabsTrigger value="code" className="text-xs sm:text-sm">Code</TabsTrigger>
                    <TabsTrigger value="test" className="text-xs sm:text-sm">Test</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4 sm:pb-6 min-h-0">
                    <TabsContent value="config" className="h-full mt-4 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
                      <ScrollArea className="flex-1 w-full pr-2 sm:pr-4">
                        <div className="space-y-4 sm:space-y-6 pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <Label htmlFor="ruleName" className="text-sm sm:text-base font-medium">Rule Name</Label>
                              <Input 
                                id="ruleName" 
                                value={selectedRuleForEdit.name} 
                                readOnly 
                                className="mt-2 h-10 sm:h-12 text-sm sm:text-base"
                              />
                            </div>
                            <div>
                              <Label htmlFor="ruleCategory" className="text-sm sm:text-base font-medium">Category</Label>
                              <Input 
                                id="ruleCategory" 
                                value={selectedRuleForEdit.rule_type || selectedRuleForEdit.category} 
                                readOnly 
                                className="mt-2 h-10 sm:h-12 text-sm sm:text-base"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="ruleDescription" className="text-sm sm:text-base font-medium">Description</Label>
                            <Textarea 
                              id="ruleDescription" 
                              value={selectedRuleForEdit.description} 
                              readOnly 
                              rows={4}
                              className="mt-2 text-sm sm:text-base"
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            <div>
                              <Label className="text-sm sm:text-base font-medium">Accuracy</Label>
                              <div className="mt-2 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                <div className="text-lg sm:text-2xl font-bold text-blue-600">
                                  {selectedRuleForEdit.accuracy ? `${selectedRuleForEdit.accuracy}%` : 'N/A'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm sm:text-base font-medium">Executions</Label>
                              <div className="mt-2 p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                                <div className="text-lg sm:text-2xl font-bold text-green-600">
                                  {selectedRuleForEdit.execution_count || 0}
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm sm:text-base font-medium">Avg Time</Label>
                              <div className="mt-2 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                                <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                                  {selectedRuleForEdit.avg_execution_time ? `${selectedRuleForEdit.avg_execution_time}ms` : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base sm:text-lg">Configuration Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs sm:text-sm text-muted-foreground bg-muted p-3 sm:p-4 rounded-md">
                                Full editing capabilities will be available in the next version. For now, you can view rule details and test configurations.
                                The sandbox environment provides a comprehensive workspace for rule development and testing.
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="code" className="h-full mt-4 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
                      <div className="flex-1 border rounded-lg overflow-hidden">
                        <RuleCodeEditor
                          rule={selectedRuleForEdit}
                          onTest={() => {}}
                          onSave={handleSaveRule}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="test" className="h-full mt-4 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
                      <div className="flex-1 border rounded-lg overflow-hidden">
                        <TestingFramework
                          rule={selectedRuleForEdit}
                          onTestComplete={handleTestComplete}
                          onDeploy={() => {}}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl h-[95vh] sm:h-[90vh] md:h-[85vh] p-0 gap-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                Rule Approval Review
              </DialogTitle>
              <DialogDescription className="text-sm">
                Review and approve or reject: {approvalRule?.name}
              </DialogDescription>
            </DialogHeader>
            
            {approvalRule && (
              <>
                <div className="flex-1 overflow-hidden min-h-0">
                  <ScrollArea className="h-full w-full">
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-4">
                      <div>
                        <Label className="text-sm sm:text-base font-medium mb-3 block">Rule Overview</Label>
                        <Card>
                          <CardContent className="p-3 sm:p-6">
                            <div className="space-y-3 sm:space-y-4">
                              <div>
                                <h3 className="text-base sm:text-lg font-semibold">{approvalRule.name}</h3>
                                <p className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed">
                                  {approvalRule.description}
                                </p>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 sm:gap-3">
                                <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                                  {approvalRule.rule_type || approvalRule.category}
                                </Badge>
                                <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                                  {approvalRule.accuracy ? `${approvalRule.accuracy}% accuracy` : 'New rule'}
                                </Badge>
                                {approvalRule.ai_generated && (
                                  <Badge variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-1">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI Generated
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <Label className="text-sm sm:text-base font-medium mb-3 block">Performance Metrics</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          <Card>
                            <CardContent className="p-3 sm:p-4 text-center">
                              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                                {approvalRule.accuracy ? `${approvalRule.accuracy}%` : 'N/A'}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Accuracy</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-3 sm:p-4 text-center">
                              <div className="text-lg sm:text-2xl font-bold text-green-600">
                                {approvalRule.execution_count || 0}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Executions</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="p-3 sm:p-4 text-center">
                              <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                                {approvalRule.avg_execution_time ? `${approvalRule.avg_execution_time}ms` : 'N/A'}
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Avg Time</div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {approvalRule.rule_code && (
                        <div>
                          <Label className="text-sm sm:text-base font-medium mb-3 block">Rule Implementation</Label>
                          <Card>
                            <CardContent className="p-3 sm:p-4">
                              <pre className="text-xs bg-muted p-3 sm:p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                                <code>{approvalRule.rule_code}</code>
                              </pre>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="approvalComments" className="text-sm sm:text-base font-medium">
                          Approval Comments
                        </Label>
                        <Textarea
                          id="approvalComments"
                          placeholder="Add your review comments, concerns, or approval conditions..."
                          value={approvalComments}
                          onChange={(e) => setApprovalComments(e.target.value)}
                          rows={4}
                          className="mt-3 text-sm sm:text-base"
                        />
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                          Your comments will be recorded and shared with the rule author.
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Fixed footer with approval buttons */}
                <div className="border-t p-4 sm:p-6 bg-muted/30 shrink-0">
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <Button variant="outline" onClick={() => setShowApprovalDialog(false)} size="sm" className="sm:size-lg">
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleApproveRule(false)}
                      size="sm"
                      className="sm:size-lg"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject Rule
                    </Button>
                    <Button onClick={() => handleApproveRule(true)} size="sm" className="sm:size-lg">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve & Deploy
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rule Submission Dialog */}
      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl h-[95vh] sm:h-[90vh] md:h-[85vh] p-0 gap-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
                Submit Rule for Approval
              </DialogTitle>
              <DialogDescription className="text-sm">
                Submit "{submissionRule?.name}" to the MDM approval workflow
              </DialogDescription>
            </DialogHeader>
            
            {submissionRule && (
              <>
                <div className="flex-1 overflow-hidden min-h-0">
                  <ScrollArea className="h-full w-full">
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-4">
                    {/* Rule Overview Card - Single cohesive section */}
                    <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                              {submissionRule.name}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                              {submissionRule.description}
                            </p>
                          </div>
                          {submissionRule.ai_generated && (
                            <div className="ml-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-700">
                              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 text-sm font-medium">
                                <Sparkles className="w-4 h-4" />
                                AI-Generated
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium mb-1">Accuracy</div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {submissionRule.accuracy ? `${submissionRule.accuracy}%` : 'N/A'}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400 font-medium mb-1">Executions</div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {submissionRule.execution_count || 0}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                            <div className="text-xs uppercase tracking-wide text-yellow-600 dark:text-yellow-400 font-medium mb-1">Avg Time</div>
                            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                              {submissionRule.avg_execution_time ? `${submissionRule.avg_execution_time}ms` : 'N/A'}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                            <div className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-400 font-medium mb-1">Category</div>
                            <div className="text-sm font-bold text-purple-700 dark:text-purple-300 capitalize">
                              {submissionRule.rule_type || submissionRule.category || 'Custom'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Workflow Section - Connected visually */}
                    <div className="relative">
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-green-200 to-purple-200 dark:from-blue-700 dark:via-green-700 dark:to-purple-700"></div>
                      
                      <h4 className="text-lg font-semibold mb-6 text-slate-800 dark:text-slate-200">
                        MDM Approval Workflow
                      </h4>
                      
                      <div className="space-y-4 relative">
                        <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl border border-blue-200 dark:border-blue-800 relative z-10">
                          <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 shadow-lg">1</div>
                          <div className="flex-1">
                            <div className="font-semibold text-blue-900 dark:text-blue-100">Technical Review</div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">Code quality and performance validation</div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">2-4 hours</Badge>
                        </div>
                        
                        <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl border border-green-200 dark:border-green-800 relative z-10">
                          <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 shadow-lg">2</div>
                          <div className="flex-1">
                            <div className="font-semibold text-green-900 dark:text-green-100">Business Review</div>
                            <div className="text-sm text-green-700 dark:text-green-300">Business impact and compliance check</div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">1-2 days</Badge>
                        </div>
                        
                        <div className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl border border-purple-200 dark:border-purple-800 relative z-10">
                          <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 shadow-lg">3</div>
                          <div className="flex-1">
                            <div className="font-semibold text-purple-900 dark:text-purple-100">Production Deployment</div>
                            <div className="text-sm text-purple-700 dark:text-purple-300">Automated deployment to MDM system</div>
                          </div>
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">30 minutes</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Configuration Section - Unified card */}
                    <Card className="border-slate-200 dark:border-slate-800">
                      <CardHeader>
                        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          Submission Configuration
                        </h4>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="submissionPriority" className="text-base font-medium text-slate-700 dark:text-slate-300">
                              Priority Level
                            </Label>
                            <Select value={submissionPriority} onValueChange={(value: any) => setSubmissionPriority(value)}>
                              <SelectTrigger className="mt-2 h-12 border-2 border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder="Select priority level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <span>Low Priority - Standard review cycle</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Medium Priority - Normal processing</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="high">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>High Priority - Expedited review</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="critical">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span>Critical - Emergency deployment</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-base font-medium text-slate-700 dark:text-slate-300">Estimated Impact</Label>
                            <div className="mt-2 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Records Affected</div>
                              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {submissionRule.execution_count ? `~${(submissionRule.execution_count * 2.3).toLocaleString()}` : '~0'}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Based on historical execution patterns
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="submissionComments" className="text-base font-medium text-slate-700 dark:text-slate-300">
                            Business Justification & Comments
                          </Label>
                          <Textarea
                            id="submissionComments"
                            placeholder="Provide business justification, expected benefits, deployment timeline, or any special considerations for this rule..."
                            value={submissionComments}
                            onChange={(e) => setSubmissionComments(e.target.value)}
                            rows={4}
                            className="mt-3 text-base border-2 border-slate-200 dark:border-slate-700"
                          />
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Help reviewers understand the business value and urgency of this rule deployment.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Compliance Notice - Final connected element */}
                    <Card className="border-orange-300 dark:border-orange-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                          <div>
                            <div className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                              MDM Compliance Notice
                            </div>
                            <div className="text-sm text-orange-700 dark:text-orange-300 leading-relaxed">
                              By submitting this rule, you confirm it meets Flowserve MDM standards, 
                              has been tested for data quality impact, and aligns with business requirements. 
                              All submissions are audited for compliance and governance.
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Fixed footer with submit buttons */}
                <div className="border-t p-4 sm:p-6 bg-muted/30 shrink-0">
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowSubmissionDialog(false)} 
                      size="sm"
                      className="sm:size-lg"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleConfirmSubmission}
                      disabled={submissionLoading || !submissionComments.trim() || !submissionPriority}
                      size="sm"
                      className="sm:size-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {submissionLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 mr-2" />
                          Submit for Approval
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}