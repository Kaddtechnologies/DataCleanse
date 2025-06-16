# MDM Master Data Cleanse - PostgreSQL + pgVector Implementation Guide

## 📋 Overview

This guide provides complete instructions for implementing PostgreSQL with pgvector to enhance the MDM duplicate detection application with semantic similarity, session management, and intelligent caching.

## 🎯 Goals

1. **Session Persistence**: Save user work sessions and reload them
2. **AI Analysis Caching**: Store and retrieve AI analysis results
3. **Vector-Enhanced Duplicate Detection**: Use semantic similarity for better matches
4. **Smart Confidence Scoring**: Combine fuzzy matching + semantic similarity + business rules
5. **Learning System**: Improve over time based on user decisions

---

## 🐳 Database Setup

### Step 1: PostgreSQL with pgvector in Docker

```bash
# Create a Docker volume for data persistence
docker volume create mdm_postgres_data

# Run PostgreSQL container with pgvector
docker run --name mdm-postgres \
  -e POSTGRES_DB=mdm_dedup \
  -e POSTGRES_USER=mdm_user \
  -e POSTGRES_PASSWORD=mdm_password123 \
  -p 5433:5433 \
  -v mdm_postgres_data:/var/lib/postgresql/data \
  -d pgvector/pgvector:pg16
```

### Step 2: Enable pgvector Extension

```sql
-- Connect to the database and enable the extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 📊 Database Schema

### Core Tables

```sql
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
```

### Indexes for Performance

```sql
-- Primary indexes
CREATE INDEX idx_duplicate_pairs_session ON duplicate_pairs(session_id);
CREATE INDEX idx_duplicate_pairs_status ON duplicate_pairs(status);
CREATE INDEX idx_duplicate_pairs_confidence ON duplicate_pairs(confidence_level);
CREATE INDEX idx_user_sessions_accessed ON user_sessions(last_accessed);

-- Vector similarity indexes (HNSW for speed)
CREATE INDEX idx_record1_embedding ON duplicate_pairs USING hnsw (record1_embedding vector_cosine_ops);
CREATE INDEX idx_record2_embedding ON duplicate_pairs USING hnsw (record2_embedding vector_cosine_ops);
CREATE INDEX idx_combined_embedding ON duplicate_pairs USING hnsw (combined_embedding vector_cosine_ops);
CREATE INDEX idx_similarity_patterns ON similarity_patterns USING hnsw (pattern_embedding vector_cosine_ops);

-- Composite indexes for common queries
CREATE INDEX idx_pairs_session_status ON duplicate_pairs(session_id, status);
CREATE INDEX idx_pairs_confidence_similarity ON duplicate_pairs(confidence_level, fuzzy_similarity_score);
```

---

## 🔧 Next.js Configuration

### Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://mdm_user:mdm_password123@localhost:5433/mdm_dedup
EMBEDDING_API_URL=http://localhost:8000/embed # Your embedding service
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=mdm_dedup
POSTGRES_USER=mdm_user
POSTGRES_PASSWORD=mdm_password123
```

### Database Connection Setup

```typescript
// lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export { pool };
```

---

## 📡 API Endpoints

### Session Management

