import { Pool, PoolClient } from 'pg';
import type { CustomerRecord, DuplicatePair } from '@/types';

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mdm_user:mdm_password123@localhost:5432/mdm_dedup',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection on initialization
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export { pool };

// Database utility functions
export interface UserSession {
  id: string;
  session_name: string;
  file_name?: string;
  file_hash?: string;
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
  userId?: string,
  metadata: Record<string, any> = {}
): Promise<UserSession> {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO user_sessions (session_name, file_name, file_hash, user_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await client.query(query, [sessionName, fileName, fileHash, userId, JSON.stringify(metadata)]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getUserSession(sessionId: string): Promise<UserSession | null> {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM user_sessions WHERE id = $1';
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
      `;
      await client.query(query, [
        sessionId,
        JSON.stringify(pair.record1),
        JSON.stringify(pair.record2),
        pair.similarityScore,
        pair.originalScore || pair.similarityScore * 100,
        pair.enhancedScore || null,
        pair.enhancedConfidence || null
      ]);
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
      WHERE id = $${paramIndex}
    `;

    await client.query(query, values);
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

// Utility function to get session statistics
export async function getSessionStatistics(sessionId: string): Promise<any> {
  const client = await pool.connect();
  try {
    const query = 'SELECT get_session_stats($1) as stats';
    const result = await client.query(query, [sessionId]);
    return result.rows[0]?.stats || null;
  } finally {
    client.release();
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
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