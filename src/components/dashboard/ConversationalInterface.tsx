"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  Code, 
  FileText,
  Loader2,
  Info,
  ArrowRight,
  Save,
  TestTube,
  Play
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    ruleGenerated?: boolean;
    ruleCode?: string;
    confidence?: number;
    examples?: string[];
  };
}

interface GeneratedRule {
  name: string;
  description: string;
  category: string;
  priority: number;
  confidenceAdjustment: number;
  patterns: string[];
  code: string;
  testCases: Array<{
    input: any;
    expectedOutput: any;
  }>;
}

export function ConversationalInterface() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Hi! I\'m your AI Rule Builder assistant. Describe the business rule you want to create in plain English, and I\'ll help you build it. For example: "I want to flag records where companies have the same address but different names as potential duplicates."',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedRule, setGeneratedRule] = useState<GeneratedRule | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = processUserInput(input);
      setMessages(prev => [...prev, response]);
      setIsProcessing(false);
    }, 2000);
  };

  const processUserInput = (userInput: string): Message => {
    const lowerInput = userInput.toLowerCase();
    
    // Check for rule creation intents
    if (lowerInput.includes('same address') && lowerInput.includes('different name')) {
      const rule: GeneratedRule = {
        name: 'Same Address Different Company',
        description: 'Flags records with identical addresses but significantly different company names',
        category: 'Geographic Analysis',
        priority: 7,
        confidenceAdjustment: -30,
        patterns: ['same_address', 'different_names', 'shared_building'],
        code: generateRuleCode('sameAddressDifferentCompany'),
        testCases: [
          {
            input: { 
              record1: { name: 'ABC Corp', address: '123 Main St' },
              record2: { name: 'XYZ Inc', address: '123 Main St' }
            },
            expectedOutput: { flag: true, confidence: 'low' }
          }
        ]
      };
      
      setGeneratedRule(rule);
      
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I've created a rule based on your requirements:

**Rule Name:** ${rule.name}
**Category:** ${rule.category}
**Priority:** ${rule.priority}/10
**Confidence Adjustment:** ${rule.confidenceAdjustment}%

This rule will identify records that share the same physical address but have significantly different company names. This often indicates separate businesses operating from the same location (like a business center or shared building).

Would you like to:
1. Test this rule with sample data
2. Modify the confidence adjustment
3. Add additional conditions
4. Save this rule to your library`,
        timestamp: new Date(),
        metadata: {
          ruleGenerated: true,
          ruleCode: rule.code,
          confidence: rule.priority
        }
      };
    }
    
    // Check for modification intents
    if (lowerInput.includes('increase confidence') || lowerInput.includes('decrease confidence')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'I understand you want to adjust the confidence score. The current adjustment is -30%, meaning this rule reduces the duplicate confidence score when triggered. Would you like to change it to a different value? For example, -50% for stronger reduction or -10% for weaker reduction.',
        timestamp: new Date()
      };
    }
    
    // Default response with suggestions
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: `I can help you create various types of business rules. Here are some examples:

• **Joint Venture Detection**: "Flag records that might be joint ventures between two companies"
• **Test Account Filtering**: "Exclude records that appear to be test accounts"
• **Freight Forwarder Identification**: "Identify freight forwarders and logistics companies"
• **Acquisition Detection**: "Find companies that may have been acquired or merged"
• **Data Quality Rules**: "Flag records with missing critical information"

What type of rule would you like to create?`,
      timestamp: new Date()
    };
  };

  const generateRuleCode = (ruleName: string): string => {
    return `// Auto-generated rule: ${ruleName}
export function ${ruleName}(record1: Record<string, any>, record2: Record<string, any>): RuleResult {
  const addr1 = normalizeAddress(record1.address || '');
  const addr2 = normalizeAddress(record2.address || '');
  const name1 = record1.name || record1.customer_name || '';
  const name2 = record2.name || record2.customer_name || '';
  
  // Check if addresses match
  if (addr1 === addr2 && addr1 !== '') {
    // Calculate name similarity
    const nameSimilarity = calculateNameSimilarity(name1, name2);
    
    if (nameSimilarity < 0.5) {
      return {
        match: true,
        confidence: 'low',
        confidenceAdjustment: -30,
        reasoning: 'Same address but different company names',
        flags: ['shared_address', 'different_entities']
      };
    }
  }
  
  return { match: false };
}`;
  };

  const handleTestRule = () => {
    setShowTestResults(true);
    toast({
      title: "Test Started",
      description: "Running rule against test dataset...",
    });
    
    // Simulate test results
    setTimeout(() => {
      toast({
        title: "Test Complete",
        description: "Rule executed successfully on 100 test cases",
      });
    }, 1500);
  };

  const handleSaveRule = () => {
    if (!generatedRule) return;
    
    toast({
      title: "Rule Saved",
      description: `"${generatedRule.name}" has been added to your rule library`,
    });
    
    // Reset state
    setGeneratedRule(null);
    setShowTestResults(false);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'system',
      content: 'Rule saved successfully! You can create another rule or check your rule library to see all active rules.',
      timestamp: new Date()
    }]);
  };

  const examplePrompts = [
    "Create a rule to identify joint ventures between companies",
    "Flag test accounts that shouldn't be merged",
    "Detect companies that might have been acquired",
    "Identify freight forwarders for special handling"
  ];

  return (
    <div className="space-y-4">
      {/* Main Chat Interface */}
      <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            AI Rule Builder
          </CardTitle>
          <CardDescription>
            Describe your business logic in plain English and I'll create the rule for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Example Prompts */}
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInput(prompt)}
                className="text-xs"
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                {prompt}
              </Button>
            ))}
          </div>

          {/* Chat Messages */}
          <ScrollArea className="h-[400px] pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                        : message.type === 'assistant'
                        ? 'bg-muted'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                    }`}
                  >
                    {message.type === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">AI Assistant</span>
                      </div>
                    )}
                    {message.type === 'system' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4" />
                        <span className="font-medium">System</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    {message.metadata?.ruleGenerated && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="secondary" onClick={handleTestRule}>
                          <TestTube className="w-3 h-3 mr-1" />
                          Test Rule
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleSaveRule}>
                          <Save className="w-3 h-3 mr-1" />
                          Save Rule
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Describe your business rule..."
              className="flex-1"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isProcessing}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Rule Preview */}
      {generatedRule && (
        <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
          <CardHeader>
            <CardTitle>Generated Rule Preview</CardTitle>
            <CardDescription>{generatedRule.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="test">Test Results</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <p className="text-sm text-muted-foreground">{generatedRule.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <p className="text-sm text-muted-foreground">{generatedRule.priority}/10</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confidence Adjustment</label>
                    <p className="text-sm text-muted-foreground">{generatedRule.confidenceAdjustment}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Patterns</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generatedRule.patterns.map((pattern, index) => (
                        <Badge key={index} variant="secondary">{pattern}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="code">
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-xs overflow-x-auto">
                    <code>{generatedRule.code}</code>
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="test">
                {showTestResults ? (
                  <div className="space-y-3">
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        Rule tested successfully on 100 sample record pairs
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium">Matches Found</p>
                        <p className="text-2xl font-bold text-green-600">23</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">False Positives</p>
                        <p className="text-2xl font-bold text-amber-600">2</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Accuracy</p>
                        <p className="text-2xl font-bold text-blue-600">91.3%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Click "Test Rule" to run validation tests</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}