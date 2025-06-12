import { NextRequest, NextResponse } from 'next/server';
import { getOriginalFileDataByRows, getOriginalFileHeaders } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { rowNumbers } = await request.json();

    if (!Array.isArray(rowNumbers) || rowNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Row numbers array is required' },
        { status: 400 }
      );
    }

    // Validate row numbers are positive integers
    const validRowNumbers = rowNumbers.filter(num => 
      Number.isInteger(num) && num > 0
    );

    if (validRowNumbers.length === 0) {
      return NextResponse.json(
        { error: 'No valid row numbers provided' },
        { status: 400 }
      );
    }

    // Get the row data from database
    const rowData = await getOriginalFileDataByRows(sessionId, validRowNumbers);
    const headers = await getOriginalFileHeaders(sessionId);

    if (!rowData) {
      return NextResponse.json(
        { error: 'No row data found for this session' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        rows: rowData,
        headers: headers,
        sessionId: sessionId
      }
    });

  } catch (error) {
    console.error('Error retrieving row data:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve row data' },
      { status: 500 }
    );
  }
}