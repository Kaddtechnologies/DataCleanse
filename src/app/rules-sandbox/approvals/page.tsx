"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, User, Calendar, FileText, ThumbsUp, ThumbsDown } from "lucide-react";

export default function ApprovalsPage() {
  const pendingApprovals = [
    {
      id: "approval-1",
      ruleName: "Enhanced Customer Matching",
      description: "Improved fuzzy matching algorithm for customer deduplication",
      submittedBy: "John Smith",
      submittedDate: "2024-01-15",
      priority: "High",
      category: "Deduplication",
      status: "pending",
      version: "2.1.0"
    },
    {
      id: "approval-2",
      ruleName: "Address Validation Update",
      description: "Updated address validation to support new postal codes",
      submittedBy: "Sarah Johnson",
      submittedDate: "2024-01-14",
      priority: "Medium",
      category: "Data Quality",
      status: "pending",
      version: "1.5.2"
    },
    {
      id: "approval-3",
      ruleName: "Email Domain Blacklist",
      description: "Added new domains to email validation blacklist",
      submittedBy: "Mike Davis",
      submittedDate: "2024-01-13",
      priority: "Low",
      category: "Validation",
      status: "pending",
      version: "1.0.3"
    }
  ];

  const recentDecisions = [
    {
      id: "decision-1",
      ruleName: "Phone Number Standardization",
      decision: "approved",
      approvedBy: "Manager",
      date: "2024-01-12",
      version: "1.2.0"
    },
    {
      id: "decision-2",
      ruleName: "Company Name Normalization",
      decision: "rejected",
      approvedBy: "Manager",
      date: "2024-01-11",
      version: "1.0.1",
      reason: "Requires additional testing"
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-50 text-red-600 border-red-200";
      case "Medium":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "Low":
        return "bg-blue-50 text-blue-600 border-blue-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <CheckCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-slate-900 dark:text-white">
              Rule Approvals
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Review and approve pending rule changes
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            3 Pending
          </Badge>
        </div>
      </div>

      {/* Approval Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              3
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Awaiting review
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              12
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              This month
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              2
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Need revision
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/50 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Avg Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              2.3d
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              To approval
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="history">Approval History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <Card
                key={approval.id}
                className="border-slate-200/50 dark:border-slate-700/50"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-lg">{approval.ruleName}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          v{approval.version}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(approval.priority)}`}
                        >
                          {approval.priority}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm leading-relaxed">
                        {approval.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {approval.submittedBy}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Submitted by
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {new Date(approval.submittedDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Submitted on
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {approval.category}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Category
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {recentDecisions.map((decision) => (
              <Card
                key={decision.id}
                className="border-slate-200/50 dark:border-slate-700/50"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {decision.decision === "approved" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{decision.ruleName}</CardTitle>
                        <CardDescription className="text-sm">
                          v{decision.version} • {decision.decision === "approved" ? "Approved" : "Rejected"} by {decision.approvedBy}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(decision.date).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                {decision.reason && (
                  <CardContent>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="text-sm text-red-800 dark:text-red-200">
                        <strong>Rejection Reason:</strong> {decision.reason}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}