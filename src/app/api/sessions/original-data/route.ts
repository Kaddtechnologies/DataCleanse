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
      console.log('Requested row numbers:', rowNumbers);
      console.log('Original data length:', originalData.length);
      console.log('First few rows of original data:', originalData.slice(0, 3));
      
      let filteredData: Array<Record<string, any>> = [];
      
      // Check if the original data has a 'rowNumber' or 'Row' field
      const hasRowNumberField = originalData.length > 0 && (
        'rowNumber' in originalData[0] || 
        'Row' in originalData[0] || 
        'row' in originalData[0] ||
        'RowNumber' in originalData[0]
      );
      
      if (hasRowNumberField) {
        // Use the actual row number field from the data
        filteredData = originalData.filter(row => {
          const rowNum = row.rowNumber || row.Row || row.row || row.RowNumber;
          return rowNumbers.includes(parseInt(rowNum));
        });
        console.log('Filtered by row number field, found:', filteredData.length, 'rows');
      } else {
        // Fallback to index-based filtering (1-based)
        filteredData = originalData.filter((_, index) => 
          rowNumbers.includes(index + 1)
        );
        console.log('Filtered by index + 1, found:', filteredData.length, 'rows');
      }
      
             // Add the rowNumber field to each row for display purposes
       const enrichedData = filteredData.map((row: Record<string, any>, index: number) => {
         const requestedRowNum = rowNumbers[index];
         return {
           ...row,
           rowNumber: row.rowNumber || row.Row || row.row || row.RowNumber || requestedRowNum
         };
       });
      
      console.log('Enriched data:', enrichedData);
      
      return NextResponse.json({
        data: enrichedData,
        rowNumbers: rowNumbers,
        totalRows: originalData.length,
        filterMethod: hasRowNumberField ? 'field-based' : 'index-based'
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
    const { sessionId, fileData, headers } = await request.json();

    if (!sessionId || !fileData) {
      return NextResponse.json(
        { error: 'Session ID and file data are required' },
        { status: 400 }
      );
    }

    // Ensure each row has a rowNumber field for consistent referencing
    const enrichedFileData = fileData.map((row: any, index: number) => ({
      ...row,
      rowNumber: row.rowNumber || row.Row || row.row || row.RowNumber || (index + 1)
    }));

    // Extract headers from the first row if not provided
    const columnHeaders = headers || (enrichedFileData.length > 0 ? Object.keys(enrichedFileData[0]).filter(key => key !== 'rowNumber') : []);

    await storeOriginalFileData(sessionId, enrichedFileData, columnHeaders);

    return NextResponse.json({
      success: true,
      message: 'Original file data stored successfully',
      rowCount: enrichedFileData.length,
      headerCount: columnHeaders.length
    });

  } catch (error) {
    console.error('Error storing original file data:', error);
    return NextResponse.json(
      { error: 'Failed to store original file data' },
      { status: 500 }
    );
  }
}