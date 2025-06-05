"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Users, FileText } from 'lucide-react';

interface ExistingSession {
  id: string;
  sessionName: string;
  fileName: string;
  totalPairs: number;
  lastAccessed: string;
}

interface FileConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  existingSession: ExistingSession;
  suggestedFilename: string;
  onLoadExistingSession: (sessionId: string) => void;
  onCreateNewSession: (newFileName: string) => void;
  isLoading?: boolean;
}

export function FileConflictDialog({
  isOpen,
  onClose,
  fileName,
  existingSession,
  suggestedFilename,
  onLoadExistingSession,
  onCreateNewSession,
  isLoading = false
}: FileConflictDialogProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            File Already Exists in Session
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-amber-800 dark:text-amber-200">
              A session already exists for <span className="font-semibold">"{fileName}"</span>. 
              You can either load the existing session to continue where you left off, or create a new session with an incremented filename.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Existing Session Option */}
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Load Existing Session
                </CardTitle>
                <CardDescription>
                  Continue working with your existing data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{existingSession.sessionName}</p>
                  <p className="text-sm text-muted-foreground">{existingSession.fileName}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Pairs:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {existingSession.totalPairs}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Accessed:</span>
                    <span className="text-xs">{formatDate(existingSession.lastAccessed)}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => onLoadExistingSession(existingSession.id)}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Load Existing Session
                </Button>
              </CardContent>
            </Card>

            {/* New Session Option */}
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-lg text-green-700 dark:text-green-300 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Create New Session
                </CardTitle>
                <CardDescription>
                  Start fresh with a new session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">New Session</p>
                  <p className="text-sm text-muted-foreground">{suggestedFilename}</p>
                </div>

                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-3">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    The filename will be automatically incremented to avoid conflicts.
                  </p>
                </div>

                <Button 
                  onClick={() => onCreateNewSession(suggestedFilename)}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Create New Session
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}