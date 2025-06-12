import { NextRequest, NextResponse } from 'next/server';
import { deleteDuplicatePairs } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pairIds } = body;

    if (!pairIds || !Array.isArray(pairIds) || pairIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid pairIds array' },
        { status: 400 }
      );
    }

    console.log('Deleting batch of pairs:', pairIds);

    // Delete pairs from database
    const result = await deleteDuplicatePairs(pairIds);

    console.log('Batch deletion result:', result);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} duplicate pairs`
    });

  } catch (error) {
    console.error('Error in batch delete API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete pairs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}