"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Rocket, 
  CheckCircle, 
  Clock, 
  User,
  MessageSquare,
  AlertTriangle,
  Loader2,
  Shield,
  Users,
  XCircle
} from 'lucide-react';
import { BusinessRule, ApprovalStep } from '@/types/business-rules';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DeploymentManagerProps {
  rule?: BusinessRule;
  testResults?: any;
  onDeploy?: (rule: BusinessRule) => void;
}

export function DeploymentManager({ rule, testResults, onDeploy }: DeploymentManagerProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [deploymentStatus, setDeploymentStatus] = useState<'pending' | 'deploying' | 'deployed' | 'failed'>('pending');
  const { toast } = useToast();

  if (!rule) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-muted-foreground">
            No rule selected for deployment.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mockApprovalSteps: ApprovalStep[] = [
    {
      id: '1',
      type: 'technical',
      status: 'approved',
      level: 1,
      approver: {
        id: 'alan-helm',
        name: 'Alan Helm',
        role: 'Technical Reviewer'
      },
      decision: {
        approved: true,
        comments: 'Code looks good, test coverage is excellent.',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    },
    {
      id: '2',
      type: 'business',
      status: 'pending',
      level: 2,
      approver: {
        id: 'kirk-wilson',
        name: 'Kirk Wilson',
        role: 'Business Owner'
      }
    },
    {
      id: '3',
      type: 'compliance',
      status: 'pending',
      level: 3,
      approver: {
        id: 'lamar-duhon',
        name: 'Lamar Duhon',
        role: 'Data Governance'
      }
    }
  ];

  const approvalSteps = rule.approvals || mockApprovalSteps;
  const allApproved = approvalSteps.every(step => step.status === 'approved');
  const currentApprovalLevel = approvalSteps.findIndex(step => step.status === 'pending') + 1;

  const handleApprove = async () => {
    if (!rule) return;

    try {
      const response = await fetch(`/api/rules/${rule.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: currentApprovalLevel,
          comments: approvalComment,
          approverName: 'Current User' // This would come from auth
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve rule');
      }

      toast({
        title: "Approval submitted",
        description: "Your approval has been recorded."
      });

      setApprovalComment('');
    } catch (error) {
      toast({
        title: "Approval failed",
        description: "Failed to submit approval.",
        variant: "destructive"
      });
    }
  };

  const handleDeploy = async () => {
    if (!rule || !allApproved) return;

    setIsDeploying(true);
    setDeploymentStatus('deploying');

    try {
      const response = await fetch('/api/ai-rules/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule: rule,
          approvalStatus: approvalSteps
        })
      });

      if (!response.ok) {
        throw new Error('Failed to deploy rule');
      }

      setDeploymentStatus('deployed');
      
      if (onDeploy) {
        onDeploy(rule);
      }

      toast({
        title: "Deployment successful",
        description: "Rule has been deployed to production."
      });
    } catch (error) {
      setDeploymentStatus('failed');
      toast({
        title: "Deployment failed",
        description: "Failed to deploy rule to production.",
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Deployment & Approval
          </CardTitle>
          <Badge 
            variant={deploymentStatus === 'deployed' ? 'default' : 'secondary'}
            className={deploymentStatus === 'deployed' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            {deploymentStatus === 'deployed' ? 'Deployed' : 'Pending Deployment'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Rule Summary */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Rule Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rule Name:</span>
              <span className="font-medium">{rule.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Author:</span>
              <span className="font-medium">{rule.createdBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Test Accuracy:</span>
              <span className="font-medium text-green-600">{testResults?.accuracy || 96.8}%</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Business Impact */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Business Impact Assessment</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Affected Records</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Applies to ~347 existing duplicate pairs
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium">Expected Resolution</span>
              </div>
              <p className="text-sm text-muted-foreground">
                89% auto-resolve, 11% manual review
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">Risk Level</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Low - Rule can be disabled instantly if needed
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Approval Chain */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Approval Chain</h3>
          <div className="space-y-3">
            {approvalSteps.map((step, idx) => (
              <div 
                key={idx}
                className={cn(
                  "p-4 rounded-lg border",
                  step.status === 'approved' 
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : step.status === 'pending'
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {step.status === 'approved' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : step.status === 'pending' ? (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {step.approver.role}
                    </span>
                  </div>
                  <Badge 
                    variant={
                      step.status === 'approved' ? 'default' : 
                      step.status === 'pending' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {step.status}
                  </Badge>
                </div>
                {step.approver && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="w-3 h-3" />
                    <span>{step.approver.name}</span>
                    {step.decision?.timestamp && (
                      <span>• {new Date(step.decision.timestamp).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
                {step.decision?.comments && (
                  <div className="flex items-start gap-2 text-sm mt-2">
                    <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5" />
                    <p className="text-muted-foreground italic">{step.decision.comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Approval Form */}
          {!allApproved && currentApprovalLevel <= approvalSteps.length && (
            <div className="mt-4 p-4 rounded-lg border bg-slate-50 dark:bg-slate-800">
              <p className="text-sm font-medium mb-2">Add Approval Comment (Optional)</p>
              <Textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Enter any comments about this rule..."
                className="mb-3"
              />
              <Button 
                onClick={handleApprove}
                className="w-full"
              >
                Approve Rule
              </Button>
            </div>
          )}
        </div>

        {/* Deployment Section */}
        {allApproved && deploymentStatus !== 'deployed' && (
          <>
            <Separator />
            <div className="text-center py-6">
              <Rocket className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready for Deployment</h3>
              <p className="text-muted-foreground mb-6">
                All approvals received. Deploy this rule to production?
              </p>
              <Button
                size="lg"
                onClick={handleDeploy}
                disabled={isDeploying}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy to Production
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Deployment Success */}
        {deploymentStatus === 'deployed' && (
          <>
            <Separator />
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Successfully Deployed!</h3>
              <p className="text-muted-foreground mb-2">
                Rule is now active in production
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Deployment Time: {new Date().toLocaleString()}</p>
                <p>• Version: 1.0.0</p>
                <p>• Environment: Production</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}