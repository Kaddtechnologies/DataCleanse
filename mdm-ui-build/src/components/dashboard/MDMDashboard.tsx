"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  Database, 
  Sparkles, 
  Shield, 
  Link2, 
  Scale,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCheck,
  Zap,
  Plus,
  WifiOff,
  Wifi,
  Settings,
  TestTube2,
  Eye,
  EyeOff,
  Key,
  Globe,
  Server,
  Lock
} from 'lucide-react';
import { AppHeader } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { BusinessRulesTab } from './BusinessRulesTab';

// ERP Connectors Data
const erpConnectorsData = [
  { 
    id: 'sap', 
    name: 'SAP S/4HANA', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/200px-SAP_2011_logo.svg.png', 
    status: 'Connected' as const, 
    description: 'Finance, Supply Chain, and Manufacturing modules synchronized.', 
    lastSync: '2 minutes ago', 
    syncedObjects: 148290 
  },
  { 
    id: 'salesforce', 
    name: 'Salesforce', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/200px-Salesforce.com_logo.svg.png', 
    status: 'Connected' as const, 
    description: 'Accounts, Contacts, and Opportunities data synchronized.', 
    lastSync: '15 minutes ago', 
    syncedObjects: 32104 
  },
  { 
    id: 'oracle', 
    name: 'Oracle NetSuite', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Oracle_logo.svg/200px-Oracle_logo.svg.png', 
    status: 'Warning' as const, 
    description: 'Connection issue detected. Last successful sync 2 hours ago.', 
    lastSync: '2 hours ago', 
    syncedObjects: 89345 
  },
  { 
    id: 'dynamics', 
    name: 'Microsoft Dynamics 365', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Microsoft_Dynamics_365_logo.svg/200px-Microsoft_Dynamics_365_logo.svg.png', 
    status: 'Not Connected' as const, 
    description: 'Connect to sync your business process data.', 
    lastSync: 'N/A', 
    syncedObjects: 0 
  },
  { 
    id: 'opentext-opa', 
    name: 'OpenText Process Automation(Cordys)', 
    logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjMwIiBjeT0iNTAiIHI9IjE1IiBmaWxsPSIjRkY2NzAwIi8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjE1IiBmaWxsPSIjRkY5QTAwIi8+CjxjaXJjbGUgY3g9IjcwIiBjeT0iNTAiIHI9IjE1IiBmaWxsPSIjRkZDQzAwIi8+Cjx0ZXh0IHg9IjkwIiB5PSI0NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzMzMzMzMyI+T3BlblRleHQ8L3RleHQ+Cjx0ZXh0IHg9IjkwIiB5PSI2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjY2NjY2Ij5Qcm9jZXNzIEF1dG9tYXRpb248L3RleHQ+Cjwvc3ZnPg==', 
    status: 'Connected' as const, 
    description: 'Business Process Management and low-code platform for digital transformation.', 
    lastSync: '5 minutes ago', 
    syncedObjects: 76834 
  },
];

// Status Badge Component
interface StatusBadgeProps {
  status: 'Connected' | 'Warning' | 'Not Connected';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    'Connected': {
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icon: <Wifi className="w-3 h-3" />
    },
    'Warning': {
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: <AlertCircle className="w-3 h-3" />
    },
    'Not Connected': {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      icon: <WifiOff className="w-3 h-3" />
    }
  };

  const config = statusConfig[status];

  return (
    <Badge className={`inline-flex items-center gap-1 ${config.className}`}>
      {config.icon}
      {status}
    </Badge>
  );
};

// ERP Connector Card Component
interface ErpConnectorCardProps {
  name: string;
  logo: string;
  status: 'Connected' | 'Warning' | 'Not Connected';
  description: string;
  lastSync: string;
  syncedObjects: number;
}

const ErpConnectorCard: React.FC<ErpConnectorCardProps> = ({ 
  name, 
  logo, 
  status, 
  description, 
  lastSync, 
  syncedObjects 
}) => {
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  return (
    <>
      <Card className="group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10 flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center p-2 border border-gray-200 dark:border-gray-600 shadow-sm">
              <img 
                src={logo} 
                alt={`${name} logo`} 
                className="max-w-full max-h-full object-contain" 
                onError={(e) => { 
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; 
                  target.src = `https://placehold.co/100x100/f0f0f0/333?text=${name.charAt(0)}`; 
                }}
              />
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="mt-4">
            <CardTitle className="text-lg">{name}</CardTitle>
            <CardDescription className="text-sm mt-1 h-10 line-clamp-2">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-end">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Sync:</span>
              <span className="font-medium">{lastSync}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Synced Objects:</span>
              <span className="font-medium">{syncedObjects.toLocaleString()}</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30"
              onClick={() => setShowConnectionModal(true)}
            >
              Manage Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConnectionManagementModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        connector={{ name, logo, status, description, lastSync, syncedObjects }}
      />
    </>
  );
};

