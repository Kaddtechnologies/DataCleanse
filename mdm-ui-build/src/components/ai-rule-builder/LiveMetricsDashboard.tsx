"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart, 
  Cpu,
  Database,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LiveTestMetrics {
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
  successRate: number;
  currentThroughput: number; // tests per second
  estimatedTimeRemaining: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

interface LiveMetricsDashboardProps {
  metrics: LiveTestMetrics;
  isRunning: boolean;
  showDetailedMetrics?: boolean;
}

export function LiveMetricsDashboard({ 
  metrics, 
  isRunning,
  showDetailedMetrics = false 
}: LiveMetricsDashboardProps) {
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getThroughputTrend = (): 'up' | 'down' | 'stable' => {
    // In a real implementation, this would compare with previous throughput
    if (metrics.currentThroughput > 2) return 'up';
    if (metrics.currentThroughput < 1) return 'down';
    return 'stable';
  };

  const MetricCard = ({ 
    icon, 
    title, 
    value, 
    subtitle, 
    color = 'default',
    trend
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: 'default' | 'green' | 'red' | 'yellow' | 'blue';
    trend?: 'up' | 'down' | 'stable';
  }) => (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              color === 'green' && 'text-green-600',
              color === 'red' && 'text-red-600',
              color === 'yellow' && 'text-yellow-600',
              color === 'blue' && 'text-blue-600',
              color === 'default' && 'text-muted-foreground'
            )}>
              {icon}
            </span>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className={cn(
                "text-2xl font-bold",
                color === 'green' && 'text-green-600',
                color === 'red' && 'text-red-600',
                color === 'yellow' && 'text-yellow-600',
                color === 'blue' && 'text-blue-600'
              )}>
                {isRunning && typeof value === 'number' && value === 0 ? (
                  <span className="animate-pulse text-muted-foreground">--</span>
                ) : (
                  value
                )}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {trend && (
            <div className="flex items-center">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
              {trend === 'stable' && <Activity className="w-4 h-4 text-muted-foreground" />}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<CheckCircle className="w-4 h-4" />}
          title="Passed"
          value={metrics.passedTests}
          subtitle={`${metrics.totalTests > 0 ? ((metrics.passedTests / metrics.totalTests) * 100).toFixed(1) : 0}% of total`}
          color="green"
        />
        
        <MetricCard
          icon={<XCircle className="w-4 h-4" />}
          title="Failed"
          value={metrics.failedTests}
          subtitle={`${metrics.totalTests > 0 ? ((metrics.failedTests / metrics.totalTests) * 100).toFixed(1) : 0}% of total`}
          color="red"
        />
        
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          title="Avg Time"
          value={`${metrics.avgExecutionTime.toFixed(2)}ms`}
          subtitle="Per test execution"
          color="blue"
        />
        
        <MetricCard
          icon={<BarChart className="w-4 h-4" />}
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          subtitle="Overall accuracy"
          color={metrics.successRate >= 95 ? 'green' : metrics.successRate >= 80 ? 'yellow' : 'red'}
        />
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Test Progress</h3>
            <Badge variant={isRunning ? "default" : "outline"}>
              {isRunning ? "Running" : "Complete"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold">{metrics.completedTests}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Remaining</p>
              <p className="text-lg font-semibold">{metrics.totalTests - metrics.completedTests}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{metrics.totalTests}</p>
            </div>
          </div>

          {isRunning && metrics.estimatedTimeRemaining > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Estimated time remaining:</span>
                <span className="font-medium">{formatTime(metrics.estimatedTimeRemaining)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Performance Metrics */}
      {showDetailedMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Activity className="w-4 h-4" />}
            title="Throughput"
            value={`${metrics.currentThroughput.toFixed(1)}/s`}
            subtitle="Tests per second"
            color="blue"
            trend={getThroughputTrend()}
          />
          
          <MetricCard
            icon={<Clock className="w-4 h-4" />}
            title="Total Time"
            value={formatTime(metrics.totalExecutionTime)}
            subtitle="Cumulative duration"
            color="default"
          />
          
          <MetricCard
            icon={<Cpu className="w-4 h-4" />}
            title="CPU Usage"
            value={`${metrics.cpuUsage.toFixed(1)}%`}
            subtitle="Current utilization"
            color={metrics.cpuUsage > 80 ? 'red' : metrics.cpuUsage > 60 ? 'yellow' : 'green'}
          />
          
          <MetricCard
            icon={<Database className="w-4 h-4" />}
            title="Memory"
            value={formatBytes(metrics.memoryUsage * 1024 * 1024)}
            subtitle="Current usage"
            color="default"
          />
        </div>
      )}

      {/* Real-time Status */}
      {isRunning && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Tests running in real-time
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Monitor progress and results as they happen
                </p>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Live
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}