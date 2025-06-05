"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Clock, FileText, Users, Trash2, Loader2, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SessionData {
  id: string;
  sessionName: string;
  fileName: string;
  totalPairs: number;
  processedPairs: number;
  totalDuplicatePairs: number;
  createdAt: string;
  lastAccessed: string;
  progressPercentage: number;
  metadata?: any;
}

interface SessionLoadingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (sessionId: string) => void;
  isLoading?: boolean;
}

export function SessionLoadingDialog({ 
  isOpen, 
  onClose, 
  onLoadSession, 
  isLoading = false 
}: SessionLoadingDialogProps) {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionData | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Fetch sessions when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    setFetchingSessions(true);
    try {
      const response = await fetch('/api/sessions/list-with-stats');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        console.error('Failed to fetch sessions');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setFetchingSessions(false);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.sessionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLoadSession = () => {
    if (selectedSession) {
      onLoadSession(selectedSession.id);
      onClose();
    }
  };

  const handleDeleteClick = (session: SessionData) => {
    setSessionToDelete(session);
    setConfirmationText("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete || confirmationText !== sessionToDelete.sessionName) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/sessions/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionToDelete.id,
          confirmationName: confirmationText,
        }),
      });

      if (response.ok) {
        // Refresh sessions list
        await fetchSessions();
        setDeleteDialogOpen(false);
        setSessionToDelete(null);
        setConfirmationText("");
        
        // Clear selection if deleted session was selected
        if (selectedSession?.id === sessionToDelete.id) {
          setSelectedSession(null);
        }
      } else {
        console.error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProgressBadge = (percentage: number) => {
    if (percentage === 100) {
      return <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>;
    } else if (percentage > 0) {
      return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 text-white">{percentage}% Done</Badge>;
    } else {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />Not Started</Badge>;
    }
  };

  if (sessions.length === 0 && !fetchingSessions && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>No Previous Sessions</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No previous sessions found. Upload a file to create your first session.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-2xl font-semibold">Load Previous Session</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select a previous session to continue working with your data.
              </p>
            </DialogHeader>

            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search sessions by name or filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex h-full">
                {/* Sessions List */}
                <div className="w-1/2 border-r">
                  <ScrollArea className="h-full px-6">
                    {fetchingSessions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading sessions...</span>
                      </div>
                    ) : (
                      <div className="space-y-3 pb-6">
                        {filteredSessions.map((session) => (
                          <Card
                            key={session.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              selectedSession?.id === session.id && "ring-2 ring-primary"
                            )}
                            onClick={() => setSelectedSession(session)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg truncate">{session.sessionName}</CardTitle>
                                  <CardDescription className="truncate">{session.fileName}</CardDescription>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(session);
                                  }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    {session.totalDuplicatePairs} pairs
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {new Date(session.lastAccessed).toLocaleDateString()}
                                  </div>
                                </div>
                                {getProgressBadge(session.progressPercentage)}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Session Details */}
                <div className="w-1/2 p-6">
                  {selectedSession ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">{selectedSession.sessionName}</h3>
                        <p className="text-muted-foreground">{selectedSession.fileName}</p>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Session Statistics</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Duplicate Pairs:</span>
                              <p className="font-medium">{selectedSession.totalDuplicatePairs}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Processed:</span>
                              <p className="font-medium">{selectedSession.processedPairs} ({selectedSession.progressPercentage}%)</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Remaining:</span>
                              <p className="font-medium">{selectedSession.totalDuplicatePairs - selectedSession.processedPairs}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Progress:</span>
                              <div className="mt-1">
                                {getProgressBadge(selectedSession.progressPercentage)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Timeline</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">Created:</span>
                              <span className="ml-2">{formatDate(selectedSession.createdAt)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="text-muted-foreground">Last Accessed:</span>
                              <span className="ml-2">{formatDate(selectedSession.lastAccessed)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex gap-3">
                        <Button
                          onClick={handleLoadSession}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading Session...
                            </>
                          ) : (
                            'Load Session'
                          )}
                        </Button>
                        <Button variant="outline" onClick={onClose}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Select a session from the list to view details
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Session
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This action cannot be undone. This will permanently delete the session
                <span className="font-semibold"> "{sessionToDelete?.sessionName}"</span> and all associated data.
              </p>
              <p>
                Type <span className="font-mono bg-muted px-1 rounded">{sessionToDelete?.sessionName}</span> to confirm:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type session name here..."
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={confirmationText !== sessionToDelete?.sessionName || deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Session'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}