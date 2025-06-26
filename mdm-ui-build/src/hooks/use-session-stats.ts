import { useState, useEffect, useCallback } from 'react';

interface SessionStats {
  total_pairs: number;
  pending: number;
  duplicate: number;
  not_duplicate: number;
  skipped: number;
  auto_merged: number;
}

export function useSessionStats(sessionId: string | null) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!sessionId) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch session statistics');
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.error || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching session stats:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Initial fetch when sessionId changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Return both the stats and a refresh function for real-time updates
  return {
    stats,
    isLoading,
    error,
    refreshStats: fetchStats
  };
}