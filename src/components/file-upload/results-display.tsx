"use client";

import { Merge, Eye, Brain, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CollapsibleSection } from './collapsible-section';

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

interface ResultsDisplayProps {
  results: DeduplicationResponse;
  className?: string;
}

export function ResultsDisplay({ results, className = '' }: ResultsDisplayProps) {
  if (!results?.results) {
    return null;
  }

  const { kpi_metrics } = results.results;

  return (
    <CollapsibleSection 
      title="Deduplication Results" 
      defaultOpen={true}
      className={className}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Auto Merge</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {kpi_metrics.auto_merge}
                </p>
              </div>
              <Merge className="h-8 w-8 text-green-500 dark:text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">High confidence matches (≥98%)</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Needs Review</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {kpi_metrics.needs_review}
                </p>
              </div>
              <Eye className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Medium confidence matches (90-97%)</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Needs AI Analysis</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {kpi_metrics.needs_ai}
                </p>
              </div>
              <Brain className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Low confidence matches (&lt;90%)</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Duplicates</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {results.results.total_potential_duplicates}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total potential matches found</p>
          </CardContent>
        </Card>
      </div>
    </CollapsibleSection>
  );
}