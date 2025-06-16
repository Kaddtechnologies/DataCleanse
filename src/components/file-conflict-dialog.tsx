"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Users, FileText, Database, Plus, Loader2 } from 'lucide-react';

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
      <DialogContent className="max-w-4xl h-[85vh] bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 p-0 overflow-hidden flex flex-col">
        {/* Executive Alert Header */}
        <div className="relative bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 dark:from-amber-700 dark:via-amber-600 dark:to-amber-700 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 via-amber-800/10 to-amber-900/20" />
          <div className="relative p-8">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4 text-white text-2xl font-light tracking-wide">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-light">Session Conflict Resolution</div>
                  <div className="text-sm text-white/80 font-light mt-1">Executive decision required for data management</div>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 flex-1 overflow-auto">
          {/* Executive Situation Brief */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">Session Conflict Detected</h3>
                <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                  An active session already exists for dataset <span className="font-semibold text-amber-900 dark:text-amber-100">"{fileName}"</span>. 
                  As an executive user, you can either continue with the existing analytical session or initiate a new parallel analysis track.
                </p>
              </div>
            </div>
          </div>

          {/* Executive Decision Matrix - Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Continue Existing Analytics */}
            <div className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
              {/* Premium Card Header */}
              <div className="bg-primary-gradient p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white tracking-wide">Continue Session</h3>
                      <p className="text-white/80 text-sm font-light">Resume existing analysis</p>
                    </div>
                  </div>
                  <div className="w-2 h-8 bg-white/30 rounded-full" />
                </div>
              </div>
              
              {/* Executive Session Details */}
              <div className="p-6 space-y-6 flex-grow flex flex-col">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-600">
                  <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3">{existingSession?.sessionName}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{existingSession?.fileName}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Records</span>
                      </div>
                      <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        {existingSession?.totalPairs?.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Accessed</span>
                      </div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatDate(existingSession?.lastAccessed).split(',')[0]}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <button
                  onClick={() => onLoadExistingSession(existingSession?.id)}
                  disabled={isLoading}
                  className="w-full px-6 py-4 rounded-xl bg-primary-gradient hover:opacity-90 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading Session...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      <span>Continue Analytics</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            </div>
            
            {/* New Parallel Analysis */}
            <div className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
              {/* Premium Card Header */}
              <div className="bg-green p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white tracking-wide">New Analysis</h3>
                      <p className="text-white/80 text-sm font-light">Parallel analysis track</p>
                    </div>
                  </div>
                  <div className="w-2 h-8 bg-white/30 rounded-full" />
                </div>
              </div>
              
              {/* New Session Configuration */}
              <div className="p-6 space-y-6 flex-grow flex flex-col">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-600">
                  <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-3">New Session</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{suggestedFilename}</p>
                  
                  <div className="bg-gradient-to-r from-green-50 to-green-50 dark:from-green-950/30 dark:to-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">Intelligent Versioning</h5>
                        <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                          The system will automatically increment the filename to maintain parallel analysis tracks without data conflicts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <button
                  onClick={() => onCreateNewSession(suggestedFilename)}
                  disabled={isLoading}
                  className="w-full px-6 py-4 rounded-xl bg-green hover:opacity-90 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Session...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Initialize New Track</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* Executive Action Panel */}
          <div className="flex justify-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium tracking-wide transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Cancel Operation
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}