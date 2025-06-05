import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          s.id,
          s.session_name,
          s.file_name,
          s.total_pairs,
          s.created_at,
          s.last_accessed,
          s.metadata,
          COALESCE(COUNT(CASE WHEN dp.status != 'pending' THEN 1 END), 0)::integer as processed_pairs,
          COALESCE(COUNT(dp.id), 0)::integer as total_duplicate_pairs
        FROM user_sessions s
        LEFT JOIN duplicate_pairs dp ON s.id = dp.session_id
        GROUP BY s.id, s.session_name, s.file_name, s.total_pairs, s.created_at, s.last_accessed, s.metadata
        ORDER BY s.last_accessed DESC 
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      
      const sessions = result.rows.map(row => ({
        id: row.id,
        sessionName: row.session_name,
        fileName: row.file_name,
        totalPairs: row.total_pairs,
        processedPairs: row.processed_pairs,
        totalDuplicatePairs: row.total_duplicate_pairs,
        createdAt: row.created_at,
        lastAccessed: row.last_accessed,
        progressPercentage: row.total_duplicate_pairs > 0 
          ? Math.round((row.processed_pairs / row.total_duplicate_pairs) * 100)
          : 0,
        metadata: row.metadata
      }));

      return NextResponse.json({
        sessions,
        hasData: sessions.length > 0
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching sessions with stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}