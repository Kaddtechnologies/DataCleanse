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

-- =====================================
-- BUSINESS RULES ENGINE TABLES
-- =====================================

-- Main business rules table
CREATE TABLE business_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    author VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100),
    version VARCHAR(20) DEFAULT '1.0.0',
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'pending_approval', 'active', 'deprecated', 'disabled')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    accuracy FLOAT CHECK (accuracy >= 0 AND accuracy <= 100),
    
    -- Rule code and logic
    rule_code TEXT NOT NULL, -- The actual TypeScript/JavaScript code
    rule_type VARCHAR(50) DEFAULT 'custom', -- custom, joint_venture, hierarchy, geographic, etc.
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- industries, keywords, confidence, estimatedExecutionTime, tags
    
    -- Performance metrics
    execution_count BIGINT DEFAULT 0,
    total_execution_time FLOAT DEFAULT 0, -- milliseconds
    avg_execution_time FLOAT DEFAULT 0, -- milliseconds
    last_executed_at TIMESTAMP,
    
    -- Configuration
    config JSONB DEFAULT '{}', -- Rule-specific configuration parameters
    enabled BOOLEAN DEFAULT true,
    
    -- AI generation metadata
    ai_generated BOOLEAN DEFAULT false,
    ai_conversation_id UUID,
    ai_generation_metadata JSONB -- prompt used, model version, etc.
);

-- Rule approval workflow table
CREATE TABLE rule_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES business_rules(id) ON DELETE CASCADE,
    approval_level VARCHAR(50) NOT NULL CHECK (approval_level IN ('technical', 'business', 'governance')),
    approver_id VARCHAR(100) NOT NULL,
    approver_name VARCHAR(255),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'request_changes')),
    approval_date TIMESTAMP,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(rule_id, approval_level)
);

-- Test cases for business rules
CREATE TABLE rule_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES business_rules(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    record1_data JSONB NOT NULL, -- Test CustomerRecord 1
    record2_data JSONB NOT NULL, -- Test CustomerRecord 2
    expected_result JSONB NOT NULL, -- Expected RuleResult
    test_type VARCHAR(30) DEFAULT 'standard' CHECK (test_type IN ('standard', 'edge_case', 'performance', 'regression')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    UNIQUE(rule_id, name)
);

-- Test execution results
CREATE TABLE rule_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES business_rules(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES rule_test_cases(id) ON DELETE CASCADE,
    test_run_id UUID, -- Groups tests run together
    passed BOOLEAN NOT NULL,
    actual_result JSONB,
    expected_result JSONB,
    execution_time FLOAT, -- milliseconds
    error_message TEXT,
    stack_trace TEXT,
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tested_by VARCHAR(100),
    test_environment VARCHAR(50) DEFAULT 'sandbox' -- sandbox, staging, production
);

-- Rule deployment history
CREATE TABLE rule_deployment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES business_rules(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    deployment_type VARCHAR(20) CHECK (deployment_type IN ('deploy', 'rollback', 'update', 'disable')),
    deployed_by VARCHAR(100) NOT NULL,
    deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deployment_environment VARCHAR(50) DEFAULT 'production',
    previous_version VARCHAR(20),
    deployment_metadata JSONB, -- includes approval chain, test results summary, etc.
    rollback_reason TEXT,
    success BOOLEAN DEFAULT true,
    impact_assessment JSONB -- affected pairs count, performance impact, etc.
);

-- AI conversation sessions for rule creation
CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    steward_id VARCHAR(100) NOT NULL,
    session_name VARCHAR(255),
    business_context JSONB DEFAULT '{}', -- industry, region, common scenarios
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    rules_generated INTEGER DEFAULT 0,
    conversation_metadata JSONB DEFAULT '{}' -- message count, duration, etc.
);

-- Conversation messages
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) CHECK (message_type IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    message_metadata JSONB DEFAULT '{}', -- rule_generated, test_triggered, clarification_request, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sequence_number INTEGER NOT NULL
);

-- Rule execution statistics
CREATE TABLE rule_execution_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES business_rules(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    pair_id UUID REFERENCES duplicate_pairs(id) ON DELETE SET NULL,
    execution_time FLOAT NOT NULL, -- milliseconds
    action_taken VARCHAR(50), -- keep_separate, continue_evaluation, force_merge
    confidence_score FLOAT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_metadata JSONB DEFAULT '{}' -- memory usage, cpu time, etc.
);