// Metric Card Component with executive-grade styling
interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, icon, trend, color }) => {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
    green: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-600 dark:text-purple-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600 dark:text-red-400'
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    purple: 'text-purple-600 dark:text-purple-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400'
  };

  return (
    <Card className="relative overflow-hidden backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10 shadow-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-50`} />
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${iconColorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              <TrendingUp className={`w-3 h-3 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Quick Action Card Component
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ title, description, icon, onClick, disabled }) => {
  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10"
      onClick={disabled ? undefined : onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-900/30 dark:group-hover:to-blue-800/30 transition-all duration-300">
            {icon}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

// Connection Configuration Types
interface ConnectionConfig {
  sapS4Hana: {
    authMethod: 'oauth2' | 'tba';
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    tokenId?: string;
    tokenSecret?: string;
    accountId?: string;
    systemId?: string;
    apiVersion: string;
    sslEnabled: boolean;
  };
  salesforce: {
    authMethod: 'oauth2' | 'userpass';
    environment: 'production' | 'sandbox';
    instanceUrl: string;
    clientId: string;
    clientSecret: string;
    username?: string;
    password?: string;
    securityToken?: string;
    apiVersion: string;
  };
  oracle: {
    authMethod: 'oauth2' | 'tba';
    accountId: string;
    consumerKey: string;
    consumerSecret: string;
    tokenId?: string;
    tokenSecret?: string;
    baseUrl: string;
    roleId?: string;
    scriptDeployment?: string;
  };
  dynamics: {
    authMethod: 'oauth2' | 'clientCredentials';
    tenantId: string;
    clientId: string;
    clientSecret: string;
    resourceUrl: string;
    authorityUrl: string;
    apiVersion: string;
    environment: 'production' | 'sandbox';
  };
  opentextOpa: {
    authMethod: 'otds' | 'basicAuth' | 'saml';
    serverUrl: string;
    organizationName: string;
    username: string;
    password: string;
    otdsUrl?: string;
    partitionName?: string;
    sslEnabled: boolean;
    apiVersion: string;
    connectionType: 'soap' | 'rest' | 'entityservice';
    enableBpm: boolean;
    enableDcm: boolean;
  };
}

// Connection Management Modal Component
interface ConnectionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: {
    name: string;
    logo: string;
    status: 'Connected' | 'Warning' | 'Not Connected';
    description: string;
    lastSync: string;
    syncedObjects: number;
  };
}

const ConnectionManagementModal: React.FC<ConnectionManagementModalProps> = ({ 
  isOpen, 
  onClose, 
  connector 
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('connection');
  const [testingConnection, setTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const getSystemKey = (name: string) => {
    switch (name.toLowerCase()) {
      case 'sap s/4hana':
        return 'sapS4Hana';
      case 'salesforce':
        return 'salesforce';
      case 'oracle netsuite':
        return 'oracle';
      case 'microsoft dynamics 365':
        return 'dynamics';
      case 'opentext process automation':
        return 'opentextOpa';
      default:
        return 'salesforce';
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    // Simulate connection test
    setTimeout(() => {
      setTestingConnection(false);
      toast({
        title: "Connection Test",
        description: "Connection test completed successfully!",
        variant: "default"
      });
    }, 2000);
  };

  const handleSave = () => {
    toast({
      title: "Connection Saved",
      description: `${connector.name} connection has been updated successfully.`,
      variant: "default"
    });
    onClose();
  };

  const renderConnectionForm = () => {
    const systemKey = getSystemKey(connector.name);

    switch (systemKey) {
      case 'sapS4Hana':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">SAP S/4HANA Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-method">Authentication Method</Label>
                  <Select defaultValue="oauth2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="tba">Token-Based Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api-version">API Version</Label>
                  <Select defaultValue="v2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v2">OData V2</SelectItem>
                      <SelectItem value="v4">OData V4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input 
                  id="base-url"
                  placeholder="https://my-sap-system.sap.ondemand.com"
                  defaultValue="https://my-sap-system.sap.ondemand.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-id">Consumer Key / Client ID</Label>
                  <Input 
                    id="client-id"
                    placeholder="Enter consumer key"
                    defaultValue="SB-cl1234567890!b1|client!b1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-secret">Consumer Secret</Label>
                  <div className="relative">
                    <Input 
                      id="client-secret"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter consumer secret"
                      defaultValue="AbCd1234567890EfGh="
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="system-id">System ID</Label>
                  <Input 
                    id="system-id"
                    placeholder="Enter system ID"
                    defaultValue="S4H"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account-id">Account ID</Label>
                  <Input 
                    id="account-id"
                    placeholder="Enter account ID"
                    defaultValue="12345"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="ssl-enabled" defaultChecked />
                <Label htmlFor="ssl-enabled">Enable SSL/TLS</Label>
              </div>
            </div>
          </div>
        );

      case 'salesforce':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Salesforce Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select defaultValue="production">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api-version">API Version</Label>
                  <Select defaultValue="v58.0">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v58.0">v58.0 (Winter '24)</SelectItem>
                      <SelectItem value="v57.0">v57.0 (Summer '23)</SelectItem>
                      <SelectItem value="v56.0">v56.0 (Spring '23)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance-url">Instance URL</Label>
                <Input 
                  id="instance-url"
                  placeholder="https://mycompany.my.salesforce.com"
                  defaultValue="https://mycompany.my.salesforce.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-id">Consumer Key</Label>
                  <Input 
                    id="client-id"
                    placeholder="Enter consumer key"
                    defaultValue="3MVG9SemV5D80oBeFBHg.example"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-secret">Consumer Secret</Label>
                  <div className="relative">
                    <Input 
                      id="client-secret"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter consumer secret"
                      defaultValue="1234567890123456789"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username"
                  placeholder="user@company.com"
                  defaultValue="integration@mycompany.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="security-token">Security Token</Label>
                <Input 
                  id="security-token"
                  placeholder="Enter security token"
                  defaultValue="AQAQAQAQAQAQAQAQAQ"
                />
              </div>
            </div>
          </div>
        );

      case 'oracle':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold">Oracle NetSuite Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-method">Authentication Method</Label>
                  <Select defaultValue="oauth2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="tba">Token-Based Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account-id">Account ID</Label>
                  <Input 
                    id="account-id"
                    placeholder="Enter account ID"
                    defaultValue="123456_SB1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input 
                  id="base-url"
                  placeholder="https://123456-sb1.suitetalk.api.netsuite.com"
                  defaultValue="https://123456-sb1.suitetalk.api.netsuite.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consumer-key">Consumer Key</Label>
                  <Input 
                    id="consumer-key"
                    placeholder="Enter consumer key"
                    defaultValue="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="consumer-secret">Consumer Secret</Label>
                  <div className="relative">
                    <Input 
                      id="consumer-secret"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter consumer secret"
                      defaultValue="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="token-id">Token ID</Label>
                  <Input 
                    id="token-id"
                    placeholder="Enter token ID"
                    defaultValue="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="token-secret">Token Secret</Label>
                  <div className="relative">
                    <Input 
                      id="token-secret"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter token secret"
                      defaultValue="abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-id">Role ID</Label>
                <Input 
                  id="role-id"
                  placeholder="Enter role ID (optional)"
                  defaultValue="3"
                />
              </div>
            </div>
          </div>
        );

      case 'dynamics':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Microsoft Dynamics 365 Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select defaultValue="production">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api-version">API Version</Label>
                  <Select defaultValue="v9.2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v9.2">v9.2</SelectItem>
                      <SelectItem value="v9.1">v9.1</SelectItem>
                      <SelectItem value="v9.0">v9.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource-url">Resource URL</Label>
                <Input 
                  id="resource-url"
                  placeholder="https://orgname.api.crm.dynamics.com"
                  defaultValue="https://myorg.api.crm.dynamics.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant-id">Tenant ID</Label>
                  <Input 
                    id="tenant-id"
                    placeholder="Enter tenant ID"
                    defaultValue="12345678-1234-1234-1234-123456789012"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-id">Application ID</Label>
                  <Input 
                    id="client-id"
                    placeholder="Enter application ID"
                    defaultValue="87654321-4321-4321-4321-210987654321"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <div className="relative">
                  <Input 
                    id="client-secret"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter client secret"
                    defaultValue="AbC123dEf456GhI789jKl012MnO345pQr678StU901VwX234yZ"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authority-url">Authority URL</Label>
                <Input 
                  id="authority-url"
                  placeholder="https://login.microsoftonline.com/tenant-id"
                  defaultValue="https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012"
                />
              </div>
            </div>
          </div>
        );

      case 'opentextOpa':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold">OpenText Process Automation Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-method">Authentication Method</Label>
                  <Select defaultValue="otds">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="otds">OTDS (OpenText Directory Services)</SelectItem>
                      <SelectItem value="basicAuth">Basic Authentication</SelectItem>
                      <SelectItem value="saml">SAML Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="connection-type">Connection Type</Label>
                  <Select defaultValue="entityservice">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soap">SOAP Web Services</SelectItem>
                      <SelectItem value="rest">REST API</SelectItem>
                      <SelectItem value="entityservice">Entity Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="server-url">Server URL</Label>
                <Input 
                  id="server-url"
                  placeholder="https://appworks.company.com:8080"
                  defaultValue="https://appworks.company.com:8080"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization Name</Label>
                  <Input 
                    id="organization"
                    placeholder="Enter organization name"
                    defaultValue="myorg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="api-version">API Version</Label>
                  <Select defaultValue="24.4">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24.4">24.4 (Latest)</SelectItem>
                      <SelectItem value="24.3">24.3</SelectItem>
                      <SelectItem value="24.2">24.2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username"
                    placeholder="user@company.com"
                    defaultValue="integration@company.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      defaultValue="SecurePassword123!"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otds-url">OTDS URL (Optional)</Label>
                <Input 
                  id="otds-url"
                  placeholder="https://otds.company.com:8443"
                  defaultValue="https://otds.company.com:8443"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partition-name">OTDS Partition Name</Label>
                <Input 
                  id="partition-name"
                  placeholder="Enter partition name"
                  defaultValue="AppWorksPartition"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="ssl-enabled" defaultChecked />
                  <Label htmlFor="ssl-enabled">Enable SSL/TLS</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="enable-bpm" defaultChecked />
                  <Label htmlFor="enable-bpm">Enable BPM Integration</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="enable-dcm" defaultChecked />
                  <Label htmlFor="enable-dcm">Enable Dynamic Case Management</Label>
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-orange-500 text-white">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium text-orange-900 dark:text-orange-100">
                      Platform Overview
                    </h4>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      OpenText Process Automation (formerly Cordys) provides Business Process Management, 
                      low-code development, Entity Services, and AI-powered automation capabilities. 
                      This connector supports both cloud and on-premise deployments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Configuration form not available for this system.</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center p-2 border border-gray-200 dark:border-gray-600 shadow-sm">
              <img 
                src={connector.logo} 
                alt={`${connector.name} logo`} 
                className="max-w-full max-h-full object-contain" 
                onError={(e) => { 
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; 
                  target.src = `https://placehold.co/100x100/f0f0f0/333?text=${connector.name.charAt(0)}`; 
                }}
              />
            </div>
            <div>
              <DialogTitle className="text-xl">{connector.name} Connection</DialogTitle>
              <DialogDescription>
                Configure and manage your {connector.name} integration settings
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="connection" className="space-y-6 p-1">
              {renderConnectionForm()}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 p-1">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Sync Settings</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sync-frequency">Sync Frequency</Label>
                    <Select defaultValue="hourly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="15min">Every 15 minutes</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Select defaultValue="1000">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 records</SelectItem>
                        <SelectItem value="500">500 records</SelectItem>
                        <SelectItem value="1000">1000 records</SelectItem>
                        <SelectItem value="5000">5000 records</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Error Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when sync errors occur
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-retry Failed Operations</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically retry failed sync operations
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Data Compression</Label>
                      <p className="text-sm text-muted-foreground">
                        Compress data during transmission
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6 p-1">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Connection Status</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Last Sync</p>
                          <p className="text-lg font-bold">{connector.lastSync}</p>
                        </div>
                        <Clock className="w-8 h-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Records Synced</p>
                          <p className="text-lg font-bold">{connector.syncedObjects.toLocaleString()}</p>
                        </div>
                        <Database className="w-8 h-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Connection Health</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Health</span>
                      <span className="font-medium text-green-600">Excellent</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recent Activity</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                      <span className="text-sm">Data sync completed</span>
                      <span className="text-xs text-muted-foreground">2 minutes ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                      <span className="text-sm">Authentication refreshed</span>
                      <span className="text-xs text-muted-foreground">1 hour ago</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                      <span className="text-sm">Schema validation passed</span>
                      <span className="text-xs text-muted-foreground">3 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <Separator className="flex-shrink-0" />
        
        <div className="flex justify-between items-center flex-shrink-0">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={testingConnection}
            className="flex items-center gap-2"
          >
            <TestTube2 className="w-4 h-4" />
            {testingConnection ? "Testing..." : "Test Connection"}
          </Button>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function MDMDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load session statistics
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Get latest session stats
      const response = await fetch('/api/sessions/list-with-stats?limit=10');
      if (response.ok) {
        const data = await response.json();
        // Calculate aggregate stats from all sessions
        const aggregateStats = {
          totalRecordsProcessed: 0,
          totalDuplicatesFound: 0,
          totalMerged: 0,
          totalReviewed: 0,
          averageConfidence: 0,
          sessionsCount: data.sessions?.length || 0
        };

        if (data.sessions && data.sessions.length > 0) {
          data.sessions.forEach((session: any) => {
            if (session.statistics) {
              aggregateStats.totalRecordsProcessed += session.statistics.total_records || 0;
              aggregateStats.totalDuplicatesFound += session.statistics.total_pairs || 0;
              aggregateStats.totalMerged += session.statistics.merged || 0;
              aggregateStats.totalReviewed += (session.statistics.merged || 0) + 
                                            (session.statistics.not_duplicate || 0) + 
                                            (session.statistics.duplicate || 0);
            }
          });
        }

        setSessionStats(aggregateStats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToDeduplication = () => {
    router.push('/');
  };

  const handleComingSoon = (feature: string) => {
    toast({
      title: "Coming Soon",
      description: `${feature} functionality will be available in a future release.`,
      variant: "default"
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto p-4 md:p-8 space-y-8">
        {/* Dashboard Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            MDM Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground">
            Enterprise Master Data Management Platform - Real-time Analytics & Insights
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="deduplication" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Database className="w-4 h-4 mr-2" />
              Deduplication
            </TabsTrigger>
            <TabsTrigger value="ai-rules" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Rule Builder
            </TabsTrigger>
            {/* <TabsTrigger value="data-quality" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              Data Quality
            </TabsTrigger> */}
            <TabsTrigger value="erp-integration" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Link2 className="w-4 h-4 mr-2" />
              ERP Integration
            </TabsTrigger>
            {/* <TabsTrigger value="governance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Scale className="w-4 h-4 mr-2" />
              Governance
            </TabsTrigger> */}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Records Processed"
                value={sessionStats?.totalRecordsProcessed?.toLocaleString() || '0'}
                description="Across all sessions"
                icon={<Database className="w-4 h-4" />}
                color="blue"
                trend={{ value: 12.5, isPositive: true }}
              />
              <MetricCard
                title="Duplicates Identified"
                value={sessionStats?.totalDuplicatesFound?.toLocaleString() || '0'}
                description="Potential duplicate pairs"
                icon={<AlertCircle className="w-4 h-4" />}
                color="amber"
                trend={{ value: 8.2, isPositive: false }}
              />
              <MetricCard
                title="Records Merged"
                value={sessionStats?.totalMerged?.toLocaleString() || '0'}
                description="Successfully consolidated"
                icon={<CheckCircle2 className="w-4 h-4" />}
                color="green"
                trend={{ value: 15.3, isPositive: true }}
              />
              <MetricCard
                title="Review Completion"
                value={sessionStats?.totalDuplicatesFound > 0 
                  ? `${Math.round((sessionStats.totalReviewed / sessionStats.totalDuplicatesFound) * 100)}%`
                  : '0%'
                }
                description="Of identified duplicates"
                icon={<FileCheck className="w-4 h-4" />}
                color="purple"
              />
            </div>

            {/* Quick Actions */}
            <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <QuickActionCard
                    title="Start Deduplication"
                    description="Upload and process new data files"
                    icon={<Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    onClick={navigateToDeduplication}
                  />
                  <QuickActionCard
                    title="Configure AI Rules"
                    description="Set up intelligent matching rules"
                    icon={<Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    onClick={() => setActiveTab('ai-rules')}
                  />
                  <QuickActionCard
                    title="Data Quality Report"
                    description="View comprehensive quality metrics"
                    icon={<Shield className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    onClick={() => handleComingSoon('Data Quality Reports')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest deduplication sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">Customer_Master_Data.csv</p>
                        <p className="text-sm text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">1,234 duplicates</p>
                      <p className="text-sm text-muted-foreground">95% reviewed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deduplication Tab */}
          <TabsContent value="deduplication" className="space-y-6">
            <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
              <CardHeader>
                <CardTitle>Data Deduplication Center</CardTitle>
                <CardDescription>
                  Advanced duplicate detection and resolution powered by AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold mb-2">Ready to cleanse your data?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your customer or vendor master data files to begin the intelligent deduplication process.
                  </p>
                  <Button 
                    onClick={navigateToDeduplication}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Go to Deduplication Tool
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">AI-powered confidence scoring</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Multiple blocking strategies</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Interactive review interface</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Bulk merge capabilities</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Active Sessions</span>
                        <Badge variant="secondary">{sessionStats?.sessionsCount || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Avg. Match Rate</span>
                        <Badge variant="secondary">94.2%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Processing Speed</span>
                        <Badge variant="secondary">5k/min</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Rule Builder Tab */}
          <TabsContent value="ai-rules" className="space-y-6">
            <BusinessRulesTab />
          </TabsContent>

          {/* Data Quality Tab */}
          <TabsContent value="data-quality" className="space-y-6">
            <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
              <CardHeader>
                <CardTitle>Data Quality Management</CardTitle>
                <CardDescription>
                  Monitor and improve your master data quality metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30">
                    <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Coming Soon</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Comprehensive data quality dashboards, profiling tools, and automated quality improvement recommendations.
                  </p>
                  <Badge variant="outline" className="mt-2">Q2 2025</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ERP Integration Tab */}
          <TabsContent value="erp-integration" className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  ERP Integration Hub
                </h2>
                <p className="text-muted-foreground mt-1">
                  Connect and synchronize data with your enterprise systems.
                </p>
              </div>
              <Button 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                onClick={() => handleComingSoon('Add Connection')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </div>

            {/* ERP Connectors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {erpConnectorsData.map(connector => (
                <ErpConnectorCard key={connector.id} {...connector} />
              ))}
            </div>

            {/* Key Benefits Section */}
            <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
              <CardHeader>
                <CardTitle>Integration Benefits</CardTitle>
                <CardDescription>
                  Transform dirty data into enterprise-ready master data automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 rounded-full bg-blue-500 text-white w-12 h-12 mx-auto flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6" />
                      </div>
                      <h4 className="font-semibold mb-2">Real-Time Cleansing</h4>
                      <p className="text-sm text-muted-foreground">
                        AI-powered rules clean data as it flows between systems
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 rounded-full bg-green-500 text-white w-12 h-12 mx-auto flex items-center justify-center mb-4">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <h4 className="font-semibold mb-2">Zero Manual Work</h4>
                      <p className="text-sm text-muted-foreground">
                        Eliminate 80% of data prep time with automated pipelines
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 rounded-full bg-purple-500 text-white w-12 h-12 mx-auto flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6" />
                      </div>
                      <h4 className="font-semibold mb-2">Enterprise Scale</h4>
                      <p className="text-sm text-muted-foreground">
                        SAP, Oracle, Dynamics - all systems stay synchronized
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Value Proposition */}
                <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800 mt-6">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-amber-500 text-white">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          The Future of Master Data Management
                        </h4>
                        <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                          Imagine your CRM, ERP, and warehouse systems always having perfect, clean data. 
                          No more weekend data loads, no more "dirty data" firefights, no more manual reconciliation. 
                          Just continuous, intelligent data harmony across your entire enterprise.
                        </p>
                        <Badge variant="outline" className="mt-3 border-amber-300 dark:border-amber-700">
                          Coming Q3 2025
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="space-y-6">
            <Card className="backdrop-blur-sm bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border-white/20 dark:border-white/10">
              <CardHeader>
                <CardTitle>Data Governance</CardTitle>
                <CardDescription>
                  Compliance, audit trails, and access control
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/30 dark:to-slate-700/30">
                    <Scale className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Coming Soon</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Complete audit trails, role-based access control, data lineage tracking, and compliance management tools.
                  </p>
                  <Badge variant="outline" className="mt-2">Q3 2025</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} Powered by Flowserve AI. All rights reserved.
      </footer>
    </div>
  );
}