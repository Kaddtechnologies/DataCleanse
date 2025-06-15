"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  Brain,
  Zap,
  Globe,
  Users
} from 'lucide-react';

interface AIProvider {
  name: string;
  type: string;
  priority: number;
  isHealthy?: boolean;
  lastChecked?: string;
  errorCount: number;
}

interface ProviderStatus {
  currentProvider: AIProvider | null;
  providers: AIProvider[];
  timestamp: string;
}

export function AIProviderStatus() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/ai-providers/status');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching AI provider status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  };

  const refreshHealthChecks = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/ai-providers/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.status}`);
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error refreshing health checks:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const switchProvider = async (providerName: string) => {
    try {
      const response = await fetch('/api/ai-providers/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'switch', providerName }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to switch provider: ${response.status}`);
      }
      
      await fetchStatus(); // Refresh status after switching
    } catch (err) {
      console.error('Error switching provider:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch provider');
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'azure_openai':
        return <Brain className="w-4 h-4 text-blue-500" />;
      case 'openai':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'google_gemini':
        return <Globe className="w-4 h-4 text-yellow-500" />;
      case 'anthropic':
        return <Users className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthBadge = (provider: AIProvider) => {
    if (provider.isHealthy === undefined) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3 mr-1" />
          Checking...
        </Badge>
      );
    }
    
    if (provider.isHealthy) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Healthy
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700">
        <XCircle className="w-3 h-3 mr-1" />
        Unhealthy
      </Badge>
    );
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            AI Provider Status Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 animate-pulse" />
            Loading AI Provider Status...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-blue-900">
            <Brain className="w-5 h-5 mr-2" />
            AI Provider Status
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshHealthChecks}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Provider */}
        {status.currentProvider && (
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900 flex items-center">
                {getProviderIcon(status.currentProvider.type)}
                <span className="ml-2">Current Active Provider</span>
              </h3>
              {getHealthBadge(status.currentProvider)}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-800">{status.currentProvider.name}</p>
                <p className="text-sm text-blue-600">Priority: {status.currentProvider.priority}</p>
              </div>
              {status.currentProvider.lastChecked && (
                <p className="text-xs text-blue-500">
                  Last checked: {new Date(status.currentProvider.lastChecked).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        )}

        {!status.currentProvider && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center text-red-700">
              <XCircle className="w-5 h-5 mr-2" />
              <span className="font-semibold">No Active Provider</span>
            </div>
            <p className="text-red-600 text-sm mt-1">All AI providers are currently unavailable</p>
          </div>
        )}

        {/* Toggle All Providers */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full"
        >
          {isExpanded ? 'Hide' : 'Show'} All Providers ({status.providers.length})
        </Button>

        {/* All Providers List */}
        {isExpanded && (
          <div className="space-y-2">
            <Separator />
            {status.providers.map((provider, index) => (
              <div 
                key={provider.name} 
                className={`p-3 rounded-lg border ${
                  status.currentProvider?.name === provider.name 
                    ? 'bg-blue-100 border-blue-300' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(provider.type)}
                    <div>
                      <p className="font-medium text-sm">{provider.name}</p>
                      <p className="text-xs text-gray-500">
                        Priority {provider.priority} • {provider.errorCount} errors
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getHealthBadge(provider)}
                    {provider.isHealthy && status.currentProvider?.name !== provider.name && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => switchProvider(provider.name)}
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status Footer */}
        <div className="text-xs text-blue-500 pt-2 border-t border-blue-200">
          Last updated: {new Date(status.timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
} 