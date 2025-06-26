"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Filter, Star, Download, Eye } from "lucide-react";

export default function TemplatesPage() {
  const templates = [
    {
      id: "joint-venture-template",
      title: "Joint Venture & Strategic Partnership Detection",
      description: "Production-ready template for preventing mergers of legitimate joint ventures and strategic partnerships. Based on real-world examples including Ruhr Oel GmbH (BP Europa SE + Rosneft JV) and Shell/Solvay partnerships.",
      category: "Business Intelligence",
      difficulty: "Advanced",
      rating: 4.9,
      downloads: 347,
      accuracy: 94.2,
      businessScenario: "Oil & Gas / Chemical Partnerships",
      tags: ["joint-venture", "partnership", "energy", "chemicals"],
      features: [
        "Parent company detection",
        "JV keyword analysis", 
        "Industry-specific logic",
        "Confidence scoring"
      ]
    },
    {
      id: "energy-division-template",
      title: "Energy Company Division Legitimacy Detection",
      description: "Handles legitimate business divisions within energy companies that serve different markets but share facilities. Perfect for ExxonMobil Oil vs Chemical scenarios and Shell divisions.",
      category: "Energy Sector",
      difficulty: "Advanced",
      rating: 4.8,
      downloads: 289,
      accuracy: 96.7,
      businessScenario: "Multi-Business Energy Companies",
      tags: ["energy", "divisions", "oil-gas", "chemical", "petroleum"],
      features: [
        "Multi-industry detection",
        "Division keyword analysis",
        "Address validation",
        "Parent company mapping"
      ]
    },
    {
      id: "freight-forwarder-template",
      title: "Freight Forwarder & Intermediate Consignee Exemption",
      description: "Prevents merging freight forwarders and intermediate consignees with actual customers when they share shipping addresses. Handles 300+ SIC 470000 scenarios and drop-shipment cases.",
      category: "Logistics",
      difficulty: "Intermediate",
      rating: 4.9,
      downloads: 425,
      accuracy: 98.1,
      businessScenario: "Shipping & Drop-Shipment",
      tags: ["freight", "logistics", "shipping", "sic-codes", "c-o-prefix"],
      features: [
        "SIC code detection",
        "Logistics company matching",
        "Drop-shipment analysis",
        "Industry classification"
      ]
    },
    {
      id: "customer-validation-template",
      title: "Enhanced Customer Data Validation",
      description: "Advanced validation rules for customer records including name, email, address checks, and data completeness scoring with AI-powered anomaly detection.",
      category: "Data Quality",
      difficulty: "Beginner",
      rating: 4.7,
      downloads: 245,
      accuracy: 87.3,
      businessScenario: "General Data Quality",
      tags: ["validation", "customer", "quality", "anomaly-detection"],
      features: [
        "Multi-field validation",
        "Business context awareness", 
        "Configurable thresholds",
        "Real-time scoring"
      ]
    },
    {
      id: "address-standardization-template",
      title: "Address Standardization & Validation",
      description: "Normalize and validate addresses using postal service standards with international support and geocoding integration.",
      category: "Data Cleansing",
      difficulty: "Intermediate",
      rating: 4.6,
      downloads: 156,
      accuracy: 91.4,
      businessScenario: "Global Address Management",
      tags: ["address", "standardization", "postal", "international"],
      features: [
        "Postal standards compliance",
        "International formatting",
        "Geocoding integration",
        "Validation scoring"
      ]
    },
    {
      id: "company-matching-template",
      title: "Company Name Matching & Entity Resolution",
      description: "Fuzzy matching for company names with business entity type normalization and corporate hierarchy detection for complex business structures.",
      category: "Matching",
      difficulty: "Advanced",
      rating: 4.8,
      downloads: 134,
      accuracy: 89.6,
      businessScenario: "Corporate Entity Management",
      tags: ["company", "fuzzy", "matching", "entity-types"],
      features: [
        "Entity type normalization",
        "Fuzzy name matching",
        "Corporate hierarchy",
        "Business suffix handling"
      ]
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "Intermediate":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "Advanced":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-slate-900 dark:text-white">
              Rule Templates
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Pre-built templates to accelerate your rule development
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200/50 dark:border-slate-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search templates..."
                  className="pl-10 bg-white dark:bg-slate-800"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter by Category
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="group hover:shadow-lg transition-all duration-300 border-slate-200/50 dark:border-slate-700/50"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="text-xs">
                  {template.category}
                </Badge>
                <div className="flex items-center space-x-1 text-sm text-slate-600 dark:text-slate-400">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{template.rating}</span>
                </div>
              </div>
              <div>
                <CardTitle className="text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {template.title}
                </CardTitle>
                <CardDescription className="text-sm mt-1 leading-relaxed">
                  {template.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Accuracy and Business Scenario */}
                {template.accuracy && (
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-700/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Accuracy Rate</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{template.accuracy}%</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{template.businessScenario}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getDifficultyColor(template.difficulty)}`}
                  >
                    {template.difficulty}
                  </Badge>
                  <div className="flex items-center space-x-1 text-sm text-slate-600 dark:text-slate-400">
                    <Download className="w-3 h-3" />
                    <span>{template.downloads}</span>
                  </div>
                </div>
                
                {/* Features */}
                {template.features && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300">Key Features</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {template.features.slice(0, 4).map((feature, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-1" />
                    Use Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}