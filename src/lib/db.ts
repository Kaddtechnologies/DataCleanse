import { Pool, PoolClient } from 'pg';
import type { CustomerRecord, DuplicatePair } from '@/types';

// Database connection configuration
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'mdm_dedup',
  user: 'mdm_user',
  password: 'mdm_password123', // Empty string password for trust authentication
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s
  query_timeout: 30000, // 30 second query timeout
  statement_timeout: 30000, // 30 second statement timeout
});

// Test database connection on initialization
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Monitor pool metrics
let connectionAttempts = 0;
let connectionFailures = 0;

pool.on('acquire', () => {
  connectionAttempts++;
});

pool.on('connect', () => {
  const poolMetrics = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    connectionAttempts,
    connectionFailures
  };
  console.log('Pool connection acquired:', poolMetrics);
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

// Enhanced error handling for connection timeouts
const originalConnect = pool.connect.bind(pool);
pool.connect = async function() {
  try {
    const client = await originalConnect();
    return client;
  } catch (error) {
    connectionFailures++;
    console.error('Pool connection failed:', {
      error: error instanceof Error ? error.message : error,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      connectionAttempts,
      connectionFailures
    });
    throw error;
  }
};

export { pool };

// Database utility functions
export interface UserSession {
  id: string;
  session_name: string;
  file_name?: string;
  file_hash?: string;
  file_size?: number;
  user_id?: string;
  total_pairs: number;
  processed_pairs: number;
  created_at: Date;
  last_accessed: Date;
  metadata: Record<string, any>;
}

export interface SessionConfig {
  id: string;
  session_id: string;
  config_key: string;
  config_value: Record<string, any>;
  created_at: Date;
}

export interface FileUpload {
  id: string;
  session_id: string;
  original_filename: string;
  file_size: number;
  file_hash: string;
  column_mapping: Record<string, string>;
  processing_config: Record<string, any>;
  upload_timestamp: Date;
  processing_started_at?: Date;
  processing_completed_at?: Date;
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

// Session management functions
export async function createUserSession(
  sessionName: string,
  fileName?: string,
  fileHash?: string,
  fileSize?: number,
  userId?: string,
  metadata: Record<string, any> = {}
): Promise<UserSession> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO user_sessions (session_name, file_name, file_hash, file_size, user_id, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await client.query(query, [sessionName, fileName, fileHash, fileSize, userId, JSON.stringify(metadata)]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getUserSession(sessionId: string): Promise<UserSession | null> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.*,
        fu.file_size
      FROM user_sessions s
      LEFT JOIN file_uploads fu ON s.id = fu.session_id
      WHERE s.id = $1
    `;
    const result = await client.query(query, [sessionId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export async function updateSessionLastAccessed(sessionId: string): Promise<void> {
  const client = await pool.connect();
  try {
    const query = 'UPDATE user_sessions SET last_accessed = CURRENT_TIMESTAMP WHERE id = $1';
    await client.query(query, [sessionId]);
  } finally {
    client.release();
  }
}

export async function listUserSessions(userId?: string, limit: number = 10): Promise<UserSession[]> {
  const client = await pool.connect();
  try {
    let query = `
      SELECT * FROM user_sessions 
      ${userId ? 'WHERE user_id = $1' : ''}
      ORDER BY last_accessed DESC 
      LIMIT $${userId ? '2' : '1'}
    `;
    const params = userId ? [userId, limit] : [limit];
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Duplicate pairs management functions
export async function createDuplicatePairsBatch(
  sessionId: string,
  pairs: Array<{
    record1: CustomerRecord;
    record2: CustomerRecord;
    similarityScore: number;
    aiConfidence?: string;
    aiReasoning?: string;
    enhancedConfidence?: string;
    enhancedScore?: number;
    originalScore?: number;
  }>
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Filter out invalid pairs and validate data
    const validPairs = pairs.filter(pair => {
      if (!pair.record1 || !pair.record2) {
        console.warn('Skipping pair with missing record data:', pair);
        return false;
      }
      if (typeof pair.similarityScore !== 'number' || isNaN(pair.similarityScore)) {
        console.warn('Skipping pair with invalid similarity score:', pair);
        return false;
      }
      return true;
    });

    console.log(`Processing ${validPairs.length} valid pairs out of ${pairs.length} total pairs`);
    
    for (const pair of validPairs) {
      const query = `
        INSERT INTO duplicate_pairs (
          session_id, record1_data, record2_data, fuzzy_similarity_score,
          original_score, enhanced_score, enhanced_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      const result = await client.query(query, [
        sessionId,
        JSON.stringify(pair.record1),
        JSON.stringify(pair.record2),
        pair.similarityScore,
        pair.originalScore || pair.similarityScore * 100,
        pair.enhancedScore || null,
        pair.enhancedConfidence || null
      ]);
      
      console.log(`Created duplicate pair with ID: ${result.rows[0].id}`);
    }
    
    // Update total_pairs in session with the actual number of valid pairs saved
    await client.query(
      'UPDATE user_sessions SET total_pairs = $1 WHERE id = $2',
      [validPairs.length, sessionId]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getDuplicatePairsForSession(sessionId: string): Promise<DuplicatePair[]> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        id,
        record1_data,
        record2_data,
        fuzzy_similarity_score,
        semantic_similarity_score,
        combined_confidence_score,
        status,
        confidence_level,
        enhanced_confidence,
        enhanced_score,
        original_score,
        score_change_reason,
        cached_ai_analysis,
        analysis_timestamp,
        created_at,
        updated_at
      FROM duplicate_pairs 
      WHERE session_id = $1
      ORDER BY created_at
    `;
    const result = await client.query(query, [sessionId]);
    
    return result.rows.map(row => ({
      id: row.id,
      record1: row.record1_data,
      record2: row.record2_data,
      similarityScore: row.fuzzy_similarity_score,
      status: row.status,
      aiConfidence: row.confidence_level,
      aiReasoning: '', // Could be extracted from cached_ai_analysis
      enhancedConfidence: row.enhanced_confidence,
      enhancedScore: row.enhanced_score,
      originalScore: row.original_score,
      scoreChangeReason: row.score_change_reason,
      lastAnalyzed: row.analysis_timestamp?.toISOString(),
      cachedAiAnalysis: row.cached_ai_analysis
    }));
  } finally {
    client.release();
  }
}

export async function updateDuplicatePair(
  pairId: string,
  updates: {
    status?: 'pending' | 'merged' | 'not_duplicate' | 'skipped' | 'duplicate';
    enhancedConfidence?: string;
    enhancedScore?: number;
    cachedAiAnalysis?: any;
    decisionUser?: string;
  }
): Promise<void> {
  const client = await pool.connect();
  try {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setParts.push(`status = $${paramIndex++}`);
      values.push(updates.status);
      setParts.push(`decided_at = CURRENT_TIMESTAMP`);
    }

    if (updates.enhancedConfidence !== undefined) {
      setParts.push(`enhanced_confidence = $${paramIndex++}`);
      values.push(updates.enhancedConfidence);
    }

    if (updates.enhancedScore !== undefined) {
      setParts.push(`enhanced_score = $${paramIndex++}`);
      values.push(updates.enhancedScore);
    }

    if (updates.cachedAiAnalysis !== undefined) {
      setParts.push(`cached_ai_analysis = $${paramIndex++}`);
      values.push(JSON.stringify(updates.cachedAiAnalysis));
      setParts.push(`analysis_timestamp = CURRENT_TIMESTAMP`);
    }

    if (updates.decisionUser !== undefined) {
      setParts.push(`decision_user = $${paramIndex++}`);
      values.push(updates.decisionUser);
    }

    if (setParts.length === 0) {
      return; // No updates to make
    }

    values.push(pairId);
    const query = `
      UPDATE duplicate_pairs 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}::uuid
    `;

    const result = await client.query(query, values);
    
    // Log the update for debugging
    console.log(`Updated duplicate pair ${pairId}:`, {
      updates,
      rowsAffected: result.rowCount
    });

    // If no rows were affected, check if the pair exists
    if ((result.rowCount ?? 0) === 0) {
      const checkQuery = 'SELECT id, session_id FROM duplicate_pairs WHERE id = $1::uuid';
      const checkResult = await client.query(checkQuery, [pairId]);
      
      if (checkResult.rows.length === 0) {
        console.error(`Pair ${pairId} not found in database`);
        throw new Error(`Duplicate pair ${pairId} not found`);
      } else {
        console.error(`Pair ${pairId} exists but update failed. Query: ${query}, Values:`, values);
      }
    }

    // If status was updated, manually trigger session stats recalculation
    if (updates.status !== undefined && (result.rowCount ?? 0) > 0) {
      console.log('Status update detected, checking session progress...');
      
      // Get session ID for this pair and update session stats
      const sessionQuery = 'SELECT session_id FROM duplicate_pairs WHERE id = $1';
      const sessionResult = await client.query(sessionQuery, [pairId]);
      
      if (sessionResult.rows.length > 0) {
        const sessionId = sessionResult.rows[0].session_id;
        
        // Recalculate and update session stats
        const statsQuery = `
          UPDATE user_sessions 
          SET 
            total_pairs = (SELECT COUNT(*) FROM duplicate_pairs WHERE session_id = $1::uuid),
            processed_pairs = (SELECT COUNT(*) FROM duplicate_pairs WHERE session_id = $1::uuid AND status != 'pending'),
            last_accessed = CURRENT_TIMESTAMP
          WHERE id = $1::uuid
          RETURNING total_pairs, processed_pairs
        `;
        
        const statsResult = await client.query(statsQuery, [sessionId]);
        console.log(`Updated session ${sessionId} stats:`, statsResult.rows[0]);
      }
    }
  } finally {
    client.release();
  }
}

// Session configuration functions
export async function saveSessionConfig(
  sessionId: string,
  configKey: string,
  configValue: Record<string, any>
): Promise<void> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO session_config (session_id, config_key, config_value)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, config_key) 
      DO UPDATE SET config_value = $3, created_at = CURRENT_TIMESTAMP
    `;
    await client.query(query, [sessionId, configKey, JSON.stringify(configValue)]);
  } finally {
    client.release();
  }
}

export async function getSessionConfig(
  sessionId: string,
  configKey?: string
): Promise<SessionConfig[]> {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM session_config WHERE session_id = $1';
    const params = [sessionId];
    
    if (configKey) {
      query += ' AND config_key = $2';
      params.push(configKey);
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// File upload tracking
export async function createFileUpload(
  sessionId: string,
  filename: string,
  fileSize: number,
  fileHash: string,
  columnMapping: Record<string, string>,
  processingConfig: Record<string, any>
): Promise<FileUpload> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO file_uploads (
        session_id, original_filename, file_size, file_hash, 
        column_mapping, processing_config
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await client.query(query, [
      sessionId,
      filename,
      fileSize,
      fileHash,
      JSON.stringify(columnMapping),
      JSON.stringify(processingConfig)
    ]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function updateFileUploadStatus(
  uploadId: string,
  status: 'uploaded' | 'processing' | 'completed' | 'failed',
  completedAt?: Date
): Promise<void> {
  const client = await pool.connect();
  try {
    let query = 'UPDATE file_uploads SET processing_status = $1';
    const params: any[] = [status];
    let paramIndex = 2;

    if (status === 'processing') {
      query += `, processing_started_at = CURRENT_TIMESTAMP`;
    }

    if (status === 'completed' || status === 'failed') {
      query += `, processing_completed_at = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id = $${paramIndex}`;
    params.push(uploadId);

    await client.query(query, params);
  } finally {
    client.release();
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    // Use a shorter timeout for health checks
    client = await pool.connect();
    await client.query('SELECT 1', []);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
    }
    return false;
  } finally {
    // Always release the client if it was acquired
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client during health check:', releaseError);
      }
    }
  }
}

// Check if session exists by filename
export async function getSessionByFileName(fileName: string): Promise<UserSession | null> {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM user_sessions WHERE file_name = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await client.query(query, [fileName]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

// Get session with processed records count
export async function getSessionWithStats(sessionId: string): Promise<UserSession & { processed_pairs: number } | null> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        s.*,
        COALESCE(COUNT(CASE WHEN dp.status != 'pending' THEN 1 END), 0) as processed_pairs
      FROM user_sessions s
      LEFT JOIN duplicate_pairs dp ON s.id = dp.session_id
      WHERE s.id = $1
      GROUP BY s.id
    `;
    const result = await client.query(query, [sessionId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

// Delete session and all related data
export async function deleteSession(sessionId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete in proper order to respect foreign key constraints
    await client.query('DELETE FROM session_config WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM duplicate_pairs WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM original_file_data WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM file_uploads WHERE session_id = $1', [sessionId]);
    await client.query('DELETE FROM user_sessions WHERE id = $1', [sessionId]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get next available filename with increment
export async function getNextAvailableFilename(baseFileName: string): Promise<string> {
  const client = await pool.connect();
  try {
    // Extract file extension
    const lastDotIndex = baseFileName.lastIndexOf('.');
    const name = lastDotIndex > 0 ? baseFileName.substring(0, lastDotIndex) : baseFileName;
    const extension = lastDotIndex > 0 ? baseFileName.substring(lastDotIndex) : '';
    
    // Find existing sessions with similar names
    const query = 'SELECT file_name FROM user_sessions WHERE file_name LIKE $1 ORDER BY file_name';
    const pattern = `${name}%${extension}`;
    const result = await client.query(query, [pattern]);
    
    const existingNames = new Set(result.rows.map(row => row.file_name));
    
    // If original name doesn't exist, return it
    if (!existingNames.has(baseFileName)) {
      return baseFileName;
    }
    
    // Find the next available number
    let counter = 1;
    let newFileName;
    do {
      newFileName = `${name}(${counter})${extension}`;
      counter++;
    } while (existingNames.has(newFileName));
    
    return newFileName;
  } finally {
    client.release();
  }
}

// Store original file data for row-by-row comparison in dedicated table
export async function storeOriginalFileData(
  sessionId: string,
  fileData: Array<Record<string, any>>,
  headers?: string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear any existing data for this session
    await client.query('DELETE FROM original_file_data WHERE session_id = $1', [sessionId]);
    
    // Store each row with its row number (1-based to match Excel)
    for (let i = 0; i < fileData.length; i++) {
      const rowNumber = i + 1;
      const query = `
        INSERT INTO original_file_data (session_id, row_number, row_data, column_headers)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(query, [
        sessionId,
        rowNumber,
        JSON.stringify(fileData[i]),
        headers ? JSON.stringify(headers) : null
      ]);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get original file data for specific row numbers
export async function getOriginalFileDataByRows(
  sessionId: string,
  rowNumbers: number[]
): Promise<Array<{ rowNumber: number; data: Record<string, any>; headers?: string[] }> | null> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT row_number, row_data, column_headers 
      FROM original_file_data 
      WHERE session_id = $1 AND row_number = ANY($2)
      ORDER BY row_number
    `;
    const result = await client.query(query, [sessionId, rowNumbers]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows.map(row => ({
      rowNumber: row.row_number,
      data: row.row_data,
      headers: row.column_headers
    }));
  } finally {
    client.release();
  }
}

// Get original file data for row comparison (legacy function for backwards compatibility)
export async function getOriginalFileData(sessionId: string): Promise<Array<Record<string, any>> | null> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT row_data 
      FROM original_file_data 
      WHERE session_id = $1 
      ORDER BY row_number
    `;
    const result = await client.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows.map(row => row.row_data);
  } finally {
    client.release();
  }
}

// Get column headers for a session
export async function getOriginalFileHeaders(sessionId: string): Promise<string[] | null> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT column_headers 
      FROM original_file_data 
      WHERE session_id = $1 AND column_headers IS NOT NULL
      LIMIT 1
    `;
    const result = await client.query(query, [sessionId]);
    return result.rows[0]?.column_headers || null;
  } finally {
    client.release();
  }
}

// Delete multiple duplicate pairs by IDs
export async function deleteDuplicatePairs(pairIds: string[]): Promise<{ deletedCount: number }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete the pairs
    const placeholders = pairIds.map((_, index) => `$${index + 1}`).join(',');
    const deleteQuery = `
      DELETE FROM duplicate_pairs 
      WHERE id IN (${placeholders})
    `;
    
    const deleteResult = await client.query(deleteQuery, pairIds);
    
    // Update session statistics for affected sessions
    if (deleteResult.rowCount && deleteResult.rowCount > 0) {
      const updateStatsQuery = `
        UPDATE sessions 
        SET statistics = json_build_object(
          'total_pairs', COALESCE((
            SELECT COUNT(*) 
            FROM duplicate_pairs 
            WHERE session_id = sessions.id
          ), 0),
          'pending', COALESCE((
            SELECT COUNT(*) 
            FROM duplicate_pairs 
            WHERE session_id = sessions.id AND status = 'pending'
          ), 0),
          'merged', COALESCE((
            SELECT COUNT(*) 
            FROM duplicate_pairs 
            WHERE session_id = sessions.id AND status = 'merged'
          ), 0),
          'duplicate', COALESCE((
            SELECT COUNT(*) 
            FROM duplicate_pairs 
            WHERE session_id = sessions.id AND status = 'duplicate'
          ), 0),
          'not_duplicate', COALESCE((
            SELECT COUNT(*) 
            FROM duplicate_pairs 
            WHERE session_id = sessions.id AND status = 'not_duplicate'
          ), 0),
          'skipped', COALESCE((
            SELECT COUNT(*) 
            FROM duplicate_pairs 
            WHERE session_id = sessions.id AND status = 'skipped'
          ), 0)
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT DISTINCT session_id 
          FROM duplicate_pairs 
          WHERE id = ANY($1::text[])
        )
      `;

      await client.query(updateStatsQuery, [pairIds]);
    }
    
    await client.query('COMMIT');
    
    return { deletedCount: deleteResult.rowCount || 0 };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get real-time session statistics for the UI
export async function getSessionStatistics(sessionId: string): Promise<{
  total_pairs: number;
  pending: number;
  duplicate: number;
  not_duplicate: number;
  skipped: number;
  auto_merged: number;
} | null> {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        COUNT(*) as total_pairs,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'duplicate') as duplicate,
        COUNT(*) FILTER (WHERE status = 'not_duplicate') as not_duplicate,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
        COUNT(*) FILTER (WHERE status = 'merged') as auto_merged
      FROM duplicate_pairs 
      WHERE session_id = $1
    `;
    const result = await client.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      total_pairs: parseInt(row.total_pairs),
      pending: parseInt(row.pending),
      duplicate: parseInt(row.duplicate),
      not_duplicate: parseInt(row.not_duplicate),
      skipped: parseInt(row.skipped),
      auto_merged: parseInt(row.auto_merged)
    };
  } finally {
    client.release();
  }
}

// Cleanup function for old sessions
export async function cleanupOldSessions(daysOld: number = 30): Promise<number> {
  const client = await pool.connect();
  try {
    const query = 'SELECT cleanup_old_sessions($1) as deleted_count';
    const result = await client.query(query, [daysOld]);
    return result.rows[0]?.deleted_count || 0;
  } finally {
    client.release();
  }
}

// Update session metadata with UI state and progress
export async function updateSessionMetadata(
  sessionId: string,
  metadataUpdates: Record<string, any>
): Promise<void> {
  const client = await pool.connect();
  try {
    // First get existing metadata
    const getQuery = 'SELECT metadata FROM user_sessions WHERE id = $1::uuid';
    const getResult = await client.query(getQuery, [sessionId]);
    
    if (getResult.rows.length === 0) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Merge with existing metadata
    const currentMetadata = getResult.rows[0].metadata || {};
    const mergedMetadata = {
      ...currentMetadata,
      ...metadataUpdates,
      last_updated: new Date().toISOString()
    };
    
    // Update the session
    const updateQuery = `
      UPDATE user_sessions 
      SET 
        metadata = $1,
        last_accessed = CURRENT_TIMESTAMP
      WHERE id = $2::uuid
    `;
    
    await client.query(updateQuery, [JSON.stringify(mergedMetadata), sessionId]);
    
    console.log(`Updated session ${sessionId} metadata:`, mergedMetadata);
  } finally {
    client.release();
  }
}

// Function aliases for backward compatibility
export const createSession = createUserSession;
export const getSessionById = getUserSession;
export const getSessionDuplicatePairs = getDuplicatePairsForSession;