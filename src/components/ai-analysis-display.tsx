"use client";

import React, { useEffect, useState } from 'react';
import type { CustomerRecord } from '@/types';
import { analyzeDuplicateConfidence, type AnalyzeDuplicateConfidenceOutput } from '@/ai/flows/analyze-duplicate-confidence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Badge } from './ui/badge';

interface AiAnalysisDisplayProps {
  record1: CustomerRecord;
  record2: CustomerRecord;
  fuzzyScore: number;
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


export function AiAnalysisDisplay({ record1, record2, fuzzyScore }: AiAnalysisDisplayProps) {
  const [analysis, setAnalysis] = useState<AnalyzeDuplicateConfidenceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      setIsLoading(true);
      setError(null);
      try {
        const transformedRecord1 = transformRecord(record1);
        const transformedRecord2 = transformRecord(record2);
        
        const result = await analyzeDuplicateConfidence({
          record1: transformedRecord1,
          record2: transformedRecord2,
          fuzzyScore,
        });
        setAnalysis(result);
      } catch (err) {
        console.error("AI Analysis Error:", err);
        setError("Failed to load AI analysis. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    if (record1 && record2 && fuzzyScore) {
      fetchAnalysis();
    }
  }, [record1, record2, fuzzyScore]);

  if (isLoading) {
    return (
      <Card className="bg-secondary/30 border-secondary/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="w-5 h-5 mr-2 text-secondary-foreground/80" />
            AI Confidence Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
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
            AI Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null; 
  }
  
  const confidenceColor = analysis.confidenceLevel.toLowerCase() === 'high' ? 'bg-green-500' : 
                         analysis.confidenceLevel.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-red-500';


  return (
    <Card className="bg-secondary/30 border-secondary/50 shadow-inner">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          {analysis.confidenceLevel.toLowerCase() === 'high' && <CheckCircle className="w-5 h-5 mr-2 text-green-600" />}
          {analysis.confidenceLevel.toLowerCase() === 'medium' && <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />}
          {analysis.confidenceLevel.toLowerCase() === 'low' && <XCircle className="w-5 h-5 mr-2 text-red-600" />}
          AI Confidence Analysis
        </CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 mt-1">
            <span>Match Confidence:</span>
            <Badge 
              className={`${confidenceColor} text-white font-medium px-3 py-0.5`}
              variant="secondary"
            >
              {analysis.confidenceLevel} ({(fuzzyScore * 100).toFixed(0)}%)
            </Badge>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* What Section */}
          <div className="bg-background/50 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold flex items-center mb-2">
              <Info className="w-4 h-4 mr-2 text-primary" />
              What We Found
            </h3>
            <p className="text-sm text-muted-foreground">
              {analysis.what || "Analysis of key differences between records."}
            </p>
          </div>

          {/* Why Section */}
          <div className="bg-background/50 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold flex items-center mb-2">
              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
              Why This Matters
            </h3>
            <p className="text-sm text-muted-foreground">
              {analysis.why || analysis.reasoning}
            </p>
          </div>

          {/* Recommendation Section */}
          <div className="bg-background/50 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold flex items-center mb-2">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              Recommended Action
            </h3>
            <p className="text-sm text-muted-foreground">
              {analysis.recommendation || "Based on our analysis, we recommend reviewing the highlighted differences before making a decision."}
            </p>
          </div>

          {/* Confidence Change Section - Only show if there's a change */}
          {analysis.confidenceChange && (
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h3 className="text-sm font-semibold flex items-center mb-2">
                <Info className="w-4 h-4 mr-2 text-primary" />
                Confidence Update
              </h3>
              <p className="text-sm text-primary-foreground/80">
                {analysis.confidenceChange}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Add a notification message below the AI analysis card
export function AiAnalysisNotification() {
  return (
    <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-md text-center">
      <p className="text-sm">
        <Info className="w-4 h-4 inline-block mr-2" />
        Click the <strong>Review</strong> button on any potential duplicate to see detailed AI analysis and explanation.
      </p>
    </div>
  );
}

// Helper XCircle, remove if already globally available or use lucide-react
const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

