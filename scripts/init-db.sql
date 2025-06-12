-- MDM Master Data Cleanse - Database Initialization Script
-- This script creates the complete database schema for session persistence and AI-enhanced duplicate detection

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User sessions for work persistence
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_hash VARCHAR(64), -- SHA256 of uploaded file for integrity
    user_id VARCHAR(100), -- Can be IP address or user identifier
    total_pairs INTEGER DEFAULT 0,
    processed_pairs INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}' -- Store upload stats, filters, etc.
);

-- Enhanced duplicate pairs with vector support
CREATE TABLE duplicate_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    
    -- Original records
    record1_data JSONB NOT NULL,
    record2_data JSONB NOT NULL,
    
    -- Similarity scores
    fuzzy_similarity_score FLOAT NOT NULL, -- Original similarity (0-1)
    semantic_similarity_score FLOAT, -- Vector similarity (0-1)
    combined_confidence_score FLOAT, -- Weighted combination
    
    -- Vector embeddings (384 dimensions for sentence-transformers)
    record1_embedding vector(384),
    record2_embedding vector(384),
    combined_embedding vector(384), -- Embedding of concatenated key fields
    
    -- User decisions and status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'merged', 'not_duplicate', 'skipped', 'duplicate')),
    confidence_level VARCHAR(10) CHECK (confidence_level IN ('low', 'medium', 'high')),
    enhanced_confidence VARCHAR(10), -- Smart analysis result
    
    -- Enhanced scores from smart analysis
    enhanced_score FLOAT,
    original_score FLOAT,
    score_change_reason TEXT,
    
    -- AI Analysis caching
    cached_ai_analysis JSONB, -- Store complete AnalyzeDuplicateConfidenceOutput
    analysis_timestamp TIMESTAMP,
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP,
    decision_user VARCHAR(100)
);

-- User decisions audit trail
CREATE TABLE pair_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_id UUID REFERENCES duplicate_pairs(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    decision_reason TEXT,
    user_id VARCHAR(100),
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector similarity learning patterns
CREATE TABLE similarity_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type VARCHAR(50), -- 'confirmed_duplicate', 'confirmed_not_duplicate', etc.
    pattern_embedding vector(384),
    confidence_weight FLOAT DEFAULT 1.0,
    sample_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session configuration table for storing upload parameters
CREATE TABLE session_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, config_key)
);

-- File upload tracking
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_hash VARCHAR(64),
    column_mapping JSONB,
    processing_config JSONB, -- Store blocking strategies, thresholds, etc.
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'completed', 'failed'))
);

-- Original file data storage for row-by-row comparison
CREATE TABLE original_file_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    column_headers JSONB, -- Store original column headers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, row_number)
);

-- Primary indexes
CREATE INDEX idx_duplicate_pairs_session ON duplicate_pairs(session_id);
CREATE INDEX idx_duplicate_pairs_status ON duplicate_pairs(status);
CREATE INDEX idx_duplicate_pairs_confidence ON duplicate_pairs(confidence_level);
CREATE INDEX idx_user_sessions_accessed ON user_sessions(last_accessed);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_pair_decisions_session ON pair_decisions(session_id);
CREATE INDEX idx_pair_decisions_pair ON pair_decisions(pair_id);
CREATE INDEX idx_session_config_session ON session_config(session_id);
CREATE INDEX idx_file_uploads_session ON file_uploads(session_id);
CREATE INDEX idx_original_file_data_session ON original_file_data(session_id);
CREATE INDEX idx_original_file_data_row ON original_file_data(session_id, row_number);

-- Vector similarity indexes (HNSW for speed)
CREATE INDEX idx_record1_embedding ON duplicate_pairs USING hnsw (record1_embedding vector_cosine_ops);
CREATE INDEX idx_record2_embedding ON duplicate_pairs USING hnsw (record2_embedding vector_cosine_ops);
CREATE INDEX idx_combined_embedding ON duplicate_pairs USING hnsw (combined_embedding vector_cosine_ops);
CREATE INDEX idx_similarity_patterns ON similarity_patterns USING hnsw (pattern_embedding vector_cosine_ops);

-- Composite indexes for common queries
CREATE INDEX idx_pairs_session_status ON duplicate_pairs(session_id, status);
CREATE INDEX idx_pairs_confidence_similarity ON duplicate_pairs(confidence_level, fuzzy_similarity_score);
CREATE INDEX idx_sessions_user_accessed ON user_sessions(user_id, last_accessed);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for duplicate_pairs
CREATE TRIGGER update_duplicate_pairs_updated_at
    BEFORE UPDATE ON duplicate_pairs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for similarity_patterns
CREATE TRIGGER update_similarity_patterns_updated_at
    BEFORE UPDATE ON similarity_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update similarity patterns when user makes decisions
CREATE OR REPLACE FUNCTION update_similarity_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user confirms a duplicate
  IF NEW.status = 'duplicate' OR NEW.status = 'merged' THEN
    INSERT INTO similarity_patterns (pattern_type, pattern_embedding, sample_count)
    VALUES ('confirmed_duplicate', NEW.combined_embedding, 1)
    ON CONFLICT (pattern_type) 
    DO UPDATE SET 
      pattern_embedding = (
        (similarity_patterns.pattern_embedding * similarity_patterns.sample_count + NEW.combined_embedding) 
        / (similarity_patterns.sample_count + 1)
      ),
      sample_count = similarity_patterns.sample_count + 1,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  
  -- When a user confirms NOT a duplicate
  IF NEW.status = 'not_duplicate' THEN
    INSERT INTO similarity_patterns (pattern_type, pattern_embedding, confidence_weight, sample_count)
    VALUES ('confirmed_not_duplicate', NEW.combined_embedding, -0.5, 1)
    ON CONFLICT (pattern_type)
    DO UPDATE SET 
      pattern_embedding = (
        (similarity_patterns.pattern_embedding * similarity_patterns.sample_count + NEW.combined_embedding) 
        / (similarity_patterns.sample_count + 1)
      ),
      sample_count = similarity_patterns.sample_count + 1,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update patterns (disabled by default for performance)
-- Can be enabled when vector embeddings are implemented
-- CREATE TRIGGER trigger_update_similarity_patterns
--   AFTER UPDATE OF status ON duplicate_pairs
--   FOR EACH ROW
--   EXECUTE FUNCTION update_similarity_patterns();

-- Function to update session progress
CREATE OR REPLACE FUNCTION update_session_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update processed_pairs count when status changes from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    UPDATE user_sessions 
    SET processed_pairs = processed_pairs + 1,
        last_accessed = CURRENT_TIMESTAMP
    WHERE id = NEW.session_id;
  -- Decrease count if reverting to pending
  ELSIF OLD.status != 'pending' AND NEW.status = 'pending' THEN
    UPDATE user_sessions 
    SET processed_pairs = GREATEST(0, processed_pairs - 1),
        last_accessed = CURRENT_TIMESTAMP
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session progress
CREATE TRIGGER trigger_update_session_progress
  AFTER UPDATE OF status ON duplicate_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_session_progress();

-- Grant permissions to the database user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mdm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mdm_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mdm_user;

-- Create initial admin user session for testing
INSERT INTO user_sessions (session_name, user_id, metadata) 
VALUES ('System Test Session', 'system', '{"created_by": "init_script", "purpose": "testing"}');

COMMIT;