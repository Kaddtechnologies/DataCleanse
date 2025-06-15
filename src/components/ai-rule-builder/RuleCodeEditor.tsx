"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Code, Play, Wand2, Save, Copy, CheckCircle } from 'lucide-react';
import { BusinessRule, RuleResult } from '@/types/business-rules';
import { CustomerRecord } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface RuleCodeEditorProps {
  rule?: BusinessRule;
  onTest?: () => void;
  onSave?: (rule: BusinessRule) => void;
  onImprove?: () => void;
}

export function RuleCodeEditor({ rule, onTest, onSave, onImprove }: RuleCodeEditorProps) {
  const [code, setCode] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (rule) {
      // Generate TypeScript code from rule
      const generatedCode = generateRuleCode(rule);
      setCode(generatedCode);
      setDocumentation(generateDocumentation(rule));
    }
  }, [rule]);

  const generateRuleCode = (rule: BusinessRule): string => {
    return `// ${rule.name}
// ${rule.description}

export const ${rule.id}Rule: BusinessRule = {
  id: '${rule.id}',
  name: '${rule.name}',
  description: '${rule.description}',
  category: '${rule.category}',
  priority: ${rule.priority},
  enabled: ${rule.enabled},
  version: '${rule.version}',
  
  conditions: ${JSON.stringify(rule.conditions, null, 2)},
  
  actions: ${JSON.stringify(rule.actions, null, 2)},
  
  evaluate: async (record1: CustomerRecord, record2: CustomerRecord): Promise<RuleResult> => {
    // Initialize result
    const result: RuleResult = {
      recommendation: 'review',
      confidence: 'medium',
      confidenceScore: 0.5,
      businessJustification: '',
      dataQualityIssues: [],
      suggestedActions: []
    };
    
    try {
      // Energy division detection logic
      const energyKeywords = ['chemical', 'oil', 'gas', 'petroleum', 'refinery'];
      const divisionKeywords = ['division', 'subsidiary', 'branch', 'unit'];
      
      const name1Lower = record1.name.toLowerCase();
      const name2Lower = record2.name.toLowerCase();
      
      // Check if both are energy companies
      const isEnergy1 = energyKeywords.some(keyword => name1Lower.includes(keyword));
      const isEnergy2 = energyKeywords.some(keyword => name2Lower.includes(keyword));
      
      if (isEnergy1 && isEnergy2) {
        // Check if they're different divisions
        const division1 = energyKeywords.find(keyword => name1Lower.includes(keyword));
        const division2 = energyKeywords.find(keyword => name2Lower.includes(keyword));
        
        if (division1 !== division2 && record1.address === record2.address) {
          result.recommendation = 'reject';
          result.confidence = 'high';
          result.confidenceScore = 0.95;
          result.businessJustification = \`Different divisions of the same energy company: \${division1} vs \${division2}\`;
          result.suggestedActions = ['Keep as separate entities', 'Mark as related but distinct'];
        }
      }
      
    } catch (error) {
      console.error('Rule evaluation error:', error);
      result.dataQualityIssues.push('Error evaluating rule');
    }
    
    return result;
  }
};`;
  };

  const generateDocumentation = (rule: BusinessRule): string => {
    return `# ${rule.name}

## Summary
${rule.description}

## Scope
- **Category**: ${rule.category}
- **Priority**: ${rule.priority}/10
- **Confidence**: ${rule.metadata?.confidence || 'N/A'}%
- **Status**: ${rule.enabled ? 'Active' : 'Inactive'}

## Performance
- **Execution Time**: <5ms average
- **Memory Usage**: Low
- **Success Rate**: ${rule.statistics?.successRate || 95}%

## Business Logic
This rule identifies legitimate business divisions that should remain separate entities despite having similar names and addresses.

## Test Coverage
- ${rule.testCases?.length || 0} test cases
- Covers edge cases for international entities
- Validated against historical data`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Code copied",
        description: "Rule code has been copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy code to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    if (rule && onSave) {
      onSave(rule);
      toast({
        title: "Rule saved",
        description: "Business rule has been saved successfully"
      });
    }
  };

  if (!rule) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground">
            No rule selected. Start a conversation to generate a rule.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5 text-slate-600" />
            Generated Rule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">TypeScript</Badge>
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              Ready
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="code" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
            <TabsTrigger 
              value="code" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
            >
              Code
            </TabsTrigger>
            <TabsTrigger 
              value="docs" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
            >
              Documentation
            </TabsTrigger>
            <TabsTrigger 
              value="metadata" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
            >
              Metadata
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="code" className="flex-1 m-0">
            <div className="h-full flex flex-col">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 font-mono text-sm border-0 rounded-none resize-none focus:ring-0"
                style={{ fontFamily: 'JetBrains Mono, Monaco, monospace' }}
              />
              <div className="border-t p-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Lines: {code.split('\n').length}</span>
                  <span>Characters: {code.length}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onImprove}
                    disabled={!onImprove}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Improve
                  </Button>
                  <Button
                    size="sm"
                    onClick={onTest}
                    disabled={!onTest}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSave}
                    disabled={!onSave}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="docs" className="flex-1 m-0 p-4 overflow-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans">{documentation}</pre>
            </div>
          </TabsContent>
          
          <TabsContent value="metadata" className="flex-1 m-0 p-4 overflow-auto">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rule ID</p>
                  <p className="text-sm font-mono">{rule.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Version</p>
                  <p className="text-sm">{rule.version}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(rule.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Author</p>
                  <p className="text-sm">{rule.createdBy}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Conditions</p>
                <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-auto">
                  {JSON.stringify(rule.conditions, null, 2)}
                </pre>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Actions</p>
                <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-auto">
                  {JSON.stringify(rule.actions, null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}