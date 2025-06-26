import { NextRequest, NextResponse } from 'next/server';
import { createDuplicatePairsBatch, updateSessionLastAccessed, saveSessionConfig, createFileUpload } from '@/lib/db';
import type { DuplicatePair } from '@/types';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { 
      duplicate_pairs = [], 
      file_info,
      processing_config,
      column_mapping
    } = body;

    // Update session last accessed
    await updateSessionLastAccessed(sessionId);

    // Save duplicate pairs if provided
    if (duplicate_pairs.length > 0) {
      console.log(`Received ${duplicate_pairs.length} duplicate pairs for processing`);
      
      const pairsToSave = duplicate_pairs
        .filter((pair: DuplicatePair) => {
          if (!pair.record1 || !pair.record2) {
            console.warn('Filtering out pair with missing record data:', { 
              hasRecord1: !!pair.record1, 
              hasRecord2: !!pair.record2,
              similarityScore: pair.similarityScore
            });
            return false;
          }
          if (typeof pair.similarityScore !== 'number' || isNaN(pair.similarityScore)) {
            console.warn('Filtering out pair with invalid similarity score:', pair.similarityScore);
            return false;
          }
          return true;
        })
        .map((pair: DuplicatePair) => ({
          record1: pair.record1,
          record2: pair.record2,
          similarityScore: pair.similarityScore,
          aiConfidence: pair.aiConfidence,
          aiReasoning: pair.aiReasoning,
          enhancedConfidence: pair.enhancedConfidence,
          enhancedScore: pair.enhancedScore,
          originalScore: pair.originalScore || pair.similarityScore * 100
        }));

      console.log(`Saving ${pairsToSave.length} valid pairs out of ${duplicate_pairs.length} received`);
      
      if (pairsToSave.length > 0) {
        await createDuplicatePairsBatch(sessionId, pairsToSave);
      } else {
        console.warn('No valid duplicate pairs to save');
      }
    }

    // Save file upload information if provided
    if (file_info) {
      const fileHash = crypto.createHash('sha256')
        .update(file_info.name + file_info.size)
        .digest('hex');

      await createFileUpload(
        sessionId,
        file_info.name,
        file_info.size,
        fileHash,
        column_mapping || {},
        processing_config || {}
      );
    }

    // Save processing configuration
    if (processing_config) {
      await saveSessionConfig(sessionId, 'processing_config', processing_config);
    }

    // Save column mapping
    if (column_mapping) {
      await saveSessionConfig(sessionId, 'column_mapping', column_mapping);
    }

    return NextResponse.json({
      success: true,
      message: 'Session data saved successfully',
      saved_pairs: duplicate_pairs.length
    });

  } catch (error) {
    console.error('Error saving session data:', error);
    return NextResponse.json(
      { error: 'Failed to save session data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}