#### POST /api/sessions/create
```typescript
// app/api/sessions/create/route.ts
export async function POST(request: Request) {
  const { sessionName, fileName, fileHash, totalPairs, metadata } = await request.json();
  
  // Create new session
  const query = `
    INSERT INTO user_sessions (session_name, file_name, file_hash, total_pairs, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  // Return session object
}
```

#### GET /api/sessions/list
```typescript
// app/api/sessions/list/route.ts
export async function GET() {
  // Return list of recent sessions with progress
  const query = `
    SELECT 
      id, session_name, file_name, 
      total_pairs, processed_pairs,
      (processed_pairs::float / NULLIF(total_pairs, 0) * 100) as progress_percentage,
      created_at, last_accessed
    FROM user_sessions 
    ORDER BY last_accessed DESC 
    LIMIT 10
  `;
}
```

#### GET /api/sessions/[sessionId]/load
```typescript
// app/api/sessions/[sessionId]/load/route.ts
export async function GET(request: Request, { params }) {
  const { sessionId } = params;
  
  // Load session and all duplicate pairs
  const sessionQuery = `SELECT * FROM user_sessions WHERE id = $1`;
  const pairsQuery = `
    SELECT 
      id, record1_data, record2_data,
      fuzzy_similarity_score, semantic_similarity_score, combined_confidence_score,
      status, confidence_level, enhanced_confidence,
      enhanced_score, original_score, score_change_reason,
      cached_ai_analysis
    FROM duplicate_pairs 
    WHERE session_id = $1
    ORDER BY created_at
  `;
  
  // Return complete session state
}
```

### Duplicate Pair Management

#### POST /api/duplicate-pairs/create-batch
```typescript
// app/api/duplicate-pairs/create-batch/route.ts
export async function POST(request: Request) {
  const { sessionId, pairs } = await request.json();
  
  // Batch insert duplicate pairs
  // Generate embeddings for each pair
  // Calculate initial similarity scores
  
  const insertQuery = `
    INSERT INTO duplicate_pairs (
      session_id, record1_data, record2_data, 
      fuzzy_similarity_score, record1_embedding, record2_embedding, combined_embedding
    ) VALUES ...
  `;
}
```

#### PUT /api/duplicate-pairs/[pairId]/update
```typescript
// app/api/duplicate-pairs/[pairId]/update/route.ts
export async function PUT(request: Request, { params }) {
  const { pairId } = params;
  const { 
    status, 
    enhancedConfidence, 
    enhancedScore, 
    cachedAiAnalysis 
  } = await request.json();
  
  // Update pair with user decision
  // Log decision in audit trail
  // Update session progress
  // Learn from decision (update similarity patterns)
}
```

### Vector Similarity Search

#### POST /api/vector-search/similar-pairs
```typescript
// app/api/vector-search/similar-pairs/route.ts
export async function POST(request: Request) {
  const { queryEmbedding, threshold = 0.3, limit = 10 } = await request.json();
  
  const query = `
    SELECT 
      id, record1_data, record2_data,
      combined_embedding <=> $1 as similarity_distance,
      1 - (combined_embedding <=> $1) as similarity_score
    FROM duplicate_pairs
    WHERE combined_embedding <=> $1 < $2
    ORDER BY combined_embedding <=> $1
    LIMIT $3
  `;
  
  // Return similar pairs for learning/recommendation
}
```

#### POST /api/vector-search/predict-duplicates
```typescript
// app/api/vector-search/predict-duplicates/route.ts
export async function POST(request: Request) {
  const { sessionId, confidenceThreshold = 0.8 } = await request.json();
  
  // Find potential duplicates using vector similarity that traditional matching missed
  const query = `
    WITH confirmed_patterns AS (
      SELECT pattern_embedding, confidence_weight
      FROM similarity_patterns
      WHERE pattern_type = 'confirmed_duplicate'
    )
    SELECT 
      dp.*,
      AVG(1 - (dp.combined_embedding <=> cp.pattern_embedding)) * cp.confidence_weight as predicted_confidence
    FROM duplicate_pairs dp
    CROSS JOIN confirmed_patterns cp
    WHERE dp.session_id = $1
      AND dp.status = 'pending'
    GROUP BY dp.id
    HAVING AVG(1 - (dp.combined_embedding <=> cp.pattern_embedding)) * cp.confidence_weight > $2
    ORDER BY predicted_confidence DESC
  `;
}
```

### Enhanced AI Analysis

#### POST /api/ai-analysis/enhanced
```typescript
// app/api/ai-analysis/enhanced/route.ts
export async function POST(request: Request) {
  const { pairId, record1, record2, fuzzyScore } = await request.json();
  
  // 1. Check if cached analysis exists
  // 2. If not, get embeddings and run enhanced analysis
  // 3. Combine fuzzy + semantic + business rules
  // 4. Cache result in database
  // 5. Update similarity patterns for learning
  
  const enhancedAnalysis = {
    semanticSimilarity: 0.92,
    fuzzyScore: fuzzyScore,
    combinedScore: (fuzzyScore * 0.4 + semanticSimilarity * 0.6),
    confidenceLevel: 'high',
    reasoning: 'High semantic similarity with strong fuzzy match',
    smartAnalysis: { /* existing smart analysis */ }
  };
}
```

---

## 🤖 Embedding Service Integration

### Embedding Generation Strategy

```typescript
// lib/embeddings.ts
interface EmbeddingRequest {
  text: string;
  model?: string;
}

interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
}

// Generate embedding for a record
export async function generateRecordEmbedding(record: CustomerRecord): Promise<number[]> {
  // Combine key fields for holistic embedding
  const textForEmbedding = [
    record.name,
    record.address,
    record.city,
    record.country,
    record.tpi
  ].filter(Boolean).join(' | ');
  
  // Call your embedding service (OpenAI, Sentence Transformers, etc.)
  const response = await fetch(process.env.EMBEDDING_API_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: textForEmbedding })
  });
  
  const { embedding } = await response.json();
  return embedding;
}

// Generate combined embedding for pair similarity
export async function generatePairEmbedding(record1: CustomerRecord, record2: CustomerRecord): Promise<number[]> {
  const combinedText = `${generateRecordText(record1)} [SEP] ${generateRecordText(record2)}`;
  return generateEmbedding(combinedText);
}
```

---

## 🧠 Smart Confidence Scoring Algorithm

### Weighted Similarity Calculation

```typescript
// lib/similarity.ts
interface SimilarityScores {
  fuzzyScore: number;
  semanticScore: number;
  businessRulesScore: number;
  combinedScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

export function calculateEnhancedSimilarity(
  fuzzyScore: number,
  semanticScore: number,
  businessRulesScore: number,
  userPatterns: number[] = []
): SimilarityScores {
  
  // Weighted combination based on reliability
  const weights = {
    fuzzy: 0.3,
    semantic: 0.4,
    businessRules: 0.2,
    userPatterns: 0.1
  };
  
  const userPatternsScore = userPatterns.length > 0 
    ? userPatterns.reduce((a, b) => a + b, 0) / userPatterns.length 
    : 0;
  
  const combinedScore = 
    (fuzzyScore * weights.fuzzy) +
    (semanticScore * weights.semantic) +
    (businessRulesScore * weights.businessRules) +
    (userPatternsScore * weights.userPatterns);
  
  let confidenceLevel: 'low' | 'medium' | 'high';
  if (combinedScore >= 0.85) confidenceLevel = 'high';
  else if (combinedScore >= 0.65) confidenceLevel = 'medium';
  else confidenceLevel = 'low';
  
  return {
    fuzzyScore,
    semanticScore,
    businessRulesScore,
    combinedScore,
    confidenceLevel
  };
}
```

---

## 📚 Learning System Implementation

### Pattern Learning from User Decisions

```sql
-- Update similarity patterns when user makes decisions
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

-- Trigger to automatically update patterns
CREATE TRIGGER trigger_update_similarity_patterns
  AFTER UPDATE OF status ON duplicate_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_similarity_patterns();
```

---

## 🔍 Advanced Vector Queries

### Smart Duplicate Discovery

```sql
-- Find potential duplicates missed by fuzzy matching
WITH semantic_candidates AS (
  SELECT 
    dp1.id as pair1_id,
    dp2.id as pair2_id,
    dp1.record1_data,
    dp2.record1_data,
    1 - (dp1.combined_embedding <=> dp2.combined_embedding) as semantic_similarity
  FROM duplicate_pairs dp1
  CROSS JOIN duplicate_pairs dp2
  WHERE dp1.session_id = $1
    AND dp2.session_id = $1
    AND dp1.id != dp2.id
    AND 1 - (dp1.combined_embedding <=> dp2.combined_embedding) > 0.8
    AND NOT EXISTS (
      SELECT 1 FROM duplicate_pairs dp3
      WHERE (dp3.record1_data = dp1.record1_data AND dp3.record2_data = dp2.record1_data)
         OR (dp3.record1_data = dp2.record1_data AND dp3.record2_data = dp1.record1_data)
    )
)
SELECT * FROM semantic_candidates
ORDER BY semantic_similarity DESC
LIMIT 20;
```

### Confidence Boosting Based on Patterns

```sql
-- Boost confidence for pairs similar to confirmed duplicates
UPDATE duplicate_pairs dp
SET 
  enhanced_confidence = 'high',
  enhanced_score = LEAST(100, 
    dp.fuzzy_similarity_score * 100 + 
    (SELECT AVG(1 - (dp.combined_embedding <=> sp.pattern_embedding)) * sp.confidence_weight * 20
     FROM similarity_patterns sp 
     WHERE sp.pattern_type = 'confirmed_duplicate')
  )
WHERE dp.session_id = $1
  AND dp.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM similarity_patterns sp
    WHERE sp.pattern_type = 'confirmed_duplicate'
      AND 1 - (dp.combined_embedding <=> sp.pattern_embedding) > 0.75
  );
