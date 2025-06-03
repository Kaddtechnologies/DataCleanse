"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { CustomerRecord } from '@/types';
import { type AnalyzeDuplicateConfidenceOutput } from '@/ai/flows/analyze-duplicate-confidence';
import { type SmartAnalysisResult } from '@/ai/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, Info, Target, Shield, AlertCircle, Building2, Globe, Database, Users, XCircle, ChevronDown, ChevronUp, Eye, Brain, Zap } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';

interface AiAnalysisDisplayProps {
  record1: CustomerRecord;
  record2: CustomerRecord;
  fuzzyScore: number;
  analyzeFunction?: (record1: Record<string, string>, record2: Record<string, string>, fuzzyScore: number) => Promise<AnalyzeDuplicateConfidenceOutput>;
  onAnalysisComplete?: (enhancedResults: {
    enhancedConfidence: string;
    enhancedScore: number;
    originalScore: number;
    scoreChangeReason: string;
    lastAnalyzed: string;
  }) => void;
  cachedAnalysis?: AnalyzeDuplicateConfidenceOutput; // Pre-existing cached analysis
  onCacheAnalysis?: (analysis: AnalyzeDuplicateConfidenceOutput) => void; // Callback to cache the analysis
}

// Helper to convert CustomerRecord to Record<string, string> for AI flow
const transformRecord = (record: CustomerRecord): Record<string, string> => {
  const stringRecord: Record<string, string> = {};
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== null && record[key] !== undefined) {
      stringRecord[key] = String(record[key]);
    }
  }
  return stringRecord;
};

// Enhanced inline markdown parser
const parseInlineMarkdown = (text: string): React.ReactNode => {
  // Handle emojis and special patterns first
  text = text.replace(/🔍/g, '🔍').replace(/🧠/g, '🧠').replace(/⚡/g, '⚡').replace(/🎯/g, '🎯');

  // Handle bold text (**text**)
  const boldRegex = /\*\*(.*?)\*\*/g;
  const italicRegex = /\*(.*?)\*/g;
  
  let result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  // Process bold text first
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    result.push(<strong key={match.index} className="font-semibold text-foreground">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  
  // If no bold text found, handle italics
  if (result.length === 0) {
    lastIndex = 0;
    while ((match = italicRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index));
      }
      result.push(<em key={match.index} className="italic text-amber-600 dark:text-amber-400">{match[1]}</em>);
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }
  }
  
  return result.length > 0 ? result : text;
};

