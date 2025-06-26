import { NextRequest, NextResponse } from 'next/server';
import { analyzeWithFallback } from '@/services/multi-provider-ai.service';

export async function POST(request: NextRequest) {
  try {
    const { record1, record2, fuzzyScore } = await request.json();

    if (!record1 || !record2 || typeof fuzzyScore !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: record1, record2, fuzzyScore' },
        { status: 400 }
      );
    }

    // Debug logging to verify data is received correctly
    console.log('AI Analysis Request:', {
      record1Keys: Object.keys(record1),
      record2Keys: Object.keys(record2),
      fuzzyScore,
      record1Sample: record1.name || record1.id || 'no name/id',
      record2Sample: record2.name || record2.id || 'no name/id'
    });

    // Use the multi-provider service with automatic fallback
    const result = await analyzeWithFallback(record1, record2, fuzzyScore);

    // Debug logging to verify AI response
    console.log('AI Analysis Response:', {
      confidenceLevel: result.confidenceLevel,
      hasRecommendation: !!result.recommendation,
      hasWhat: !!result.what,
      hasWhy: !!result.why,
      provider: 'Multi-provider with fallback'
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('=== DETAILED ERROR in analyze-confidence API route ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    console.error('===================================================');
    
    // Return more detailed error info for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'AI analysis failed', 
        details: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
} 