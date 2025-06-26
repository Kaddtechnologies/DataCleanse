import { BusinessRule, RuleResult, DeduplicationResult } from '@/types/business-rules';
import { CustomerRecord } from '@/types';
import { 
  RuleStatistics, 
  DeduplicationContext, 
  RuleDeploymentStatus 
} from './types';

export class RuleExecutionEngine {
  private activeRules: Map<string, BusinessRule> = new Map();
  private ruleStats: Map<string, RuleStatistics> = new Map();
  private deploymentStatus: Map<string, RuleDeploymentStatus> = new Map();

  constructor() {
    // Initialize with any pre-existing rules from database
    this.loadActiveRules();
  }

  private async loadActiveRules() {
    try {
      const response = await fetch('/api/rules/active');
      if (response.ok) {
        const rules = await response.json();
        rules.forEach((rule: BusinessRule) => {
          this.activeRules.set(rule.id, rule);
          this.initializeStats(rule.id);
        });
      }
    } catch (error) {
      console.error('Failed to load active rules:', error);
    }
  }

  private initializeStats(ruleId: string) {
    this.ruleStats.set(ruleId, {
      executions: 0,
      successes: 0,
      failures: 0,
      avgExecutionTime: 0,
      lastExecuted: null,
      recommendationCounts: {
        merge: 0,
        review: 0,
        reject: 0,
        flag: 0
      }
    });
  }

  async evaluateRecord(
    record1: CustomerRecord,
    record2: CustomerRecord,
    context: DeduplicationContext
  ): Promise<DeduplicationResult> {
    const startTime = performance.now();
    
    // Get active rules sorted by priority
    const sortedRules = Array.from(this.activeRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      try {
        const ruleStartTime = performance.now();
        const result = await this.executeRuleWithTimeout(rule, record1, record2, context);
        const ruleExecutionTime = performance.now() - ruleStartTime;
        
        // Update statistics
        this.updateRuleStats(rule.id, ruleExecutionTime, true, result.recommendation);
        
        // If rule makes a definitive decision, return it
        if (result.recommendation !== 'review') {
          return {
            duplicatePairs: [],
            statistics: {
              totalRecords: 2,
              duplicatesFound: result.recommendation === 'merge' ? 1 : 0,
              processingTime: performance.now() - startTime
            },
            dataQualityIssues: result.dataQualityIssues || [],
            confidenceScores: { [rule.id]: result.confidenceScore },
            metadata: {
              ...result,
              appliedRule: rule.id,
              ruleVersion: rule.version
            }
          };
        }
      } catch (error) {
        console.error(`Rule ${rule.id} failed:`, error);
        this.updateRuleStats(rule.id, performance.now() - startTime, false);
        // Continue with next rule
      }
    }
    
    // No rule made a definitive decision
    return {
      duplicatePairs: [],
      statistics: {
        totalRecords: 2,
        duplicatesFound: 0,
        processingTime: performance.now() - startTime
      },
      dataQualityIssues: [],
      confidenceScores: {},
      metadata: {
        recommendation: 'review',
        confidence: 'low',
        confidenceScore: 0.5,
        businessJustification: 'No business rules triggered definitive action',
        suggestedActions: ['Manual review required']
      }
    };
  }

  private async executeRuleWithTimeout(
    rule: BusinessRule,
    record1: CustomerRecord,
    record2: CustomerRecord,
    context: DeduplicationContext,
    timeoutMs: number = 5000
  ): Promise<RuleResult> {
    return Promise.race([
      this.executeRule(rule, record1, record2, context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Rule execution timeout')), timeoutMs)
      )
    ]);
  }

  private async executeRule(
    rule: BusinessRule,
    record1: CustomerRecord,
    record2: CustomerRecord,
    context: DeduplicationContext
  ): Promise<RuleResult> {
    // Create a safe execution environment
    const safeEvaluate = new Function(
      'record1',
      'record2',
      'context',
      `
      try {
        ${this.generateRuleCode(rule)}
        return evaluate(record1, record2, context);
      } catch (error) {
        throw new Error('Rule execution error: ' + error.message);
      }
      `
    );

    return safeEvaluate(record1, record2, context);
  }

  private generateRuleCode(rule: BusinessRule): string {
    // This would generate the actual rule evaluation code
    // For now, returning a simple example
    return `
      function evaluate(record1, record2, context) {
        const result = {
          recommendation: 'review',
          confidence: 'medium',
          confidenceScore: 0.5,
          businessJustification: '',
          dataQualityIssues: [],
          suggestedActions: []
        };

        // Apply rule conditions
        ${JSON.stringify(rule.conditions)}

        // Apply rule actions
        ${JSON.stringify(rule.actions)}

        return result;
      }
    `;
  }

