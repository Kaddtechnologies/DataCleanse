"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  PlusCircle, 
  FileText, 
  TestTube, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  Cog
} from "lucide-react";

export default function RulesSandboxPage() {
  const router = useRouter();

  const sections = [
    {
      id: "library",
      title: "Rule Library",
      description: "Browse and manage your existing business rules",
      icon: BookOpen,
      route: "/rules-sandbox/library",
      badge: "12 Rules",
      color: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
    },
    {
      id: "create",
      title: "Create Rule",
      description: "Build new rules with our intuitive interface",
      icon: PlusCircle,
      route: "/rules-sandbox/create",
      badge: "New",
      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
    },
    {
      id: "templates",
      title: "Templates",
      description: "Start from pre-built rule templates",
      icon: FileText,
      route: "/rules-sandbox/templates",
      badge: "8 Templates",
      color: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"
    },
    {
      id: "testing",
      title: "Testing",
      description: "Test and validate your rules",
      icon: TestTube,
      route: "/rules-sandbox/testing",
      badge: "Lab",
      color: "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
    },
    {
      id: "approvals",
      title: "Approvals",
      description: "Review rules pending approval",
      icon: CheckCircle,
      route: "/rules-sandbox/approvals",
      badge: "3 Pending",
      color: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Section - Mobile Optimized */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200/30 dark:border-blue-700/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
            <Cog className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Business Rules Engine
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              AI-powered rule creation & validation
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <Sparkles className="w-3 h-3" />
          <span>4 active rules • 94-98% accuracy</span>
        </div>
      </div>

      {/* Quick Actions Grid - Mobile First */}
      <div className="space-y-3">
        {sections.map((section) => (
          <Card
            key={section.id}
            className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            onClick={() => router.push(section.route)}
          >
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${section.color} shrink-0`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {section.title}
                    </h3>
                    <Badge variant="secondary" className="text-xs bg-slate-100 dark:bg-slate-700">
                      {section.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {section.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity Section - Mobile Optimized */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Recent Activity
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Latest updates from your rules
          </p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Joint Venture Detection Rule
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Running successfully • 2 hours ago
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
                Live
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Customer Validation Enhancement
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Testing in progress • Yesterday
                </p>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                Testing
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Freight Forwarder Exemption
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Deployed successfully • 3 days ago
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">
                Deployed
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}