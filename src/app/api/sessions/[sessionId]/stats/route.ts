import { NextRequest, NextResponse } from 'next/server';
import { getSessionStatistics } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get real-time session statistics
    const stats = await getSessionStatistics(sessionId);

    if (!stats) {
      return NextResponse.json(
        { error: 'Session not found or no statistics available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching session statistics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch session statistics',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}