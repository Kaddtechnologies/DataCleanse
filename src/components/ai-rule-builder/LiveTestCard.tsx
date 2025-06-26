"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  expectedResult?: any;
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  executionTime: number;
  expected?: any;
  actual?: any;
  error?: string;
}

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';

interface LiveTestCardProps {
  test: TestCase;
  status: TestStatus;
  result?: TestCaseResult;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function LiveTestCard({ 
  test, 
  status, 
  result,
  isExpanded = false,
  onToggleExpand 
}: LiveTestCardProps) {
  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
      case 'running':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Running</Badge>;
      case 'passed':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'error':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCardBorderClass = (status: TestStatus) => {
    switch (status) {
      case 'pending':
        return "border-l-slate-200 opacity-60";
      case 'running':
        return "border-l-blue-500 shadow-sm bg-blue-50/30 dark:bg-blue-950/30";
      case 'passed':
        return "border-l-green-500 bg-green-50/30 dark:bg-green-950/30";
      case 'failed':
        return "border-l-red-500 bg-red-50/30 dark:bg-red-950/30";
      case 'error':
        return "border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/30";
      default:
        return "border-l-slate-200";
    }
  };

  const getProgressIndicator = (status: TestStatus) => {
    if (status !== 'running') return null;

    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
          <Eye className="w-3 h-3" />
          <span>Examining test scenario...</span>
        </div>
        <div className="mt-1 w-full bg-blue-100 dark:bg-blue-900 rounded-full h-1">
          <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    );
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300 border-l-4 cursor-pointer hover:shadow-md",
        getCardBorderClass(status),
        isExpanded && "ring-2 ring-blue-500/20"
      )}
      onClick={onToggleExpand}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {getStatusIcon(status)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{test.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{test.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              {getStatusBadge(status)}
              {result && (
                <div className="text-xs text-muted-foreground">
                  {result.executionTime.toFixed(2)}ms
                </div>
              )}
            </div>
          </div>

          {/* Progress Indicator for Running Tests */}
          {getProgressIndicator(status)}

          {/* Error Display */}
          {status === 'failed' && result?.error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/50 rounded border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Error:</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{result.error}</p>
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && result && (
            <div className="mt-4 space-y-3 pt-3 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Expected Result:</p>
                  <div className="bg-muted p-2 rounded text-xs font-mono">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.expected, null, 2)}
                    </pre>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Actual Result:</p>
                  <div className="bg-muted p-2 rounded text-xs font-mono">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.actual, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>Test ID: <code className="bg-muted px-1 rounded">{result.testCaseId}</code></div>
                <div>Duration: <span className="font-medium">{result.executionTime.toFixed(2)}ms</span></div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}