import { NextRequest, NextResponse } from 'next/server';
import { getSessionByFileName, getNextAvailableFilename } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    // Check if session with this filename exists
    const existingSession = await getSessionByFileName(fileName);
    
    if (existingSession) {
      // Get the next available filename with increment
      const nextAvailableFilename = await getNextAvailableFilename(fileName);
      
      return NextResponse.json({
        exists: true,
        existingSession: {
          id: existingSession.id,
          sessionName: existingSession.session_name,
          fileName: existingSession.file_name,
          totalPairs: existingSession.total_pairs,
          lastAccessed: existingSession.last_accessed,
        },
        suggestedFilename: nextAvailableFilename
      });
    }

    return NextResponse.json({
      exists: false,
      suggestedFilename: fileName
    });

  } catch (error) {
    console.error('Error checking filename:', error);
    return NextResponse.json(
      { error: 'Failed to check filename' },
      { status: 500 }
    );
  }
}