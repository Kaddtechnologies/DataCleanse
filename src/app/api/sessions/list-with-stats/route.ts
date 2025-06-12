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
          s.processed_pairs,
          s.created_at,
          s.last_accessed,
          s.metadata,
          COALESCE(COUNT(CASE WHEN dp.status != 'pending' THEN 1 END), 0)::integer as actual_processed_pairs,
          COALESCE(COUNT(dp.id), 0)::integer as total_duplicate_pairs,
          COALESCE(COUNT(CASE WHEN (dp.enhanced_score >= 98 OR (dp.enhanced_score IS NULL AND dp.fuzzy_similarity_score * 100 >= 98)) THEN 1 END), 0)::integer as high_confidence,
          COALESCE(COUNT(CASE WHEN (dp.enhanced_score >= 90 AND dp.enhanced_score < 98) OR (dp.enhanced_score IS NULL AND dp.fuzzy_similarity_score * 100 >= 90 AND dp.fuzzy_similarity_score * 100 < 98) THEN 1 END), 0)::integer as medium_confidence,
          COALESCE(COUNT(CASE WHEN (dp.enhanced_score < 90) OR (dp.enhanced_score IS NULL AND dp.fuzzy_similarity_score * 100 < 90) THEN 1 END), 0)::integer as low_confidence,
          COALESCE(COUNT(CASE WHEN dp.status IN ('merged', 'duplicate') THEN 1 END), 0)::integer as merged,
          COALESCE(COUNT(CASE WHEN dp.status = 'not_duplicate' THEN 1 END), 0)::integer as not_duplicate,
          COALESCE(COUNT(CASE WHEN dp.status = 'skipped' THEN 1 END), 0)::integer as skipped,
          COALESCE(COUNT(CASE WHEN dp.status = 'pending' THEN 1 END), 0)::integer as pending
        FROM user_sessions s
        LEFT JOIN duplicate_pairs dp ON s.id = dp.session_id
        GROUP BY s.id, s.session_name, s.file_name, s.total_pairs, s.processed_pairs, s.created_at, s.last_accessed, s.metadata
        ORDER BY s.last_accessed DESC 
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      
      // Debug logging
      console.log('Raw session data from DB:', result.rows.map(row => ({
        id: row.id,
        session_name: row.session_name,
        total_pairs: row.total_pairs,
        processed_pairs: row.processed_pairs,
        actual_processed_pairs: row.actual_processed_pairs,
        total_duplicate_pairs: row.total_duplicate_pairs
      })));
      
      const sessions = result.rows.map(row => {
        // Use the calculated duplicate pairs count, but fall back to stored total_pairs if needed
        const totalDuplicatePairs = row.total_duplicate_pairs > 0 ? row.total_duplicate_pairs : row.total_pairs;
        const processedPairs = row.actual_processed_pairs > 0 ? row.actual_processed_pairs : row.processed_pairs;
        
        return {
          id: row.id,
          sessionName: row.session_name,
          fileName: row.file_name,
          totalPairs: row.total_pairs,
          processedPairs: processedPairs,
          totalDuplicatePairs: totalDuplicatePairs,
          createdAt: row.created_at,
          lastAccessed: row.last_accessed,
          progressPercentage: totalDuplicatePairs > 0 
            ? Math.round((processedPairs / totalDuplicatePairs) * 100)
            : 0,
          metadata: row.metadata,
          highConfidence: row.high_confidence,
          mediumConfidence: row.medium_confidence,
          lowConfidence: row.low_confidence,
          merged: row.merged,
          notDuplicate: row.not_duplicate,
          skipped: row.skipped,
          pending: row.pending
        };
      });

      console.log('Processed session data:', sessions.map(s => ({
        id: s.id,
        sessionName: s.sessionName,
        totalPairs: s.totalPairs,
        processedPairs: s.processedPairs,
        totalDuplicatePairs: s.totalDuplicatePairs,
        progressPercentage: s.progressPercentage
      })));

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