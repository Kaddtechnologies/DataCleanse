import { NextRequest, NextResponse } from 'next/server';
import { getUserSession, getDuplicatePairsForSession, updateSessionLastAccessed, getSessionConfig } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

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

    // Get all duplicate pairs for this session
    const duplicatePairs = await getDuplicatePairsForSession(sessionId);

    // Get session configuration
    const configs = await getSessionConfig(sessionId);
    const configMap = configs.reduce((acc, config) => {
      acc[config.config_key] = config.config_value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        session_name: session.session_name,
        file_name: session.file_name,
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
      duplicate_pairs: duplicatePairs,
      configuration: configMap,
      statistics: {
        total_pairs: duplicatePairs.length,
        pending: duplicatePairs.filter(p => p.status === 'pending').length,
        merged: duplicatePairs.filter(p => p.status === 'merged').length,
        duplicate: duplicatePairs.filter(p => p.status === 'duplicate').length,
        not_duplicate: duplicatePairs.filter(p => p.status === 'not_duplicate').length,
        skipped: duplicatePairs.filter(p => p.status === 'skipped').length
      }
    });

  } catch (error) {
    console.error('Error loading session:', error);
    return NextResponse.json(
      { error: 'Failed to load session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}