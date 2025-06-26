"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Code, MessageSquare, FileText, Sparkles } from "lucide-react";

export default function CreateRulePage() {
  const creationMethods = [
    {
      id: "conversational",
      title: "Conversational Builder",
      description: "Describe your rule in natural language and let AI build it for you",
      icon: MessageSquare,
      color: "bg-blue-500/10 border-blue-500/20 text-blue-600",
      recommended: true
    },
    {
      id: "visual",
      title: "Visual Builder",
      description: "Drag and drop components to create rules visually",
      icon: PlusCircle,
      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600",
      recommended: false
    },
    {
      id: "code",
      title: "Code Editor",
      description: "Write rules directly in code with syntax highlighting",
      icon: Code,
      color: "bg-purple-500/10 border-purple-500/20 text-purple-600",
      recommended: false
    },
    {
      id: "template",
      title: "From Template",
      description: "Start with a pre-built template and customize it",
      icon: FileText,
      color: "bg-orange-500/10 border-orange-500/20 text-orange-600",
      recommended: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-slate-900 dark:text-white">
              Create New Rule
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Choose your preferred method to build business rules
            </p>
          </div>
        </div>
      </div>

      {/* Creation Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {creationMethods.map((method) => (
          <Card
            key={method.id}
            className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-slate-200/50 dark:border-slate-700/50 relative ${
              method.recommended ? 'ring-2 ring-blue-500/20' : ''
            }`}
          >
            {method.recommended && (
              <div className="absolute -top-2 left-4">
                <div className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                  <Sparkles className="w-3 h-3" />
                  <span>Recommended</span>
                </div>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className={`p-3 rounded-xl ${method.color} w-fit transition-transform duration-300 group-hover:scale-110`}>
                <method.icon className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {method.title}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {method.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full"
                variant={method.recommended ? "default" : "outline"}
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Start Guide */}
      <Card className="border-slate-200/50 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-xl font-medium text-slate-900 dark:text-white">
            Quick Start Guide
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            New to rule creation? Follow these steps to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-1">
                  Define Your Goal
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Clearly describe what your rule should accomplish
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-1">
                  Choose Your Method
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Select the creation method that works best for you
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-1">
                  Test & Deploy
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Validate your rule before putting it into production
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}