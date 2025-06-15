"use client";

import { CheckCircle, Clock, XCircle, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CollapsibleSection } from './collapsible-section';
import { useIsMobile } from '@/hooks/use-mobile';

interface DeduplicationKPIMetrics {
  auto_merge: number;
  needs_review: number;
  needs_ai: number;
  total_blocks: number;
}

interface DeduplicationStats {
  high_confidence_duplicates_groups: number;
  medium_confidence_duplicates_groups: number;
  low_confidence_duplicates_groups: number;
  block_stats: {
    total_blocks: number;
    max_block_size: number;
    avg_block_size: number;
    records_in_blocks: number;
  };
  total_master_records_with_duplicates: number;
  total_potential_duplicate_records: number;
}

interface DeduplicationResults {
  duplicate_group_count: number;
  total_potential_duplicates: number;
  kpi_metrics: DeduplicationKPIMetrics;
  stats: DeduplicationStats;
  duplicates?: any[];
}

interface DeduplicationResponse {
  message: string;
  results: DeduplicationResults;
  error: string | null;
  sessionId?: string;
}

// Real-time session statistics interface
interface SessionStats {
  total_pairs: number;
  pending: number;
  duplicate: number;
  not_duplicate: number;
  skipped: number;
  auto_merged: number;
}

interface ResultsDisplayProps {
  results: DeduplicationResponse;
  sessionStats?: SessionStats | null;
  className?: string;
}

export function ResultsDisplay({ results, sessionStats, className = '' }: ResultsDisplayProps) {
  const isMobile = useIsMobile();

  // Render nothing on mobile viewports (<1024 px) per requirements
  if (isMobile || !results?.results) {
    return null;
  }

  // Use real-time session stats if available, otherwise fall back to initial results
  const totalPairs = sessionStats?.total_pairs || results.results.total_potential_duplicates || 0;
  const pendingPairs = sessionStats?.pending || totalPairs;
  const confirmedDuplicates = sessionStats?.duplicate || 0;
  const confirmedUnique = sessionStats?.not_duplicate || 0;
  const skippedPairs = sessionStats?.skipped || 0;
  const autoProcessed = sessionStats?.auto_merged || 0;

  // Calculate review progress
  const reviewedPairs = confirmedDuplicates + confirmedUnique + skippedPairs + autoProcessed;
  const progressPercentage = totalPairs > 0 ? Math.round((reviewedPairs / totalPairs) * 100) : 0;

  return (
    <CollapsibleSection 
      title="Review Progress & Statistics" 
      defaultOpen={true}
      className={className}
    >
      <div className="space-y-6">
        {/* Progress Overview */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200">Review Progress</h4>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <BarChart3 className="w-4 h-4" />
              <span>{reviewedPairs} of {totalPairs} pairs reviewed</span>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {progressPercentage}% complete
          </p>
        </div>

        {/* Real-time Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Pairs Found */}
          <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Pairs Found</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                    {totalPairs}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500 dark:text-purple-400" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Potential duplicates detected</p>
            </CardContent>
          </Card>

          {/* Awaiting Review */}
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Awaiting Review</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {pendingPairs}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500 dark:text-amber-400" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Pairs needing user decision</p>
            </CardContent>
          </Card>

          {/* Confirmed Duplicates */}
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Confirmed Duplicates</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {confirmedDuplicates}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">User-confirmed duplicate pairs</p>
            </CardContent>
          </Card>

          {/* Confirmed Unique */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Confirmed Unique</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {confirmedUnique}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Confirmed as separate entities</p>
            </CardContent>
          </Card>         

          {/* Auto-Processed */}
          {autoProcessed > 0 && (
            <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">System Auto-Processed</p>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                      {autoProcessed}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">High-confidence pairs (≥98%)</p>
              </CardContent>
            </Card>
          )}

          {/* Deferred for Later */}
          {skippedPairs > 0 && (
            <Card className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Deferred</p>
                    <p className="text-2xl font-bold text-slate-700 dark:text-slate-400">
                      {skippedPairs}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Skipped for later review</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}