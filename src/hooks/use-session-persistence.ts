import { useState, useCallback, useEffect } from 'react';
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

interface SessionPersistenceState {
  currentSession: SessionData | null;
  sessions: SessionData[];
  isLoading: boolean;
  error: string | null;
}

export function useSessionPersistence() {
  const [state, setState] = useState<SessionPersistenceState>({
    currentSession: null,
    sessions: [],
    isLoading: false,
    error: null
  });

  // Create a new session
  const createSession = useCallback(async (
    sessionName: string, 
    fileName?: string, 
    processingConfig?: Record<string, any>
  ): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName,
          fileName,
          processingConfig,
          metadata: {
            created_from: 'file_upload',
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          currentSession: data.session,
          isLoading: false
        }));
        return data.session.id;
      } else {
        throw new Error(data.error || 'Unknown error creating session');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create session',
        isLoading: false
      }));
      return null;
    }
  }, []);

  // Load an existing session
  const loadSession = useCallback(async (sessionId: string): Promise<{
    session: SessionData;
    duplicate_pairs: DuplicatePair[];
    configuration: Record<string, any>;
    statistics: Record<string, number>;
  } | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/load`);
      
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          currentSession: data.session,
          isLoading: false
        }));
        return {
          session: data.session,
          duplicate_pairs: data.duplicate_pairs,
          configuration: data.configuration,
          statistics: data.statistics
        };
      } else {
        throw new Error(data.error || 'Unknown error loading session');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false
      }));
      return null;
    }
  }, []);

  // Save duplicate pairs to the current session
  const saveDuplicatePairs = useCallback(async (
    sessionId: string,
    duplicatePairs: DuplicatePair[],
    fileInfo?: { name: string; size: number },
    processingConfig?: Record<string, any>,
    columnMapping?: Record<string, string>
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duplicate_pairs: duplicatePairs,
          file_info: fileInfo,
          processing_config: processingConfig,
          column_mapping: columnMapping
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save duplicate pairs: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setState(prev => ({ ...prev, isLoading: false }));
        return true;
      } else {
        throw new Error(data.error || 'Unknown error saving duplicate pairs');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save duplicate pairs',
        isLoading: false
      }));
      return false;
    }
  }, []);

  // Update a specific duplicate pair
  const updateDuplicatePair = useCallback(async (
    pairId: string,
    updates: {
      status?: 'pending' | 'merged' | 'not_duplicate' | 'skipped' | 'duplicate';
      enhancedConfidence?: string;
      enhancedScore?: number;
      cachedAiAnalysis?: any;
    }
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/duplicate-pairs/${pairId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update duplicate pair: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating duplicate pair:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update duplicate pair'
      }));
      return false;
    }
  }, []);

  // List user sessions
  const listSessions = useCallback(async (userId?: string): Promise<SessionData[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      
      const response = await fetch(`/api/sessions/list?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to list sessions: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setState(prev => ({
          ...prev,
          sessions: data.sessions,
          isLoading: false
        }));
        return data.sessions;
      } else {
        throw new Error(data.error || 'Unknown error listing sessions');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to list sessions',
        isLoading: false
      }));
      return [];
    }
  }, []);

  // Clear current session
  const clearSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSession: null,
      error: null
    }));
  }, []);

  // Check database health
  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }, []);

  return {
    // State
    currentSession: state.currentSession,
    sessions: state.sessions,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    createSession,
    loadSession,
    saveDuplicatePairs,
    updateDuplicatePair,
    listSessions,
    clearSession,
    checkHealth
  };
}