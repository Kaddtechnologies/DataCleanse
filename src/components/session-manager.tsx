"use client";

import { useState, useEffect } from 'react';
import { useSessionPersistence } from '@/hooks/use-session-persistence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  FileText, 
  Users, 
  CheckCircle, 
  XCircle, 
  SkipForward, 
  AlertTriangle, 
  Play,
  Loader2,
  RefreshCw,
  Database,
  Activity
} from 'lucide-react';
import type { DuplicatePair } from '@/types';

interface SessionData {
  id: string;
  session_name: string;
  file_name?: string;
  total_pairs: number;
  processed_pairs: number;
  progress_percentage: number;
  created_at: string;
  last_accessed: string;
  metadata?: Record<string, any>;
}

interface SessionLoadData {
  session: SessionData;
  duplicate_pairs: DuplicatePair[];
  configuration: Record<string, any>;
  statistics: Record<string, number>;
}

interface SessionManagerProps {
  onSessionLoad: (sessionData: SessionLoadData) => void;
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return `Today at ${date.toLocaleTimeString()}`;
  } else if (diffDays === 2) {
    return `Yesterday at ${date.toLocaleTimeString()}`;
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage >= 20) return 'bg-blue-500';
  return 'bg-gray-500';
};

const SessionCard = ({ 
  session, 
  onLoad, 
  isLoading 
}: { 
  session: SessionData; 
  onLoad: (session: SessionData) => void;
  isLoading: boolean;
}) => (
  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => !isLoading && onLoad(session)}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-base font-medium line-clamp-2">
            {session.session_name}
          </CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {session.file_name || 'Unknown file'}
            </span>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={`${getProgressColor(session.progress_percentage)} text-white border-0 text-xs`}
        >
          {session.progress_percentage}%
        </Badge>
      </div>
    </CardHeader>
    
    <CardContent className="pt-0">
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{session.processed_pairs} / {session.total_pairs}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getProgressColor(session.progress_percentage)}`}
              style={{ width: `${session.progress_percentage}%` }}
            />
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground">Pairs:</span>
            <span className="font-medium">{session.total_pairs}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-green-500" />
            <span className="text-muted-foreground">Last:</span>
            <span className="font-medium">{formatDate(session.last_accessed)}</span>
          </div>
        </div>
        
        {/* Load Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            onLoad(session);
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-2" />
              Continue Session
            </>
          )}
        </Button>
      </div>
    </CardContent>
  </Card>
);

export function SessionManager({ onSessionLoad, isOpen, onClose }: SessionManagerProps) {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const { listSessions, loadSession, checkHealth } = useSessionPersistence();
  const { toast } = useToast();

  // Load sessions when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      // Check database health first
      const isHealthy = await checkHealth();
      if (!isHealthy) {
        toast({
          title: "Database Connection Issue",
          description: "Cannot connect to database. Please check if the database is running.",
          variant: "destructive"
        });
        return;
      }

      const sessionList = await listSessions();
      setSessions(sessionList);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast({
        title: "Error Loading Sessions",
        description: "Failed to load previous sessions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSession = async (session: SessionData) => {
    setLoadingSessionId(session.id);
    try {
      const sessionData = await loadSession(session.id);
      if (sessionData) {
        onSessionLoad(sessionData);
        onClose();
        toast({
          title: "Session Loaded",
          description: `Restored ${sessionData.duplicate_pairs.length} duplicate pairs from "${session.session_name}"`
        });
      } else {
        toast({
          title: "Load Failed",
          description: "Failed to load session data. The session may be corrupted.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast({
        title: "Error Loading Session",
        description: "Failed to load session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingSessionId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center">
              <Database className="w-5 h-5 mr-2 text-primary" />
              Previous Sessions
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Continue working on a previous data cleansing session. Your progress is automatically saved.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading sessions...</p>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Previous Sessions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven't started any data cleansing sessions yet. Upload a file to begin your first session.
                </p>
                <Button variant="outline" onClick={onClose}>
                  Start New Session
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{sessions.length}</div>
                  <div className="text-xs text-muted-foreground">Total Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {sessions.filter(s => s.progress_percentage >= 80).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Nearly Complete</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {sessions.reduce((sum, s) => sum + s.total_pairs, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Pairs</div>
                </div>
              </div>

              <Separator />

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onLoad={handleLoadSession}
                    isLoading={loadingSessionId === session.id}
                  />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}