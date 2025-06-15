import { NextRequest, NextResponse } from 'next/server';
import { getUserSession, updateSessionLastAccessed, getSessionConfig, getSessionStatistics } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const includePairs = searchParams.get('includePairs') === 'true';

    console.log(`Loading session ${sessionId}, includePairs: ${includePairs}`);

    // Get session details
    const session = await getUserSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update last accessed timestamp
    await updateSessionLastAccessed(sessionId);

    // Get session configuration
    const configs = await getSessionConfig(sessionId);
    const configMap = configs.reduce((acc, config) => {
      acc[config.config_key] = config.config_value;
      return acc;
    }, {} as Record<string, any>);

    // Get statistics directly from database (much faster than loading all pairs)
    const statistics = await getSessionStatistics(sessionId);

    const response = {
      success: true,
      session: {
        id: session.id,
        session_name: session.session_name,
        file_name: session.file_name,
        file_size: session.file_size,
        user_id: session.user_id,
        total_pairs: session.total_pairs,
        processed_pairs: session.processed_pairs,
        progress_percentage: session.total_pairs > 0 
          ? Math.round((session.processed_pairs / session.total_pairs) * 100)
          : 0,
        created_at: session.created_at,
        last_accessed: session.last_accessed,
        metadata: session.metadata
      },
      configuration: configMap,
      statistics: statistics || {
        total_pairs: 0,
        pending: 0,
        duplicate: 0,
        not_duplicate: 0,
        skipped: 0,
        auto_merged: 0
      }
    };

    // Only load duplicate pairs if explicitly requested (for backwards compatibility)
    if (includePairs) {
      const { getDuplicatePairsForSession } = await import('@/lib/db');
      const duplicatePairs = await getDuplicatePairsForSession(sessionId);
      return NextResponse.json({
        ...response,
        duplicate_pairs: duplicatePairs
      });
    }

    console.log(`Session ${sessionId} loaded successfully (without pairs)`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error loading session:', error);
    return NextResponse.json(
      { error: 'Failed to load session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}