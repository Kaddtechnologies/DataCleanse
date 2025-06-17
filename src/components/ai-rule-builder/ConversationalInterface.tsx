"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Send, Building2, Truck, MapPin, FileText, Loader2, User, ChevronLeft, ChevronRight, Code, TestTube, Rocket, X } from 'lucide-react';
import { ConversationMessage, BusinessRule } from '@/types/business-rules';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RuleCodeEditor } from './RuleCodeEditor';
import { TestingFramework } from './TestingFramework';
import { DeploymentManager } from './DeploymentManager';

interface ConversationalInterfaceProps {
  onRuleGenerated?: (rule: BusinessRule) => void;
  existingRules?: BusinessRule[];
}

const quickStartTemplates = [
  {
    id: 'joint-venture',
    title: 'Joint Venture Detection',
    description: 'Identify legitimate business partnerships',
    icon: Building2,
    prompt: 'Create a rule to detect joint ventures between companies that share the same address but are legitimate separate entities, like BP-Rosneft joint ventures in the energy sector.'
  },
  {
    id: 'freight-forwarder',
    title: 'Freight Forwarder Exception',
    description: 'Handle logistics companies correctly',
    icon: Truck,
    prompt: 'Create a rule to identify freight forwarders and shipping companies that appear at customer addresses but should not be merged with the actual customers.'
  },
  {
    id: 'geographic-division',
    title: 'Geographic Division Rules',
    description: 'Handle regional business divisions',
    icon: MapPin,
    prompt: 'Create a rule to handle companies that have separate regional divisions operating at the same location, like Shell Chemical vs Shell Oil.'
  },
  {
    id: 'data-quality',
    title: 'Data Quality Check',
    description: 'Validate record completeness',
    icon: FileText,
    prompt: 'Create a rule to flag records with missing critical information that might affect duplicate detection accuracy.'
  }
];

