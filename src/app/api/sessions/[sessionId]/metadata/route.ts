import { NextRequest, NextResponse } from 'next/server';
import { updateSessionMetadata } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { metadata } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: 'Valid metadata object is required' },
        { status: 400 }
      );
    }

    // Update session metadata
    await updateSessionMetadata(sessionId, metadata);

    return NextResponse.json({
      success: true,
      message: 'Session metadata updated successfully'
    });

  } catch (error) {
    console.error('Error updating session metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to update session metadata',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}