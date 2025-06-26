import { NextRequest, NextResponse } from 'next/server';
import { createUserSession, saveSessionConfig } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sessionName, 
      fileName, 
      fileHash, 
      totalPairs = 0, 
      metadata = {},
      processingConfig = {}
    } = body;

    // Generate a user ID based on IP or use provided one
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userId = body.userId || `user_${crypto.createHash('md5').update(clientIp).digest('hex').slice(0, 8)}`;

    // Create the session
    const session = await createUserSession(
      sessionName,
      fileName,
      fileHash,
      userId,
      {
        ...metadata,
        client_ip: clientIp,
        user_agent: request.headers.get('user-agent') || 'unknown'
      }
    );

    // Save processing configuration if provided
    if (Object.keys(processingConfig).length > 0) {
      await saveSessionConfig(session.id, 'processing_config', processingConfig);
    }

    // Save default configurations
    await saveSessionConfig(session.id, 'blocking_strategies', {
      use_prefix: true,
      use_metaphone: false,
      use_soundex: false,
      use_ngram: false,
      use_ai: false
    });

    await saveSessionConfig(session.id, 'similarity_thresholds', {
      name_threshold: 70,
      overall_threshold: 70
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        session_name: session.session_name,
        file_name: session.file_name,
        user_id: session.user_id,
        total_pairs: session.total_pairs,
        processed_pairs: session.processed_pairs,
        created_at: session.created_at,
        last_accessed: session.last_accessed
      }
    });

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}