export function ConversationalInterface({ onRuleGenerated, existingRules = [] }: ConversationalInterfaceProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: '1',
      sessionId: 'current',
      role: 'assistant',
      type: 'text',
      content: 'Hello! I\'m here to help you create business rules for deduplication. Tell me about a duplicate scenario you encounter, or choose a quick start template below.',
      timestamp: new Date(),
      metadata: {
        timestamp: new Date().toISOString()
      }
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<BusinessRule | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      sessionId: 'current',
      role: 'user',
      type: 'text',
      content: inputValue.trim(),
      timestamp: new Date(),
      metadata: {
        timestamp: new Date().toISOString()
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsGenerating(true);

    try {
      console.log('🚀 Sending request to AI API...', {
        scenario: userMessage.content.substring(0, 100) + '...',
        existingRules: existingRules.length
      });

      // Call API to generate rule with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Request timeout after 60 seconds');
        controller.abort();
      }, 60000); // 60 second timeout

      const response = await fetch('/api/ai-rules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: userMessage.content,
          context: {
            existingRules: existingRules.length,
            industry: 'Energy', // This could be dynamic
            region: 'Global'
          },
          stewardId: 'current-user', // Get from session
          messages: messages
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('📨 Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📋 API Result:', result);

      // Add AI response - handle both single rule and multiple rules formats
      const aiMessage: ConversationMessage = {
        id: Date.now().toString(),
        sessionId: 'current',
        role: 'assistant',
        type: 'text',
        content: result.summary || result.explanation || 'I\'ve analyzed your scenario and generated business rules. You can review them in the sandbox on the right.',
        timestamp: new Date(),
        metadata: {
          timestamp: new Date().toISOString()
        }
      };

      setMessages(prev => [...prev, aiMessage]);

      // Pass generated rules to parent - handle both single rule and multiple rules
      if (result.rules && result.rules.length > 0) {
        console.log('🔄 Converting generated rule to BusinessRule format...');
        // Convert the first generated rule to BusinessRule format
        const generatedRule = result.rules[0];
        const businessRule: BusinessRule = {
          id: `rule_${Date.now()}`,
          name: generatedRule.ruleName || 'AI Generated Rule',
          description: generatedRule.description || generatedRule.reasoning || 'AI generated business rule',
          category: generatedRule.ruleType || 'business-relationship',
          priority: generatedRule.priority || 5,
          enabled: false,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          createdBy: 'ai-assistant',
          condition: 'true', // This would be generated from conditions
          action: {
            type: 'set-recommendation',
            parameters: {
              recommendation: generatedRule.confidenceImpact?.recommendation || 'review',
              confidence: generatedRule.confidenceImpact?.confidence || 'medium',
              confidenceScore: generatedRule.confidenceImpact?.score || 0.7
            }
          },
          metadata: {
            createdBy: 'ai-assistant',
            createdAt: new Date().toISOString(),
            approvalStatus: 'draft' as const
          },
          tags: generatedRule.flags || []
        };
        console.log('✅ BusinessRule created:', businessRule);
        setCurrentRule(businessRule);
        setSandboxOpen(true);
        if (onRuleGenerated) {
          onRuleGenerated(businessRule);
        }
      } else if (result.rule) {
        // Handle single rule format
        console.log('🔄 Using single rule format');
        setCurrentRule(result.rule);
        setSandboxOpen(true);
        if (onRuleGenerated) {
          onRuleGenerated(result.rule);
        }
      }

      // If AI has insights, add them as additional messages
      if (result.insights && result.insights.length > 0) {
        const insightMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          sessionId: 'current',
          role: 'assistant',
          type: 'text',
          content: `Additional insights:\n• ${result.insights.join('\n• ')}`,
          timestamp: new Date(),
          metadata: {
            timestamp: new Date().toISOString()
          }
        };
        setMessages(prev => [...prev, insightMessage]);
      }

      // If AI has questions, add them
      if (result.questions && result.questions.length > 0) {
        const questionMessage: ConversationMessage = {
          id: (Date.now() + 2).toString(),
          sessionId: 'current',
          role: 'assistant',
          type: 'clarification',
          content: result.questions.join('\n\n'),
          timestamp: new Date(),
          metadata: {
            timestamp: new Date().toISOString()
          }
        };
        setMessages(prev => [...prev, questionMessage]);
      }

    } catch (error) {
      console.error('Error generating rule:', error);
      const errorMessage: ConversationMessage = {
        id: Date.now().toString(),
        sessionId: 'current',
        role: 'system',
        type: 'error',
        content: 'I encountered an error while generating the rule. Please try again or rephrase your request.',
        timestamp: new Date(),
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to generate rule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateClick = (template: typeof quickStartTemplates[0]) => {
    setInputValue(template.prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTestComplete = (results: any) => {
    setTestResults(results);
  };

  const handleSaveRule = async (rule: BusinessRule) => {
    setCurrentRule(rule);
    toast({
      title: "Rule saved",
      description: "Your business rule has been saved successfully.",
    });
  };

  const handleDeploy = async (rule: BusinessRule) => {
    toast({
      title: "Deployment started",
      description: "Your rule is being deployed to production.",
    });
  };

  return (
    <div className="h-full flex">
      {/* Chat Panel */}
      <div className={cn(
        "flex flex-col transition-all duration-300",
        sandboxOpen ? "w-1/2 border-r" : "w-full"
      )}>
        <Card className="h-full flex flex-col bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 rounded-none border-0">
          <CardHeader className="border-b bg-gradient-to-r from-purple-600/10 to-blue-600/10 dark:from-purple-600/20 dark:to-blue-600/20 flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Conversation
            </CardTitle>
            {sandboxOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSandboxOpen(false)}
                className="ml-auto"
              >
                <ChevronRight className="w-4 h-4" />
                Collapse Sandbox
              </Button>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-3",
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : message.role === 'assistant'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-800'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            AI Assistant
                          </span>
                        </div>
                      )}
                      {message.role === 'user' && (
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4" />
                          <span className="text-xs font-medium">You</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Generating rule...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Start Templates */}
            {messages.length === 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Quick Start Templates:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickStartTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <template.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {template.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe your business rule scenario..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                  disabled={isGenerating}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isGenerating}
                    className="self-end"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                  {!sandboxOpen && currentRule && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSandboxOpen(true)}
                      className="text-xs"
                    >
                      <ChevronLeft className="w-3 h-3 mr-1" />
                      Open Sandbox
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sandbox Panel */}
      {sandboxOpen && (
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
            <h2 className="font-semibold flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-600" />
              Rule Sandbox
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSandboxOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {currentRule ? (
              <Tabs defaultValue="code" className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
                  <TabsTrigger value="code" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600">
                    <Code className="w-4 h-4 mr-2" />
                    Code Editor
                  </TabsTrigger>
                  <TabsTrigger value="test" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600">
                    <TestTube className="w-4 h-4 mr-2" />
                    Testing
                  </TabsTrigger>
                  <TabsTrigger value="deploy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600">
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="code" className="flex-1 mt-0 border-0 p-0">
                  <div className="h-full">
                    <RuleCodeEditor
                      rule={currentRule}
                      onTest={() => {}}
                      onSave={handleSaveRule}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="test" className="flex-1 mt-0 border-0 p-0">
                  <div className="h-full">
                    <TestingFramework
                      rule={currentRule}
                      onTestComplete={handleTestComplete}
                      onDeploy={() => {}}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="deploy" className="flex-1 mt-0 border-0 p-0">
                  <div className="h-full">
                    <DeploymentManager
                      rule={currentRule}
                      testResults={testResults}
                      onDeploy={handleDeploy}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <Code className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-medium mb-2">No Rule Generated</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a conversation to generate a business rule and it will appear here for editing and testing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}