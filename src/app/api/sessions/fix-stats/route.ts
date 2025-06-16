import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const client = await pool.connect();
    try {
      let query: string;
      let params: any[];

      if (sessionId) {
        // Fix stats for specific session
        query = `
          WITH session_stats AS (
            SELECT 
              s.id as session_id,
              COALESCE(COUNT(dp.id), 0) as total_duplicate_pairs,
              COALESCE(COUNT(CASE WHEN dp.status != 'pending' THEN 1 END), 0) as processed_pairs
            FROM user_sessions s
            LEFT JOIN duplicate_pairs dp ON s.id = dp.session_id
            WHERE s.id = $1
            GROUP BY s.id
          )
          UPDATE user_sessions 
          SET 
            total_pairs = session_stats.total_duplicate_pairs,
            processed_pairs = session_stats.processed_pairs,
            last_accessed = CURRENT_TIMESTAMP
          FROM session_stats 
          WHERE user_sessions.id = session_stats.session_id
          RETURNING user_sessions.id, user_sessions.session_name, user_sessions.total_pairs, user_sessions.processed_pairs
        `;
        params = [sessionId];
      } else {
        // Fix stats for all sessions
        query = `
          WITH session_stats AS (
            SELECT 
              s.id as session_id,
              COALESCE(COUNT(dp.id), 0) as total_duplicate_pairs,
              COALESCE(COUNT(CASE WHEN dp.status != 'pending' THEN 1 END), 0) as processed_pairs
            FROM user_sessions s
            LEFT JOIN duplicate_pairs dp ON s.id = dp.session_id
            GROUP BY s.id
          )
          UPDATE user_sessions 
          SET 
            total_pairs = session_stats.total_duplicate_pairs,
            processed_pairs = session_stats.processed_pairs,
            last_accessed = CURRENT_TIMESTAMP
          FROM session_stats 
          WHERE user_sessions.id = session_stats.session_id
          RETURNING user_sessions.id, user_sessions.session_name, user_sessions.total_pairs, user_sessions.processed_pairs
        `;
        params = [];
      }

      const result = await client.query(query, params);

      // Log the fixes made
      console.log('Session stats fixed:', result.rows);

      return NextResponse.json({
        success: true,
        message: sessionId ? 'Session stats fixed successfully' : 'All session stats fixed successfully',
        sessions_updated: result.rows.length,
        updated_sessions: result.rows.map(row => ({
          id: row.id,
          sessionName: row.session_name,
          totalPairs: row.total_pairs,
          processedPairs: row.processed_pairs,
          progressPercentage: row.total_pairs > 0 
            ? Math.round((row.processed_pairs / row.total_pairs) * 100)
            : 0
        }))
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fixing session stats:', error);
    return NextResponse.json(
      { error: 'Failed to fix session stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 