```

---

## 🚀 Implementation Phases

### Phase 1: Database Setup & Basic Session Management
1. Set up PostgreSQL with pgvector
2. Create database schema
3. Implement session CRUD operations
4. Basic duplicate pair storage

### Phase 2: Vector Integration
1. Add embedding generation service
2. Implement vector similarity search
3. Enhanced similarity scoring
4. Smart confidence boosting

### Phase 3: Learning System
1. Pattern learning from user decisions
2. Predictive duplicate detection
3. Confidence score improvements
4. Advanced vector queries

### Phase 4: Production Optimization
1. Performance tuning
2. Batch processing
3. Background jobs for embeddings
4. Monitoring and analytics

---

## 📦 Required Dependencies

### Backend Dependencies
```json
{
  "pg": "^8.11.0",
  "@types/pg": "^8.10.0",
  "pgvector": "^0.1.8"
}
```

### Docker Services
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: mdm_dedup
      POSTGRES_USER: mdm_user
      POSTGRES_PASSWORD: mdm_password123
    ports:
      - "5433:5433"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  embedding-service:
    # Your embedding service container
    ports:
      - "8000:8000"

volumes:
  postgres_data:
```

---

## 🎯 Success Metrics

### Key Performance Indicators
1. **Duplicate Detection Accuracy**: Target 15-30% improvement
2. **User Decision Learning**: Confidence scores improve over time
3. **Performance**: Sub-second response times for similarity searches
4. **Session Recovery**: 100% successful session restoration
5. **Cache Hit Rate**: >80% for AI analysis requests

### Monitoring Queries
```sql
-- Session activity
SELECT 
  DATE(created_at) as date,
  COUNT(*) as sessions_created,
  AVG(processed_pairs::float / NULLIF(total_pairs, 0)) as avg_completion_rate
FROM user_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Similarity score improvements
SELECT 
  confidence_level,
  AVG(enhanced_score - original_score) as avg_improvement,
  COUNT(*) as count
FROM duplicate_pairs
WHERE enhanced_score IS NOT NULL AND original_score IS NOT NULL
GROUP BY confidence_level;

-- Pattern learning effectiveness
SELECT 
  pattern_type,
  sample_count,
  confidence_weight,
  updated_at
FROM similarity_patterns
ORDER BY sample_count DESC;
```

---

## ⚠️ Implementation Notes

### Important Considerations
1. **Embedding Model Consistency**: Use the same model throughout
2. **Vector Dimensions**: Ensure all embeddings are same dimension (384)
3. **Index Maintenance**: HNSW indexes may need periodic optimization
4. **Backup Strategy**: Include vector data in backup procedures
5. **Migration Path**: Plan for moving to Python backend later

### Performance Tips
1. Batch embedding generation for better throughput
2. Use connection pooling for database
3. Consider caching frequently accessed embeddings
4. Monitor index performance and rebuild if needed

This implementation guide provides a complete roadmap for transforming your MDM application into an intelligent, learning system that improves over time while maintaining full session persistence and enhanced duplicate detection capabilities. 