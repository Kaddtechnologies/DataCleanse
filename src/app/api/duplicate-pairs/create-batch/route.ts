import { NextRequest, NextResponse } from 'next/server';
import { createDuplicatePairsBatch } from '@/lib/db';
import type { CustomerRecord } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, pairs } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json(
        { error: 'Pairs array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate pair structure
    for (const pair of pairs) {
      if (!pair.record1 || !pair.record2 || typeof pair.similarityScore !== 'number') {
        return NextResponse.json(
          { error: 'Each pair must have record1, record2, and similarityScore' },
          { status: 400 }
        );
      }
    }

    // Process and save the duplicate pairs
    const processedPairs = pairs.map((pair: any) => ({
      record1: pair.record1 as CustomerRecord,
      record2: pair.record2 as CustomerRecord,
      similarityScore: pair.similarityScore,
      aiConfidence: pair.aiConfidence,
      aiReasoning: pair.aiReasoning,
      enhancedConfidence: pair.enhancedConfidence,
      enhancedScore: pair.enhancedScore,
      originalScore: pair.originalScore || pair.similarityScore * 100
    }));

    await createDuplicatePairsBatch(sessionId, processedPairs);

    return NextResponse.json({
      success: true,
      message: 'Duplicate pairs created successfully',
      session_id: sessionId,
      pairs_created: processedPairs.length
    });

  } catch (error) {
    console.error('Error creating duplicate pairs batch:', error);
    return NextResponse.json(
      { error: 'Failed to create duplicate pairs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}