// Component to display individual business rules
const BusinessRuleCard = ({ rule }: { rule: any }) => {
  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'business_relationship': return <Building2 className="w-4 h-4" />;
      case 'hierarchy': return <Users className="w-4 h-4" />;
      case 'geographic': return <Globe className="w-4 h-4" />;
      case 'business_type': return <Building2 className="w-4 h-4" />;
      case 'entity_type': return <Users className="w-4 h-4" />;
      case 'data_quality': return <Database className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case 'merge': return 'text-green-700 bg-green-50 border-green-200';
      case 'review': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'reject': return 'text-red-700 bg-red-50 border-red-200';
      case 'flag': return 'text-purple-700 bg-purple-50 border-purple-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getRuleIcon(rule.ruleType)}
          <h4 className="font-medium text-sm capitalize">
            {rule.ruleName.replace(/_/g, ' ')}
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            className={`${getConfidenceColor(rule.confidence)} text-white font-medium px-2 py-0.5 text-xs`}
            variant="secondary"
          >
            {rule.confidence}
          </Badge>
          <Badge 
            className={`${getRecommendationColor(rule.recommendation)} font-medium px-2 py-0.5 text-xs border`}
            variant="outline"
          >
            {rule.recommendation}
          </Badge>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-2">{rule.reasoning}</p>
      
      {rule.businessJustification && (
        <div className="bg-secondary/30 p-2 rounded text-xs text-muted-foreground border-l-2 border-primary">
          <strong>Business Context:</strong> {rule.businessJustification}
        </div>
      )}
      
      {rule.exemptionReason && (
        <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded text-xs text-amber-700 dark:text-amber-300 border-l-2 border-amber-400 mt-2">
          <strong>Exemption:</strong> {rule.exemptionReason}
        </div>
      )}
      
      {rule.flags && rule.flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {rule.flags.map((flag: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs px-1 py-0">
              {flag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export function AiAnalysisDisplay({ record1, record2, fuzzyScore, analyzeFunction, onAnalysisComplete, cachedAnalysis, onCacheAnalysis }: AiAnalysisDisplayProps) {
  const [analysis, setAnalysis] = useState<AnalyzeDuplicateConfidenceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailedRules, setShowDetailedRules] = useState(false);
  const [showRiskFactors, setShowRiskFactors] = useState(false);

  // Use ref to avoid dependency issues with onAnalysisComplete
  const onAnalysisCompleteRef = useRef(onAnalysisComplete);
  useEffect(() => {
    onAnalysisCompleteRef.current = onAnalysisComplete;
  }, [onAnalysisComplete]);

  // Enhanced markdown renderer with better styling - moved inside component
  const renderMarkdown = useCallback((content: string) => {
    if (!content) return null;
    
    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-base font-semibold mt-3 mb-2 text-foreground">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-lg font-bold mt-4 mb-2 text-foreground">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-xl font-bold mt-4 mb-3 text-foreground">{line.slice(2)}</h1>;
        }
        
        // Lists
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 mb-1 text-sm text-muted-foreground list-disc">{parseInlineMarkdown(line.slice(2))}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="ml-4 mb-1 text-sm text-muted-foreground list-decimal">{parseInlineMarkdown(line.replace(/^\d+\. /, ''))}</li>;
        }
        
        // Regular paragraphs
        if (line.trim()) {
          return <p key={index} className="mb-2 text-sm text-muted-foreground leading-relaxed">{parseInlineMarkdown(line)}</p>;
        }
        
        // Empty lines
        return <div key={index} className="mb-1"></div>;
      });
  }, []);

  const fetchAnalysis = useCallback(async () => {
    // If we have cached analysis, use it instead of making an API call
    if (cachedAnalysis) {
      console.log("Using cached AI analysis for this pair");
      setAnalysis(cachedAnalysis);
      setIsLoading(false);
      
      // Still trigger the enhanced analysis callback if needed
      if (onAnalysisCompleteRef.current && cachedAnalysis.smartAnalysis) {
        const smartAnalysis = cachedAnalysis.smartAnalysis as SmartAnalysisResult;
        const originalScore = fuzzyScore * 100;
        const enhancedScore = smartAnalysis.finalConfidenceScore || originalScore;
        const scoreDifference = enhancedScore - originalScore;
        
        let scoreChangeReason = "";
        if (Math.abs(scoreDifference) < 1) {
          scoreChangeReason = "Score unchanged by smart business rules analysis";
        } else if (scoreDifference > 0) {
          scoreChangeReason = `Score enhanced by ${scoreDifference.toFixed(1)} points due to smart business rules (${smartAnalysis.appliedRules.map(r => r.ruleName).join(', ')})`;
        } else {
          scoreChangeReason = `Score reduced by ${Math.abs(scoreDifference).toFixed(1)} points due to smart business rules (${smartAnalysis.appliedRules.map(r => r.ruleName).join(', ')})`;
        }
        
        onAnalysisCompleteRef.current({
          enhancedConfidence: smartAnalysis.finalConfidence,
          enhancedScore: enhancedScore,
          originalScore: originalScore,
          scoreChangeReason: scoreChangeReason,
          lastAnalyzed: new Date().toISOString()
        });
      }
      return;
    }

    if (!analyzeFunction) {
      setError("AI analysis function not available");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching new AI analysis from API");
      const transformedRecord1 = transformRecord(record1);
      const transformedRecord2 = transformRecord(record2);
      
      const result = await analyzeFunction(
        transformedRecord1,
        transformedRecord2,
        fuzzyScore
      );
      
      // Basic validation - check if we have the essential fields
      if (!result || !result.what || !result.why || !result.recommendation) {
        console.log("AI analysis incomplete - Missing fields:", {
          hasResult: !!result,
          hasWhat: !!result?.what,
          hasWhy: !!result?.why,
          hasRecommendation: !!result?.recommendation,
          result: result
        });
        throw new Error("AI analysis returned incomplete results");
      }
      
      // Check if the response is too short or empty (likely indicates a failure)
      const minLength = 10; // Minimum reasonable length for analysis text
      if (result.what.trim().length < minLength || 
          result.why.trim().length < minLength || 
          result.recommendation.trim().length < minLength) {
        console.log("AI analysis too brief - likely failed:", {
          whatLength: result.what.length,
          whyLength: result.why.length,
          recommendationLength: result.recommendation.length
        });
        throw new Error("AI analysis returned insufficient detail");
      }
      
      setAnalysis(result);
      
      // Cache the analysis result
      if (onCacheAnalysis) {
        onCacheAnalysis(result);
      }
      
      // Save enhanced results back to parent component
      if (onAnalysisCompleteRef.current && result.smartAnalysis) {
        const smartAnalysis = result.smartAnalysis as SmartAnalysisResult;
        const originalScore = fuzzyScore * 100;
        const enhancedScore = smartAnalysis.finalConfidenceScore || originalScore;
        const scoreDifference = enhancedScore - originalScore;
        
        let scoreChangeReason = "";
        if (Math.abs(scoreDifference) < 1) {
          scoreChangeReason = "Score unchanged by smart business rules analysis";
        } else if (scoreDifference > 0) {
          scoreChangeReason = `Score enhanced by ${scoreDifference.toFixed(1)} points due to smart business rules (${smartAnalysis.appliedRules.map(r => r.ruleName).join(', ')})`;
        } else {
          scoreChangeReason = `Score reduced by ${Math.abs(scoreDifference).toFixed(1)} points due to smart business rules (${smartAnalysis.appliedRules.map(r => r.ruleName).join(', ')})`;
        }
        
        onAnalysisCompleteRef.current({
          enhancedConfidence: smartAnalysis.finalConfidence,
          enhancedScore: enhancedScore,
          originalScore: originalScore,
          scoreChangeReason: scoreChangeReason,
          lastAnalyzed: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Enhanced AI Analysis Error:", err);
      // More user-friendly error messages
      if (err instanceof Error) {
        if (err.message.includes("incomplete results")) {
          setError("AI analysis incomplete - the system did not provide all required analysis components. Please try again.");
        } else if (err.message.includes("insufficient detail")) {
          setError("AI analysis was too brief - the system may be experiencing issues. Please try again.");
        } else if (err.message.includes("Schema validation failed")) {
          setError("AI analysis format error - the system returned malformed data. Please try again.");
        } else {
          setError("AI analysis temporarily unavailable - please try again or contact support if the issue persists.");
        }
      } else {
        setError("AI analysis temporarily unavailable - please try again or contact support if the issue persists.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [record1, record2, fuzzyScore, analyzeFunction, cachedAnalysis, onCacheAnalysis]);

  useEffect(() => {
    if (record1 && record2 && fuzzyScore) {
      fetchAnalysis();
    }
  }, [record1, record2, fuzzyScore, analyzeFunction]);

  if (isLoading) {
    return (
      <Card className="bg-secondary/30 border-secondary/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Brain className="w-5 h-5 mr-2 text-secondary-foreground/80 animate-pulse" />
            Enhanced AI Analysis
          </CardTitle>
          <CardDescription>Processing with smart business rules...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-destructive">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Enhanced AI Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive-foreground mb-3">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAnalysis}
            disabled={isLoading}
          >
            {isLoading ? "Retrying..." : "Retry Analysis"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null; 
  }
  
  // Prioritize smart analysis confidence over AI confidence when smart analysis confidence is higher
  const smartAnalysis = analysis.smartAnalysis as SmartAnalysisResult;
  let displayConfidenceLevel = analysis.confidenceLevel;
  let displayConfidenceScore = fuzzyScore * 100;
  
  if (smartAnalysis && smartAnalysis.finalConfidenceScore) {
    const aiConfidenceScore = analysis.confidenceLevel.toLowerCase() === 'high' ? 85 : 
                             analysis.confidenceLevel.toLowerCase() === 'medium' ? 70 : 45;
    
    // If smart analysis has higher confidence, use it for display
    if (smartAnalysis.finalConfidenceScore > aiConfidenceScore) {
      if (smartAnalysis.finalConfidenceScore >= 85) {
        displayConfidenceLevel = 'High';
      } else if (smartAnalysis.finalConfidenceScore >= 65) {
        displayConfidenceLevel = 'Medium';
      } else {
        displayConfidenceLevel = 'Low';
      }
      displayConfidenceScore = smartAnalysis.finalConfidenceScore;
    }
  }
  
  const confidenceColor = displayConfidenceLevel.toLowerCase() === 'high' ? 'bg-green-500' : 
                         displayConfidenceLevel.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <Card className="bg-gradient-to-br from-secondary/20 to-primary/5 border-secondary/50 shadow-inner">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          {displayConfidenceLevel.toLowerCase() === 'high' && <CheckCircle className="w-5 h-5 mr-2 text-green-600" />}
          {displayConfidenceLevel.toLowerCase() === 'medium' && <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />}
          {displayConfidenceLevel.toLowerCase() === 'low' && <XCircle className="w-5 h-5 mr-2 text-red-600" />}
          <Brain className="w-5 h-5 mr-2 text-primary" />
          Enhanced AI Analysis
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-2">
              <span>Match Confidence:</span>
              <Badge 
                className={`${confidenceColor} text-white font-medium px-3 py-0.5`}
                variant="secondary"
              >
                {displayConfidenceLevel} ({(displayConfidenceScore).toFixed(0)}%)
              </Badge>
            </div>
            
            {smartAnalysis && (
              <div className="flex items-center gap-2">
                <span>Smart Score:</span>
                <Badge 
                  className="bg-primary text-primary-foreground font-medium px-3 py-0.5"
                  variant="secondary"
                >
                  {displayConfidenceScore}%
                </Badge>
              </div>
            )}

            {analysis.riskFactors && analysis.riskFactors.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-600">{analysis.riskFactors.length} risk factors</span>
              </div>
            )}
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* PRIMARY RECOMMENDATION - Most Important */}
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <h3 className="text-sm font-semibold flex items-center mb-3">
              <Target className="w-4 h-4 mr-2 text-primary" />
              🎯 Recommended Action
            </h3>
            <div className="text-sm">
              {renderMarkdown(analysis.recommendation || "Based on our enhanced analysis, we recommend reviewing the highlighted differences before making a decision.")}
            </div>
          </div>

          {/* WHAT WE FOUND */}
          <div className="bg-background/50 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold flex items-center mb-2">
              <Eye className="w-4 h-4 mr-2 text-blue-600" />
              🔍 What We Found
            </h3>
            <div className="text-sm">
              {renderMarkdown(analysis.what || "Analysis of key differences between records.")}
            </div>
          </div>

          {/* WHY THIS ASSESSMENT */}
          <div className="bg-background/50 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold flex items-center mb-2">
              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
              🧠 Why This Assessment
            </h3>
            <div className="text-sm">
              {renderMarkdown(analysis.why)}
            </div>
          </div>

          {/* BUSINESS CONTEXT */}
          {analysis.businessContext && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                Business Context
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {analysis.businessContext}
              </div>
            </div>
          )}

          {/* EXEMPTION REASONS */}
          {analysis.exemptionReasons && analysis.exemptionReasons.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Shield className="w-4 h-4 mr-2 text-amber-600" />
                Exemption Reasons
              </h3>
              <div className="space-y-1">
                {analysis.exemptionReasons.map((reason, index) => (
                  <div key={index} className="text-sm text-amber-700 dark:text-amber-300 flex items-start">
                    <span className="w-2 h-2 bg-amber-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RISK FACTORS - Collapsible */}
          {analysis.riskFactors && analysis.riskFactors.length > 0 && (
            <Collapsible open={showRiskFactors} onOpenChange={setShowRiskFactors}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-amber-500" />
                    <span className="text-sm font-medium">
                      Risk Factors ({analysis.riskFactors.length})
                    </span>
                  </div>
                  {showRiskFactors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800 mt-2">
                  <div className="flex flex-wrap gap-1">
                    {analysis.riskFactors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="text-xs px-2 py-1 text-red-700 border-red-300">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* DETAILED BUSINESS RULES - Collapsible */}
          {smartAnalysis && smartAnalysis.appliedRules && smartAnalysis.appliedRules.length > 0 && (
            <Collapsible open={showDetailedRules} onOpenChange={setShowDetailedRules}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <div className="flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-sm font-medium">
                      Applied Business Rules ({smartAnalysis.appliedRules.length})
                    </span>
                  </div>
                  {showDetailedRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 mt-3">
                  <Separator />
                  {smartAnalysis.appliedRules.map((rule, index) => (
                    <BusinessRuleCard key={index} rule={rule} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* CONFIDENCE CHANGE */}
          {smartAnalysis && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Info className="w-4 h-4 mr-2 text-indigo-600" />
                Smart Rules Confidence Analysis
              </h3>
              <div className="text-sm text-indigo-700 dark:text-indigo-300">
                {(() => {
                  const originalScore = fuzzyScore * 100;
                  const enhancedScore = smartAnalysis.finalConfidenceScore;
                  const scoreDifference = enhancedScore - originalScore;
                  
                  if (Math.abs(scoreDifference) < 1) {
                    return (
                      <div>
                        <p className="mb-2"><strong>Score Maintained:</strong> {originalScore.toFixed(1)}% → {enhancedScore}%</p>
                        <p>Our smart business rules analysis confirmed the original similarity score. No significant adjustments were needed based on the business context and data quality assessment.</p>
                      </div>
                    );
                  } else if (scoreDifference > 0) {
                    return (
                      <div>
                        <p className="mb-2"><strong>Score Enhanced:</strong> {originalScore.toFixed(1)}% → {enhancedScore}% 
                          <span className="text-green-600 font-semibold"> (+{scoreDifference.toFixed(1)} points)</span>
                        </p>
                        <p className="mb-2">Our smart business rules identified factors that increase confidence in this match:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {smartAnalysis.appliedRules
                            .filter(rule => rule.confidenceScore > 50)
                            .map((rule, index) => (
                              <li key={index} className="text-xs">
                                <strong>{rule.ruleName.replace(/_/g, ' ')}</strong>: {rule.reasoning}
                              </li>
                            ))
                          }
                        </ul>
                      </div>
                    );
                  } else {
                    return (
                      <div>
                        <p className="mb-2"><strong>Score Adjusted Down:</strong> {originalScore.toFixed(1)}% → {enhancedScore}% 
                          <span className="text-red-600 font-semibold"> ({scoreDifference.toFixed(1)} points)</span>
                        </p>
                        <p className="mb-2">Our smart business rules identified factors that reduce confidence in this match:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {smartAnalysis.appliedRules
                            .filter(rule => rule.confidenceScore < 50)
                            .map((rule, index) => (
                              <li key={index} className="text-xs">
                                <strong>{rule.ruleName.replace(/_/g, ' ')}</strong>: {rule.reasoning}
                              </li>
                            ))
                          }
                        </ul>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
          
          {/* LEGACY CONFIDENCE CHANGE - Keep for backward compatibility */}
          {analysis.confidenceChange && !smartAnalysis && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Info className="w-4 h-4 mr-2 text-indigo-600" />
                Confidence Update
              </h3>
              <div className="text-sm text-indigo-700 dark:text-indigo-300">
                {renderMarkdown(analysis.confidenceChange)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced notification component
export function AiAnalysisNotification() {
  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-blue/10 border border-primary/20 rounded-md text-center">
      <p className="text-sm flex items-center justify-center">
        <Brain className="w-4 h-4 inline-block mr-2" />
        Click the <strong>Review</strong> button on any potential duplicate to see enhanced AI analysis with smart business rules and detailed recommendations.
      </p>
    </div>
  );
}