-- Create indexes for business rules tables
CREATE INDEX idx_business_rules_status ON business_rules(status);
CREATE INDEX idx_business_rules_author ON business_rules(author);
CREATE INDEX idx_business_rules_priority ON business_rules(priority);
CREATE INDEX idx_business_rules_type ON business_rules(rule_type);
CREATE INDEX idx_business_rules_enabled ON business_rules(enabled, status);
CREATE INDEX idx_business_rules_ai_conversation ON business_rules(ai_conversation_id);

CREATE INDEX idx_rule_approvals_rule ON rule_approvals(rule_id);
CREATE INDEX idx_rule_approvals_status ON rule_approvals(approval_status);
CREATE INDEX idx_rule_approvals_approver ON rule_approvals(approver_id);

CREATE INDEX idx_rule_test_cases_rule ON rule_test_cases(rule_id);
CREATE INDEX idx_rule_test_results_rule ON rule_test_results(rule_id);
CREATE INDEX idx_rule_test_results_test_case ON rule_test_results(test_case_id);
CREATE INDEX idx_rule_test_results_run ON rule_test_results(test_run_id);

CREATE INDEX idx_rule_deployment_rule ON rule_deployment_history(rule_id);
CREATE INDEX idx_rule_deployment_type ON rule_deployment_history(deployment_type);
CREATE INDEX idx_rule_deployment_date ON rule_deployment_history(deployed_at);

CREATE INDEX idx_conversation_sessions_steward ON conversation_sessions(steward_id);
CREATE INDEX idx_conversation_sessions_status ON conversation_sessions(status);
CREATE INDEX idx_conversation_messages_session ON conversation_messages(session_id);
CREATE INDEX idx_conversation_messages_sequence ON conversation_messages(session_id, sequence_number);

CREATE INDEX idx_rule_execution_stats_rule ON rule_execution_stats(rule_id);
CREATE INDEX idx_rule_execution_stats_session ON rule_execution_stats(session_id);
CREATE INDEX idx_rule_execution_stats_date ON rule_execution_stats(executed_at);

-- Function to update business rules stats after execution
CREATE OR REPLACE FUNCTION update_rule_execution_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the business rule's execution statistics
  UPDATE business_rules 
  SET 
    execution_count = execution_count + 1,
    total_execution_time = total_execution_time + NEW.execution_time,
    avg_execution_time = (total_execution_time + NEW.execution_time) / (execution_count + 1),
    last_executed_at = NEW.executed_at
  WHERE id = NEW.rule_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update rule stats
CREATE TRIGGER trigger_update_rule_execution_stats
  AFTER INSERT ON rule_execution_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_rule_execution_stats();

-- Function to validate rule approval chain
CREATE OR REPLACE FUNCTION validate_approval_chain()
RETURNS TRIGGER AS $$
DECLARE
  technical_approved BOOLEAN;
  business_approved BOOLEAN;
BEGIN
  -- Check if trying to approve governance level
  IF NEW.approval_level = 'governance' AND NEW.approval_status = 'approved' THEN
    -- Verify technical and business approvals exist and are approved
    SELECT EXISTS(
      SELECT 1 FROM rule_approvals 
      WHERE rule_id = NEW.rule_id 
      AND approval_level = 'technical' 
      AND approval_status = 'approved'
    ) INTO technical_approved;
    
    SELECT EXISTS(
      SELECT 1 FROM rule_approvals 
      WHERE rule_id = NEW.rule_id 
      AND approval_level = 'business' 
      AND approval_status = 'approved'
    ) INTO business_approved;
    
    IF NOT (technical_approved AND business_approved) THEN
      RAISE EXCEPTION 'Cannot approve governance level without technical and business approvals';
    END IF;
    
    -- Update rule status to active if governance approved
    UPDATE business_rules 
    SET status = 'active' 
    WHERE id = NEW.rule_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate approval chain
CREATE TRIGGER trigger_validate_approval_chain
  BEFORE INSERT OR UPDATE ON rule_approvals
  FOR EACH ROW
  EXECUTE FUNCTION validate_approval_chain();

-- Function to update conversation session metadata
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation session metadata
  UPDATE conversation_sessions 
  SET 
    last_message_at = NEW.created_at,
    updated_at = CURRENT_TIMESTAMP,
    conversation_metadata = jsonb_set(
      COALESCE(conversation_metadata, '{}'),
      '{message_count}',
      to_jsonb(COALESCE((conversation_metadata->>'message_count')::int, 0) + 1)
    )
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation metadata
CREATE TRIGGER trigger_update_conversation_metadata
  AFTER INSERT ON conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_metadata();

-- Grant permissions to the database user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mdm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mdm_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mdm_user;

-- Create initial admin user session for testing
INSERT INTO user_sessions (session_name, user_id, metadata) 
VALUES ('System Test Session', 'system', '{"created_by": "init_script", "purpose": "testing"}');

COMMIT;