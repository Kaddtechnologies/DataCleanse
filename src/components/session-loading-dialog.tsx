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
import { Calendar, Clock, FileText, Users, Trash2, Loader2, Search, CheckCircle, AlertTriangle, Copy, Check, Activity } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

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

  const copySessionName = async () => {
    if (!sessionToDelete?.sessionName) return;
    
    try {
      await navigator.clipboard.writeText(sessionToDelete.sessionName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy session name:', error);
    }
  };

  const handleDeleteClick = (session: SessionData) => {
    setSessionToDelete(session);
    setConfirmationText("");
    setCopied(false);
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
      <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
          {/* Executive Header */}
          <div className="relative bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-slate-300 dark:border-slate-600 -m-6 mb-0 p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-purple-900/5 to-blue-900/10" />
            <DialogHeader className="relative">
              <DialogTitle className="text-xl font-light text-white tracking-wide">Session Management</DialogTitle>
              <p className="text-sm text-white/80 font-light mt-2">Data session repository</p>
            </DialogHeader>
          </div>
          
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center">
              <Activity className="w-8 h-8 text-slate-600 dark:text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-3">No Active Sessions</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-md mx-auto">
            You haven't started any data cleansing sessions yet.
            <br />
            Upload a file to begin your first session.            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Continue
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
          {/* Executive Header */}
          <div className="relative bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-slate-300 dark:border-slate-600 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-purple-900/5 to-blue-900/10" />
            <div className="relative p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-light text-white tracking-wide">Session Management Console</DialogTitle>
                <p className="text-sm text-white/80 font-light mt-2">
                  Load or manage your saved data sessions
                </p>
              </DialogHeader>
            </div>
          </div>
          
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Executive Search Interface */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div className="relative max-w-md">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search all sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                />
              </div>
            </div>

            {/* Executive Content Layout */}
            <div className="flex flex-1 overflow-hidden">
              {/* Executive Session Repository */}
              <div className="w-1/2 border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-medium text-slate-800 dark:text-slate-200 tracking-wide">Active Sessions</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Select a session to review details</p>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="p-6">
                      {fetchingSessions ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-400" />
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Loading previous sessions...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredSessions.map((session) => (
                            <div
                              key={session.id}
                              className={cn(
                                "group relative cursor-pointer transition-all duration-300 rounded-xl border bg-white dark:bg-slate-800 hover:shadow-lg",
                                selectedSession?.id === session.id 
                                  ? "ring-2 ring-blue-500 dark:ring-blue-400 border-blue-200 dark:border-blue-600 shadow-lg" 
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                              )}
                              onClick={() => setSelectedSession(session)}
                            >
                              <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate tracking-wide">
                                      {session.sessionName}
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-1">
                                      {session.fileName}
                                    </p>
                                  </div>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(session);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4 text-sm">
                                    <div className="flex items-center text-slate-600 dark:text-slate-400">
                                      <Users className="w-4 h-4 mr-1.5" />
                                      <span className="font-medium">{session.totalDuplicatePairs}</span>
                                    </div>
                                    <div className="flex items-center text-slate-600 dark:text-slate-400">
                                      <Clock className="w-4 h-4 mr-1.5" />
                                      <span>{new Date(session.lastAccessed).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  {getProgressBadge(session.progressPercentage)}
                                </div>
                              </div>
                              
                              {selectedSession?.id === session.id && (
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Executive Session Analytics */}
              <div className="w-1/2 bg-white dark:bg-slate-800">
                {selectedSession ? (
                  <div className="h-full flex flex-col">
                    {/* Session Overview Header */}
                    <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200 tracking-wide mb-2">
                        {selectedSession.sessionName}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 font-light">{selectedSession.fileName}</p>
                    </div>
                    
                    <ScrollArea className="flex-1">
                      <div className="p-8 space-y-8">

                        {/* Executive Analytics Grid */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-600">
                          <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-6 tracking-wide">Session Analytics</h4>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                                {selectedSession.totalDuplicatePairs.toLocaleString()}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Duplicate Pairs</div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {selectedSession.processedPairs.toLocaleString()}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Records Processed</div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {(selectedSession.totalDuplicatePairs - selectedSession.processedPairs).toLocaleString()}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Records Remaining</div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {selectedSession.progressPercentage}%
                                  </div>
                                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Completion Rate</div>
                                </div>
                                {getProgressBadge(selectedSession.progressPercentage)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Executive Timeline */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-600">
                          <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-6 tracking-wide">Session Timeline</h4>
                          <div className="space-y-4">
                            <div className="flex items-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">Session Created</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">{formatDate(selectedSession.createdAt)}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mr-4">
                                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">Last Accessed</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">{formatDate(selectedSession.lastAccessed)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>

                    {/* Executive Action Panel */}
                    <div className="p-8 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex gap-4">
                        <button
                          onClick={handleLoadSession}
                          disabled={isLoading}
                          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Loading Session...</span>
                            </>
                          ) : (
                            <span>Load Executive Session</span>
                          )}
                        </button>
                        
                        <button
                          onClick={onClose}
                          className="px-6 py-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium tracking-wide transition-all duration-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center px-8">
                      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-3">Session Preview</h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                        Select a session from the repository to view comprehensive analytics and management options.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Executive Deletion Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
          {/* Executive Warning Header */}
          <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-red-600 dark:from-red-700 dark:via-red-600 dark:to-red-700 -m-6 mb-0 p-6 rounded-t-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-red-800/10 to-red-900/20" />
            <AlertDialogHeader className="relative">
              <AlertDialogTitle className="flex items-center gap-3 text-white text-xl font-light tracking-wide">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                Critical System Operation
              </AlertDialogTitle>
            </AlertDialogHeader>
          </div>
          
          <div className="p-8">
            <AlertDialogDescription className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-3">
                  Permanent Session Deletion
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  This operation will permanently and irreversibly delete the session
                  <span className="font-semibold text-slate-800 dark:text-slate-200"> "{sessionToDelete?.sessionName}"</span> and all associated analytical data.
                </p>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Executive Confirmation Required</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                  Type the exact session name below to authorize this destructive operation:
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-3 font-mono text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    {sessionToDelete?.sessionName}
                  </div>
                  <button
                    onClick={copySessionName}
                    className="flex items-center justify-center w-10 h-10 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg border border-slate-300 dark:border-slate-600 transition-all duration-200"
                    title={copied ? "Copied!" : "Copy session name"}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </AlertDialogDescription>
            
            <div className="mt-6">
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Enter session name for confirmation..."
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500/20 transition-all duration-300"
              />
            </div>
            
            <AlertDialogFooter className="mt-8 flex gap-4">
              <button
                onClick={() => setConfirmationText("")}
                className="flex-1 px-6 py-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium tracking-wide transition-all duration-300"
              >
                Cancel Operation
              </button>
              
              <button
                onClick={handleDeleteConfirm}
                disabled={confirmationText !== sessionToDelete?.sessionName || deleting}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Executing Deletion...</span>
                  </>
                ) : (
                  <span>Authorize Deletion</span>
                )}
              </button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}