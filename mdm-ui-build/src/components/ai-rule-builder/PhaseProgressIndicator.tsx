"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Brain, 
  Eye, 
  Zap, 
  CheckCircle,
  Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TestPhase = 'idle' | 'thinking' | 'examining' | 'finishing' | 'complete';

export interface TestExecutionPhase {
  phase: TestPhase;
  description: string;
  icon: React.ReactNode;
  estimatedDuration: number;
  color: string;
}

const TEST_PHASES: TestExecutionPhase[] = [
  {
    phase: 'thinking',
    description: 'Analyzing rule logic and preparing test cases...',
    icon: <Brain className="w-4 h-4" />,
    estimatedDuration: 2000,
    color: 'purple'
  },
  {
    phase: 'examining',
    description: 'Executing test cases and evaluating results...',
    icon: <Eye className="w-4 h-4" />,
    estimatedDuration: 5000,
    color: 'blue'
  },
  {
    phase: 'finishing',
    description: 'Compiling results and generating insights...',
    icon: <Zap className="w-4 h-4" />,
    estimatedDuration: 1000,
    color: 'green'
  }
];

interface PhaseProgressIndicatorProps {
  currentPhase: TestPhase;
  progress?: number; // 0-100
  currentTestIndex?: number;
  totalTests?: number;
  estimatedTimeRemaining?: number;
}

export function PhaseProgressIndicator({ 
  currentPhase, 
  progress = 0,
  currentTestIndex = 0,
  totalTests = 0,
  estimatedTimeRemaining
}: PhaseProgressIndicatorProps) {
  const getCurrentPhaseData = () => {
    return TEST_PHASES.find(phase => phase.phase === currentPhase);
  };

  const getPhaseStatus = (phase: TestExecutionPhase) => {
    const currentIndex = TEST_PHASES.findIndex(p => p.phase === currentPhase);
    const phaseIndex = TEST_PHASES.findIndex(p => p.phase === phase.phase);
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'active';
    return 'pending';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const currentPhaseData = getCurrentPhaseData();

  return (
    <div className="space-y-4">
      {/* Main Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {currentPhaseData?.icon && (
              <span className={cn(
                "flex items-center justify-center",
                currentPhase !== 'idle' && currentPhase !== 'complete' && "text-blue-500"
              )}>
                {currentPhase !== 'idle' && currentPhase !== 'complete' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  currentPhaseData.icon
                )}
              </span>
            )}
            <span className="text-sm font-medium">
              {currentPhase === 'idle' && 'Ready to run tests'}
              {currentPhase === 'complete' && 'Tests completed'}
              {currentPhaseData && currentPhase !== 'idle' && currentPhase !== 'complete' && 
                currentPhaseData.description
              }
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {totalTests > 0 && (
              <span>{currentTestIndex}/{totalTests}</span>
            )}
            {estimatedTimeRemaining && (
              <span>~{formatTime(estimatedTimeRemaining)}</span>
            )}
          </div>
        </div>
        <Progress 
          value={progress} 
          className="h-2 transition-all duration-300" 
        />
      </div>

      {/* Phase Indicators */}
      {currentPhase !== 'idle' && (
        <div className="flex items-center justify-center space-x-2 sm:space-x-4">
          {TEST_PHASES.map((phase) => {
            const status = getPhaseStatus(phase);
            return (
              <div
                key={phase.phase}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 border",
                  status === 'active' && "bg-blue-100 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
                  status === 'completed' && "bg-green-100 border-green-200 dark:bg-green-950 dark:border-green-800",
                  status === 'pending' && "bg-muted border-border opacity-60"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center",
                  status === 'active' && "text-blue-600 dark:text-blue-400",
                  status === 'completed' && "text-green-600 dark:text-green-400",
                  status === 'pending' && "text-muted-foreground"
                )}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    phase.icon
                  )}
                </span>
                <span className={cn(
                  "text-sm font-medium capitalize hidden sm:block",
                  status === 'active' && "text-blue-800 dark:text-blue-200",
                  status === 'completed' && "text-green-800 dark:text-green-200",
                  status === 'pending' && "text-muted-foreground"
                )}>
                  {phase.phase}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Current Phase Details */}
      {currentPhaseData && currentPhase !== 'idle' && currentPhase !== 'complete' && (
        <div className="bg-muted/50 p-3 rounded-lg border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current Phase:</span>
              <Badge variant="outline" className="capitalize">
                {currentPhase}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                Est. {formatTime(currentPhaseData.estimatedDuration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { TEST_PHASES };