  private updateRuleStats(
    ruleId: string,
    executionTime: number,
    success: boolean,
    recommendation?: string
  ) {
    const stats = this.ruleStats.get(ruleId);
    if (!stats) return;

    stats.executions++;
    if (success) {
      stats.successes++;
      if (recommendation && recommendation in stats.recommendationCounts) {
        stats.recommendationCounts[recommendation as keyof typeof stats.recommendationCounts]++;
      }
    } else {
      stats.failures++;
    }

    // Update average execution time
    stats.avgExecutionTime = 
      (stats.avgExecutionTime * (stats.executions - 1) + executionTime) / stats.executions;
    
    stats.lastExecuted = new Date();
    
    // Persist stats update
    this.persistStats(ruleId, stats);
  }

  private async persistStats(ruleId: string, stats: RuleStatistics) {
    try {
      await fetch(`/api/rules/${ruleId}/stats`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats)
      });
    } catch (error) {
      console.error('Failed to persist rule stats:', error);
    }
  }

  async deployRule(rule: BusinessRule): Promise<void> {
    // Validate rule before deployment
    await this.validateRule(rule);
    
    // Store previous version if exists
    const existingRule = this.activeRules.get(rule.id);
    const previousVersion = existingRule?.version;
    
    // Deploy the rule
    this.activeRules.set(rule.id, rule);
    
    // Initialize statistics if new rule
    if (!this.ruleStats.has(rule.id)) {
      this.initializeStats(rule.id);
    }
    
    // Update deployment status
    const deploymentStatus: RuleDeploymentStatus = {
      ruleId: rule.id,
      version: rule.version,
      environment: 'production',
      deployedAt: new Date(),
      deployedBy: rule.lastModifiedBy || rule.createdBy || 'unknown',
      status: 'active',
      previousVersion
    };
    
    this.deploymentStatus.set(rule.id, deploymentStatus);
    
    // Persist deployment
    await this.persistDeployment(rule);
    
    console.log(`Rule ${rule.id} v${rule.version} deployed successfully`);
  }

  private async validateRule(rule: BusinessRule): Promise<void> {
    // Basic validation
    if (!rule.id || !rule.name || !rule.version) {
      throw new Error('Invalid rule: missing required fields');
    }

    if (!rule.conditions || !rule.actions) {
      throw new Error('Invalid rule: missing conditions or actions');
    }

    // Test the rule with sample data
    try {
      const testRecord: CustomerRecord = {
        id: 'test-1',
        name: 'Test Company',
        address: '123 Test St',
        city: 'Test City',
        country: 'Test Country',
        tpi: '12345',
        rowNumber: 1
      };

      await this.executeRule(rule, testRecord, testRecord, {
        similarityScore: 0.95,
        timestamp: new Date(),
        environment: 'test'
      });
    } catch (error) {
      throw new Error(`Rule validation failed: ${error}`);
    }
  }

  private async persistDeployment(rule: BusinessRule) {
    try {
      await fetch(`/api/rules/${rule.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule,
          deploymentStatus: this.deploymentStatus.get(rule.id)
        })
      });
    } catch (error) {
      console.error('Failed to persist deployment:', error);
      throw error;
    }
  }

  async rollbackRule(ruleId: string): Promise<void> {
    const deploymentStatus = this.deploymentStatus.get(ruleId);
    if (!deploymentStatus || !deploymentStatus.previousVersion) {
      throw new Error('No previous version to rollback to');
    }

    // Mark as rolling back
    deploymentStatus.status = 'rolling_back';

    try {
      // Fetch previous version
      const response = await fetch(`/api/rules/${ruleId}/version/${deploymentStatus.previousVersion}`);
      if (!response.ok) {
        throw new Error('Failed to fetch previous version');
      }

      const previousRule = await response.json();
      
      // Deploy previous version
      await this.deployRule(previousRule);
      
      console.log(`Rule ${ruleId} rolled back to v${deploymentStatus.previousVersion}`);
    } catch (error) {
      deploymentStatus.status = 'active'; // Restore status
      throw error;
    }
  }

  async disableRule(ruleId: string): Promise<void> {
    const rule = this.activeRules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      await this.persistDeployment(rule);
    }
  }

  async enableRule(ruleId: string): Promise<void> {
    const rule = this.activeRules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      await this.persistDeployment(rule);
    }
  }

  getActiveRules(): BusinessRule[] {
    return Array.from(this.activeRules.values());
  }

  getRuleStats(ruleId: string): RuleStatistics | undefined {
    return this.ruleStats.get(ruleId);
  }

  getAllStats(): Map<string, RuleStatistics> {
    return new Map(this.ruleStats);
  }
}

// Singleton instance
export const ruleExecutionEngine = new RuleExecutionEngine();