import { NextRequest, NextResponse } from 'next/server';
import { analyzeDuplicateConfidence } from '@/ai/flows/analyze-duplicate-confidence';

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

    const result = await analyzeDuplicateConfidence({
      record1,
      record2,
      fuzzyScore,
    });

    // Debug logging to verify AI response
    console.log('AI Analysis Response:', {
      confidenceLevel: result.confidenceLevel,
      hasRecommendation: !!result.recommendation,
      hasWhat: !!result.what,
      hasWhy: !!result.why
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze-confidence API route:', error);
    return NextResponse.json(
      { error: 'AI analysis not available - Contact Support' },
      { status: 500 }
    );
  }
} 