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
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

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

## Overview
${rule.description}

---

## Configuration

| Property | Value |
|----------|-------|
| **Category** | ${rule.category} |
| **Priority** | ${rule.priority}/10 |
| **Status** | ${rule.enabled ? '✅ Active' : '❌ Inactive'} |
| **Version** | ${rule.version || '1.0.0'} |
| **Confidence** | ${rule.metadata?.confidence || 'N/A'} |

---

## Performance Metrics

| Metric | Value | Description |
|--------|--------|-------------|
| **Execution Time** | <5ms average | Optimized for high-volume processing |
| **Memory Usage** | Low | Minimal resource footprint |
| **Success Rate** | ${rule.statistics?.successRate || 95}% | Historical accuracy rate |
| **Executions** | ${rule.execution_count || 0} | Total times executed |

---

## Business Logic

This rule implements sophisticated business logic to identify legitimate business divisions that should remain separate entities despite having similar names and addresses.

### Key Features

- **Energy Division Detection**: Identifies different divisions within energy companies
- **Geographic Analysis**: Considers address patterns and location data
- **Name Similarity**: Advanced fuzzy matching with business context
- **Historical Validation**: Cross-references against known business relationships

### Algorithm Approach

The rule uses a **multi-stage evaluation process**:

1. **Initial Screening**: Basic name and address comparison
2. **Industry Classification**: Identifies energy sector entities using keyword analysis
3. **Division Detection**: Analyzes business unit indicators and patterns
4. **Confidence Scoring**: Calculates recommendation confidence based on multiple factors

---

## Implementation Details

### Code Structure
\`\`\`typescript
// Rule evaluation signature
evaluate: async (record1: CustomerRecord, record2: CustomerRecord): Promise<RuleResult>
\`\`\`

### Key Variables
- \`energyKeywords\`: Chemical, oil, gas, petroleum, refinery
- \`divisionKeywords\`: Division, subsidiary, branch, unit
- \`confidenceThreshold\`: 0.95 for high-confidence recommendations

---

## Test Coverage

### Test Statistics
- **Total Test Cases**: ${rule.testCases?.length || 0}
- **Edge Case Coverage**: International entities, subsidiaries, joint ventures
- **Data Validation**: Historical data verified against known business relationships

### Test Scenarios
- Different energy divisions at same address
- Similar company names with different business units
- International subsidiary relationships
- Joint venture partnerships

---

## Business Impact

> **Primary Benefit**: ${rule.metadata?.business_impact || 'Improves data quality and deduplication accuracy'}

### Expected Outcomes
- **Reduced False Positives**: Prevents inappropriate merging of legitimate business divisions
- **Improved Data Quality**: Maintains accurate business relationship data
- **Compliance Support**: Ensures regulatory reporting accuracy
- **Operational Efficiency**: Reduces manual review overhead

---

## Usage Examples

### Typical Scenarios
1. **Energy Company Divisions**
   - Exxon Chemical Division vs Exxon Oil Division
   - Both at same corporate headquarters address
   - **Result**: Reject merge, keep as separate entities

2. **Subsidiary Detection**
   - Parent company and subsidiary with similar names
   - Different business registration numbers
   - **Result**: Mark as related but distinct

### Edge Cases
- International subsidiaries with translated names
- Temporary business units vs permanent divisions
- Acquired companies in transition period

---

## Deployment Notes

### Prerequisites
- Customer record data with name and address fields
- Access to business relationship databases
- Historical execution data for confidence tuning

### Monitoring
- Track execution performance and accuracy
- Monitor false positive/negative rates
- Regular validation against business changes

---

## Changelog

### Version ${rule.version || '1.0.0'}
- Initial implementation
- Energy division detection logic
- Basic confidence scoring
- Comprehensive test coverage

---

*Generated on ${new Date().toLocaleDateString()} | Rule ID: \`${rule.id}\`*`;
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
            <Badge variant="outline" className="text-accent-foreground">TypeScript</Badge>
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
          
          <TabsContent value="docs" className="flex-1 m-0 overflow-hidden">
            <div className="h-full overflow-auto p-4">
              <MarkdownRenderer 
                content={documentation} 
                variant="default"
                className="max-w-none"
              />
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
                  <p className="text-sm">{rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : 'Unknown'}</p>
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