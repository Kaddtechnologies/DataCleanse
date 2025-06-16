import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { DuplicatePair } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // Optional status filter
    const offset = (page - 1) * limit;

    console.log(`Loading pairs for session ${sessionId}, page ${page}, limit ${limit}, status: ${status}`);

    const client = await pool.connect();
    try {
      // Build the query with optional status filter
      let whereClause = 'WHERE session_id = $1';
      let queryParams: any[] = [sessionId];
      let paramIndex = 2;

      if (status && status !== 'all') {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM duplicate_pairs 
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataQuery = `
        SELECT 
          id,
          record1_data,
          record2_data,
          fuzzy_similarity_score,
          semantic_similarity_score,
          combined_confidence_score,
          status,
          confidence_level,
          enhanced_confidence,
          enhanced_score,
          original_score,
          score_change_reason,
          cached_ai_analysis,
          analysis_timestamp,
          created_at,
          updated_at
        FROM duplicate_pairs 
        ${whereClause}
        ORDER BY created_at
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await client.query(dataQuery, queryParams);
      
      const duplicatePairs: DuplicatePair[] = dataResult.rows.map(row => ({
        id: row.id,
        record1: row.record1_data,
        record2: row.record2_data,
        similarityScore: row.fuzzy_similarity_score,
        status: row.status,
        aiConfidence: row.confidence_level,
        aiReasoning: '', // Could be extracted from cached_ai_analysis
        enhancedConfidence: row.enhanced_confidence,
        enhancedScore: row.enhanced_score,
        originalScore: row.original_score,
        scoreChangeReason: row.score_change_reason,
        lastAnalyzed: row.analysis_timestamp?.toISOString(),
        cachedAiAnalysis: row.cached_ai_analysis
      }));

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      console.log(`Loaded ${duplicatePairs.length} pairs (page ${page}/${totalPages})`);

      return NextResponse.json({
        success: true,
        duplicate_pairs: duplicatePairs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          startIndex: offset + 1,
          endIndex: Math.min(offset + limit, totalCount)
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error loading duplicate pairs:', error);
    return NextResponse.json(
      { error: 'Failed to load duplicate pairs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}