import { NextRequest, NextResponse } from 'next/server';
import { getOriginalFileData, storeOriginalFileData } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const rowNumbers = searchParams.get('rowNumbers')?.split(',').map(n => parseInt(n));

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const originalData = await getOriginalFileData(sessionId);
    
    if (!originalData) {
      return NextResponse.json(
        { error: 'Original file data not found for this session' },
        { status: 404 }
      );
    }

    // If specific row numbers are requested, filter the data
    if (rowNumbers && rowNumbers.length > 0) {
      const filteredData = originalData.filter((_, index) => 
        rowNumbers.includes(index + 1) // Row numbers are 1-based
      );
      
      return NextResponse.json({
        data: filteredData,
        rowNumbers: rowNumbers,
        totalRows: originalData.length
      });
    }

    return NextResponse.json({
      data: originalData,
      totalRows: originalData.length
    });

  } catch (error) {
    console.error('Error fetching original file data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch original file data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, fileData } = await request.json();

    if (!sessionId || !fileData) {
      return NextResponse.json(
        { error: 'Session ID and file data are required' },
        { status: 400 }
      );
    }

    await storeOriginalFileData(sessionId, fileData);

    return NextResponse.json({
      success: true,
      message: 'Original file data stored successfully',
      rowCount: fileData.length
    });

  } catch (error) {
    console.error('Error storing original file data:', error);
    return NextResponse.json(
      { error: 'Failed to store original file data' },
      { status: 500 }
    );
  }
}