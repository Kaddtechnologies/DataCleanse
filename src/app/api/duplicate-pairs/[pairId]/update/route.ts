import { NextRequest, NextResponse } from 'next/server';
import { updateDuplicatePair } from '@/lib/db';
import crypto from 'crypto';

export async function PUT(
  request: NextRequest,
  { params }: { params: { pairId: string } }
) {
  try {
    const { pairId } = params;
    const body = await request.json();
    const { 
      status, 
      enhancedConfidence, 
      enhancedScore, 
      cachedAiAnalysis,
      decisionUser
    } = body;

    // Generate user ID if not provided
    let effectiveDecisionUser = decisionUser;
    if (!effectiveDecisionUser) {
      const clientIp = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
      effectiveDecisionUser = `user_${crypto.createHash('md5').update(clientIp).digest('hex').slice(0, 8)}`;
    }

    // Validate status if provided
    if (status && !['pending', 'merged', 'not_duplicate', 'skipped', 'duplicate'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update the duplicate pair
    await updateDuplicatePair(pairId, {
      status,
      enhancedConfidence,
      enhancedScore,
      cachedAiAnalysis,
      decisionUser: effectiveDecisionUser
    });

    return NextResponse.json({
      success: true,
      message: 'Duplicate pair updated successfully',
      pair_id: pairId,
      updated_fields: {
        status: status || 'unchanged',
        enhancedConfidence: enhancedConfidence || 'unchanged',
        enhancedScore: enhancedScore || 'unchanged',
        cachedAiAnalysis: cachedAiAnalysis ? 'updated' : 'unchanged'
      }
    });

  } catch (error) {
    console.error('Error updating duplicate pair:', error);
    return NextResponse.json(
      { error: 'Failed to update duplicate pair', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}