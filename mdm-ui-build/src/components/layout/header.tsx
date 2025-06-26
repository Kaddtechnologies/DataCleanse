"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { History, Moon, Sun, Database, TestTube, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { SessionLoadingDialog } from "@/components/session-loading-dialog";

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
};

interface AppHeaderProps {
  onLoadPreviousSession?: (sessionId: string) => void;
  sessionId?: string;
  sessionStatus?: 'none' | 'ready' | 'active';
  lastSaved?: Date | null;
  refreshStatsCounter?: number;
}

/**
 * Sophisticated theme toggle button that maintains executive appeal
 * with subtle iconography and smooth transitions
 */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-4 h-4">
        <Sun className={`absolute inset-0 w-4 h-4 text-white/70 transition-all duration-300 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} />
        <Moon className={`absolute inset-0 w-4 h-4 text-white/70 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} />
      </div>
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </button>
  );
}

export function AppHeader({ onLoadPreviousSession, sessionId, sessionStatus, lastSaved, refreshStatsCounter }: AppHeaderProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const logoSrc = theme === "dark" ? "/flowserve_logo_white.svg" : "/flowserve_logo_white.svg";
  const [hasAvailableSessions, setHasAvailableSessions] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  // Only true while an explicit check is running
  const [checkingSessions, setCheckingSessions] = useState(false);

  /**
   * Re-check for available sessions only when explicitly requested:
   *  • Parent bumps `refreshStatsCounter` after a session save.
   *  • Additional manual triggers can increment this counter as needed.
   * The empty dependency list + interval that previously caused polling
   * has been removed to stop background traffic.
   */
  useEffect(() => {
    if (refreshStatsCounter !== undefined) {
      checkForAvailableSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshStatsCounter]);

  const checkForAvailableSessions = async () => {
    try {
      const response = await fetch('/api/sessions/list-with-stats?limit=1');
      if (response.ok) {
        const data = await response.json();
        setHasAvailableSessions(data.hasData);
      } else {
        setHasAvailableSessions(false);
      }
    } catch (error) {
      console.error('Error checking for sessions:', error);
      setHasAvailableSessions(false);
    } finally {
      setCheckingSessions(false);
    }
  };

  // Handler for when session availability changes from the dialog
  const handleSessionsChanged = (hasData: boolean) => {
    setHasAvailableSessions(hasData);
  };

  const handleLoadSession = async (selectedSessionId: string) => {
    if (onLoadPreviousSession) {
      setLoadingSession(true);
      try {
        await onLoadPreviousSession(selectedSessionId);
        setSessionDialogOpen(false);
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoadingSession(false);
      }
    }
  };

  return (
    <header className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-2xl border-b border-white/10">
      {/* Subtle animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-blue-900/20 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      
      <div className="relative container mx-auto px-6 py-5 md:px-8 md:py-6">
        {/* Executive Brand Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={logoSrc}
                alt="Flowserve Logo"
                height={45}
                className="h-9 w-auto filter drop-shadow-lg"
              />
              <div className="absolute inset-0 rounded-lg bg-white/5 scale-110 blur-xl opacity-50" />
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/20" />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-medium text-white/60 tracking-widest uppercase">
                Enterprise MDM
              </span>
              <span className="text-sm font-light text-white/80">
                Data Intelligence Platform
              </span>
            </div>
          </div>

          {/* Executive Controls: Navigation + Sessions + Theme */}
          <div className="flex items-center space-x-4">
            {/* Navigation Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/dashboard')}
                className={`group relative flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  pathname === '/dashboard' 
                    ? 'bg-white/15 border border-white/25' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                } backdrop-blur-sm`}
                aria-label="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-white/80 group-hover:text-white transition-colors duration-300" />
                <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors duration-300">
                  Dashboard
                </span>
              </button>
              <button
                onClick={() => router.push('/')}
                className={`group relative flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  pathname === '/' 
                    ? 'bg-white/15 border border-white/25' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                } backdrop-blur-sm`}
                aria-label="Deduplication"
              >
                <Database className="w-4 h-4 text-white/80 group-hover:text-white transition-colors duration-300" />
                <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors duration-300">
                  Deduplication
                </span>
              </button>
            </div>
            
            <div className="w-px h-6 bg-white/15" />
            
            {onLoadPreviousSession && hasAvailableSessions && !checkingSessions && (
              <button
                onClick={() => setSessionDialogOpen(true)}
                className="group relative flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 border border-white/15 hover:border-white/25 transition-all duration-300 backdrop-blur-sm"
                aria-label="Load previous session"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="relative">
                    <Database className="w-4 h-4 text-white/80 group-hover:text-white transition-colors duration-300" />
                    <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors duration-300 tracking-wide">
                    Load Session
                  </span>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            )}
            
            <div className="w-px h-6 bg-white/15" />
            
            {/* Compact Session Status */}
            {sessionStatus === 'active' ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-400/30 backdrop-blur-sm">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm" style={{ animationDuration: '1.5s' }} />
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-400/40 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                <span className="text-xs font-medium text-emerald-300 tracking-wide">
                  Active Session
                </span>
              </div>
            ) : sessionStatus === 'ready' ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/15 to-blue-600/10 border border-blue-400/30 backdrop-blur-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full shadow-sm" />
                <span className="text-xs font-medium text-blue-300 tracking-wide">
                  Ready to Process
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-600/15 to-slate-700/10 border border-slate-500/25 backdrop-blur-sm">
                <div className="w-2 h-2 bg-slate-400 rounded-full opacity-50" />
                <span className="text-xs font-medium text-slate-400 tracking-wide">
                  No Session
                </span>
              </div>
            )}
            
            {/* Last Saved Indicator - Only show after first save */}
            {lastSaved && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/15 to-purple-600/10 border border-purple-400/25 backdrop-blur-sm">
                <div className="w-2 h-2 bg-purple-400 rounded-full opacity-75" />
                <span className="text-xs font-medium text-purple-300 tracking-wide">
                  Saved {formatTimeAgo(lastSaved)}
                </span>
              </div>
            )}
            
            <div className="w-px h-6 bg-white/15" />
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      {/* Session Loading Dialog */}
      <SessionLoadingDialog
        isOpen={sessionDialogOpen}
        onClose={() => setSessionDialogOpen(false)}
        onLoadSession={handleLoadSession}
        isLoading={loadingSession}
        onSessionsChanged={handleSessionsChanged}
        onRefreshStats={() => refreshStatsCounter}
      />    
     
    </header>
  );
}
