import { NextRequest, NextResponse } from 'next/server';
import { listUserSessions } from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    // If no userId provided, generate one from IP for consistency
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      effectiveUserId = `user_${crypto.createHash('md5').update(clientIp).digest('hex').slice(0, 8)}`;
    }

    const sessions = await listUserSessions(effectiveUserId, limit);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      session_name: session.session_name,
      file_name: session.file_name,
      total_pairs: session.total_pairs,
      processed_pairs: session.processed_pairs,
      progress_percentage: session.total_pairs > 0 
        ? Math.round((session.processed_pairs / session.total_pairs) * 100)
        : 0,
      created_at: session.created_at,
      last_accessed: session.last_accessed,
      metadata: session.metadata
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      count: formattedSessions.length
    });

  } catch (error) {
    console.error('Error listing sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list sessions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}