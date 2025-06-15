import { BusinessRule, RuleResult } from '@/types/business-rules';
import { CustomerRecord } from '@/types';

export interface RuleExecutionContext {
  sessionId?: string;
  userId?: string;
  timestamp: Date;
  environment: 'development' | 'test' | 'production';
  metadata?: Record<string, any>;
}

export interface RuleStatistics {
  executions: number;
  successes: number;
  failures: number;
  avgExecutionTime: number;
  lastExecuted: Date | null;
  recommendationCounts: {
    merge: number;
    review: number;
    reject: number;
    flag: number;
  };
}

export interface DeduplicationContext extends RuleExecutionContext {
  similarityScore: number;
  blockingMethod?: string;
  matchMethod?: string;
}

export interface DeduplicationResult extends RuleResult {
  appliedRule?: string;
  executionTime: number;
  ruleVersion?: string;
}

export interface RuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performanceEstimate: {
    avgExecutionTime: number;
    memoryUsage: string;
    complexity: 'low' | 'medium' | 'high';
  };
}

export interface RuleDeploymentStatus {
  ruleId: string;
  version: string;
  environment: 'development' | 'test' | 'production';
  deployedAt: Date;
  deployedBy: string;
  status: 'active' | 'inactive' | 'rolling_back';
  previousVersion?: string;
}