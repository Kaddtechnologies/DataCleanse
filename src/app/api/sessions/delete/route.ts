import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getUserSession } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId, confirmationName } = await request.json();

    if (!sessionId || !confirmationName) {
      return NextResponse.json(
        { error: 'Session ID and confirmation name are required' },
        { status: 400 }
      );
    }

    // Get the session to verify the confirmation name
    const session = await getUserSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify confirmation name matches the session name
    if (confirmationName !== session.session_name) {
      return NextResponse.json(
        { error: 'Confirmation name does not match session name' },
        { status: 400 }
      );
    }

    // Delete the session and all related data
    await deleteSession(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}