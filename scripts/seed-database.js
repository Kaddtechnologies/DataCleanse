const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'mdm_dedup',
  user: 'mdm_user',
  password: 'mdm_password123',
  ssl: false
});

// Comprehensive seed data generator
class DatabaseSeeder {
  constructor() {
    this.sessionId = null;
    this.fileUploadId = null;
    this.createdPairIds = [];
  }

  // Generate realistic company data
  generateCompanyData() {
    const companies = [
      // High confidence duplicates (exact matches with variations)
      { name: 'Acme Corporation', address: '123 Main Street', city: 'New York', country: 'United States', tpi: 'TPI-001', rowNumber: 1 },
      { name: 'ACME Corp', address: '123 Main St', city: 'New York', country: 'USA', tpi: 'TPI-001-DUP', rowNumber: 2 },
      
      { name: 'TechSolutions Inc', address: '456 Technology Drive', city: 'San Francisco', country: 'United States', tpi: 'TPI-002', rowNumber: 3 },
      { name: 'Tech Solutions Inc.', address: '456 Tech Drive', city: 'San Francisco', country: 'USA', tpi: 'TPI-002A', rowNumber: 4 },
      
      { name: 'Global Manufacturing Ltd', address: '789 Industrial Blvd', city: 'Detroit', country: 'United States', tpi: 'TPI-003', rowNumber: 5 },
      { name: 'Global Manufacturing Limited', address: '789 Industrial Boulevard', city: 'Detroit', country: 'USA', tpi: 'TPI-003-B', rowNumber: 6 },
      
      // Medium confidence duplicates (similar but questionable)
      { name: 'DataFlow Systems', address: '100 Data Center Way', city: 'Austin', country: 'United States', tpi: 'TPI-004', rowNumber: 7 },
      { name: 'Data Flow Corp', address: '200 Information Pkwy', city: 'Austin', country: 'USA', tpi: 'TPI-004X', rowNumber: 8 },
      
      { name: 'Innovation Labs LLC', address: '300 Research Park', city: 'Boston', country: 'United States', tpi: 'TPI-005', rowNumber: 9 },
      { name: 'Innovative Solutions', address: '400 Development Ave', city: 'Boston', country: 'USA', tpi: 'TPI-005Y', rowNumber: 10 },
      
      { name: 'Pacific Dynamics', address: '500 Ocean View Dr', city: 'Los Angeles', country: 'United States', tpi: 'TPI-006', rowNumber: 11 },
      { name: 'Pacific Dynamic Systems', address: '600 Coastal Blvd', city: 'Los Angeles', country: 'USA', tpi: 'TPI-006Z', rowNumber: 12 },
      
      // Low confidence / Not duplicates (different companies)
      { name: 'Atlantic Engineering', address: '700 Harbor Street', city: 'Miami', country: 'United States', tpi: 'TPI-007', rowNumber: 13 },
      { name: 'Pacific Construction', address: '800 Mountain Road', city: 'Denver', country: 'USA', tpi: 'TPI-008', rowNumber: 14 },
      
      { name: 'Northern Logistics', address: '900 Warehouse Ave', city: 'Chicago', country: 'United States', tpi: 'TPI-009', rowNumber: 15 },
      { name: 'Southern Transport', address: '1000 Shipping Lane', city: 'Atlanta', country: 'USA', tpi: 'TPI-010', rowNumber: 16 },
      
      // Invalid records for testing
      { name: '', address: '1100 Empty Name St', city: 'Phoenix', country: 'USA', tpi: 'TPI-011', rowNumber: 17 },
      { name: 'Valid Company Name', address: '1100 Empty Name St', city: 'Phoenix', country: 'USA', tpi: 'TPI-011A', rowNumber: 18 },
      
      { name: 'N/A', address: '1200 Invalid Corp Dr', city: 'Seattle', country: 'USA', tpi: 'TPI-012', rowNumber: 19 },
      { name: 'Another Valid Company', address: '1200 Invalid Corp Dr', city: 'Seattle', country: 'USA', tpi: 'TPI-012A', rowNumber: 20 },
      
      // Additional unique companies
      { name: 'Quantum Enterprises', address: '1300 Science Pkwy', city: 'Portland', country: 'USA', tpi: 'TPI-013', rowNumber: 21 },
      { name: 'Stellar Industries', address: '1400 Galaxy Road', city: 'Nashville', country: 'USA', tpi: 'TPI-014', rowNumber: 22 },
      { name: 'Digital Dynamics Corp', address: '1500 Binary Blvd', city: 'Orlando', country: 'USA', tpi: 'TPI-015', rowNumber: 23 },
      { name: 'Fusion Technologies', address: '1600 Energy Dr', city: 'Houston', country: 'USA', tpi: 'TPI-016', rowNumber: 24 },
      { name: 'Precision Manufacturing', address: '1700 Quality Ave', city: 'Cleveland', country: 'USA', tpi: 'TPI-017', rowNumber: 25 }
    ];
    
    return companies;
  }

  // Calculate similarity score between two companies
  calculateSimilarityScore(company1, company2) {
    const nameSim = this.stringSimilarity(company1.name, company2.name);
    const addressSim = this.stringSimilarity(company1.address, company2.address);
    const citySim = this.stringSimilarity(company1.city, company2.city);
    const countrySim = this.stringSimilarity(company1.country, company2.country);
    const tpiSim = this.stringSimilarity(company1.tpi, company2.tpi);
    
    // Weighted average
    return (nameSim * 0.4 + addressSim * 0.25 + citySim * 0.15 + countrySim * 0.1 + tpiSim * 0.1);
  }

  // Simple string similarity (Levenshtein-based)
  stringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  // Generate realistic vector embeddings (384 dimensions)
  generateEmbedding() {
    const embedding = [];
    for (let i = 0; i < 384; i++) {
      // Generate normalized values between -1 and 1
      embedding.push((Math.random() - 0.5) * 2);
    }
    return embedding;
  }

  // Generate AI analysis based on similarity score
  generateAIAnalysis(score, reasoning) {
    let confidence, recommendation;
    
    if (score >= 0.95) {
      confidence = 'Very High';
      recommendation = 'merge';
    } else if (score >= 0.85) {
      confidence = 'High';
      recommendation = 'duplicate';
    } else if (score >= 0.70) {
      confidence = 'Medium';
      recommendation = 'review';
    } else {
      confidence = 'Low';
      recommendation = 'not_duplicate';
    }

    return {
      confidence,
      reasoning,
      recommendation,
      similarity_breakdown: {
        name_similarity: score * 0.9 + Math.random() * 0.1,
        address_similarity: score * 0.8 + Math.random() * 0.2,
        location_similarity: score * 0.95 + Math.random() * 0.05,
        contextual_similarity: score * 0.85 + Math.random() * 0.15
      },
      risk_factors: score < 0.8 ? ['Different addresses', 'Name variations'] : [],
      confidence_score: score * 100
    };
  }

  async seed() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🌱 Starting comprehensive database seeding...\n');
      
      // Phase 1: Create session with comprehensive metadata
      console.log('📋 Phase 1: Creating test session...');
      
      const sessionMetadata = {
        created_from: 'seed_script',
        timestamp: new Date().toISOString(),
        quick_actions: {
          bulk_merge_performed: true,
          bulk_merge_count: 3,
          bulk_merge_timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          total_bulk_merges: 3
        },
        invalid_records: {
          detected: true,
          deleted: true,
          deleted_count: 1,
          deleted_timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
          deleted_pair_ids: [] // Will be populated later
        },
        ai_analysis: {
          total_analyzed: 12,
          pending_analysis: 8
        },
        review_progress: 65,
        ui_state: {
          file_name: 'comprehensive-test-data.csv',
          file_size: 2048,
          last_action: 'manual_review',
          session_complete: false,
          sections_visible: {
            file_upload: true,
            blocking_strategy: false,
            column_mapping: false,
            review_progress: true,
            bulk_actions: true
          },
          export_history: [
            {
              timestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
              type: 'duplicate_pairs',
              format: 'csv',
              record_count: 15
            }
          ]
        }
      };

      const sessionResult = await client.query(`
        INSERT INTO user_sessions (
          session_name, file_name, file_hash, user_id, 
          total_pairs, processed_pairs, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        'Demo Session - Complete MDM Workflow',
        'comprehensive-test-data.csv',
        'sha256-abc123def456',
        'demo-user',
        0, // Will be updated later
        0, // Will be updated later
        JSON.stringify(sessionMetadata)
      ]);

      this.sessionId = sessionResult.rows[0].id;
      console.log(`   ✅ Created session: ${this.sessionId}`);

      // Phase 2: Add file upload record
      console.log('📁 Phase 2: Creating file upload record...');
      
      const uploadResult = await client.query(`
        INSERT INTO file_uploads (
          session_id, original_filename, file_size, file_hash,
          column_mapping, processing_config, processing_status,
          processing_started_at, processing_completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        this.sessionId,
        'comprehensive-test-data.csv',
        2048,
        'sha256-abc123def456',
        JSON.stringify({
          customer_name: 'name',
          address: 'address',
          city: 'city',
          country: 'country',
          tpi: 'tpi'
        }),
        JSON.stringify({
          use_prefix: true,
          use_metaphone: false,
          use_soundex: false,
          use_ngram: false,
          use_ai: true,
          name_threshold: 70,
          overall_threshold: 70
        }),
        'completed',
        new Date(Date.now() - 7200000), // 2 hours ago
        new Date(Date.now() - 5400000)  // 1.5 hours ago
      ]);

      this.fileUploadId = uploadResult.rows[0].id;
      console.log(`   ✅ Created file upload: ${this.fileUploadId}`);

      // Phase 3: Store original file data
      console.log('📊 Phase 3: Storing original file data...');
      
      const companies = this.generateCompanyData();
      
      for (const company of companies) {
        await client.query(`
          INSERT INTO original_file_data (
            session_id, row_number, row_data, column_headers
          ) VALUES ($1, $2, $3, $4)
        `, [
          this.sessionId,
          company.rowNumber,
          JSON.stringify(company),
          JSON.stringify(['name', 'address', 'city', 'country', 'tpi'])
        ]);
      }
      
      console.log(`   ✅ Stored ${companies.length} original records`);

      // Phase 4: Create session config
      console.log('⚙️ Phase 4: Adding session configuration...');
      
      await client.query(`
        INSERT INTO session_config (session_id, config_key, config_value)
        VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7)
      `, [
        this.sessionId,
        'blocking_strategy', JSON.stringify({
          use_prefix: true,
          use_metaphone: false,
          use_soundex: false,
          use_ngram: false,
          prefix_length: 3
        }),
        'ai_settings', JSON.stringify({
          provider: 'azure_openai',
          model: 'gpt-4.1-nano',
          temperature: 0.1,
          max_tokens: 500
        }),
        'export_settings', JSON.stringify({
          default_format: 'csv',
          include_ai_analysis: true,
          include_scores: true
        })
      ]);
      
      console.log('   ✅ Added session configurations');

      // Phase 5: Create duplicate pairs with comprehensive data
      console.log('🔍 Phase 5: Creating duplicate pairs...');
      
      const duplicatePairs = [
        // High confidence pairs (will be bulk merged)
        { companies: [companies[0], companies[1]], status: 'merged', confidence: 'high' },
        { companies: [companies[2], companies[3]], status: 'merged', confidence: 'high' },
        { companies: [companies[4], companies[5]], status: 'merged', confidence: 'high' },
        
        // Medium confidence pairs (manual review)
        { companies: [companies[6], companies[7]], status: 'duplicate', confidence: 'medium' },
        { companies: [companies[8], companies[9]], status: 'not_duplicate', confidence: 'medium' },
        { companies: [companies[10], companies[11]], status: 'skipped', confidence: 'medium' },
        
        // Low confidence pairs
        { companies: [companies[12], companies[13]], status: 'not_duplicate', confidence: 'low' },
        { companies: [companies[14], companies[15]], status: 'not_duplicate', confidence: 'low' },
        
        // Invalid record pairs (one will be deleted)
        { companies: [companies[16], companies[17]], status: 'pending', confidence: 'high', invalid: true },
        { companies: [companies[18], companies[19]], status: 'pending', confidence: 'high', invalid: true },
        
        // Pending pairs for ongoing review
        { companies: [companies[20], companies[21]], status: 'pending', confidence: 'medium' },
        { companies: [companies[22], companies[23]], status: 'pending', confidence: 'low' },
        { companies: [companies[0], companies[24]], status: 'pending', confidence: 'low' }
      ];

      for (let i = 0; i < duplicatePairs.length; i++) {
        const pair = duplicatePairs[i];
        const [company1, company2] = pair.companies;
        const similarity = this.calculateSimilarityScore(company1, company2);
        
        // Generate embeddings
        const embedding1 = this.generateEmbedding();
        const embedding2 = this.generateEmbedding();
        const combinedEmbedding = this.generateEmbedding();
        
        // Generate AI analysis for reviewed pairs
        let aiAnalysis = null;
        let analysisTimestamp = null;
        
        if (pair.status !== 'pending') {
          const reasoning = pair.status === 'merged' 
            ? 'High similarity across all fields with clear entity match'
            : pair.status === 'duplicate'
            ? 'Strong evidence suggests same entity with minor variations'
            : pair.status === 'not_duplicate'
            ? 'Different entities despite some surface similarities'
            : 'User chose to skip this pair for later review';
            
          aiAnalysis = this.generateAIAnalysis(similarity, reasoning);
          analysisTimestamp = new Date(Date.now() - Math.random() * 3600000); // Random time in last hour
        }

        const pairResult = await client.query(`
          INSERT INTO duplicate_pairs (
            session_id, record1_data, record2_data, 
            fuzzy_similarity_score, semantic_similarity_score, combined_confidence_score,
            record1_embedding, record2_embedding, combined_embedding,
            status, confidence_level, enhanced_confidence, enhanced_score, original_score,
            cached_ai_analysis, analysis_timestamp, decided_at, decision_user,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          ) RETURNING id
        `, [
          this.sessionId,
          JSON.stringify(company1),
          JSON.stringify(company2),
          similarity,
          similarity * 0.95 + Math.random() * 0.05, // Slight variation
          similarity * 0.9 + Math.random() * 0.1,   // More variation
          JSON.stringify(embedding1),
          JSON.stringify(embedding2),
          JSON.stringify(combinedEmbedding),
          pair.status,
          pair.confidence,
          aiAnalysis ? aiAnalysis.confidence : null,
          aiAnalysis ? aiAnalysis.confidence_score : null,
          similarity * 100,
          aiAnalysis ? JSON.stringify(aiAnalysis) : null,
          analysisTimestamp,
          pair.status !== 'pending' ? new Date(Date.now() - Math.random() * 3600000) : null,
          pair.status !== 'pending' ? 'demo-user' : null,
          new Date(Date.now() - 7200000 + i * 60000), // Staggered creation times
          new Date(Date.now() - 3600000 + i * 30000)  // Staggered update times
        ]);

        this.createdPairIds.push(pairResult.rows[0].id);
        
        // Add decision audit trail for reviewed pairs
        if (pair.status !== 'pending') {
          await client.query(`
            INSERT INTO pair_decisions (
              pair_id, session_id, previous_status, new_status, decision_reason, user_id, decided_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            pairResult.rows[0].id,
            this.sessionId,
            'pending',
            pair.status,
            `Automated decision during seeding - ${pair.status}`,
            'demo-user',
            new Date(Date.now() - Math.random() * 3600000)
          ]);
        }
      }
      
      console.log(`   ✅ Created ${duplicatePairs.length} duplicate pairs`);

      // Phase 6: Delete one invalid pair to simulate cleanup
      console.log('🗑️ Phase 6: Simulating invalid record cleanup...');
      
      const invalidPairId = this.createdPairIds[8]; // First invalid pair
      await client.query('DELETE FROM duplicate_pairs WHERE id = $1', [invalidPairId]);
      
      // Update metadata with deleted pair ID
      sessionMetadata.invalid_records.deleted_pair_ids = [invalidPairId];
      await client.query(`
        UPDATE user_sessions 
        SET metadata = $1 
        WHERE id = $2
      `, [JSON.stringify(sessionMetadata), this.sessionId]);
      
      console.log('   ✅ Deleted 1 invalid pair and updated metadata');

      // Phase 7: Add similarity patterns for ML
      console.log('🧠 Phase 7: Adding similarity patterns...');
      
      const patterns = [
        { pattern: 'corp_corporation', similarity: 0.95, frequency: 15 },
        { pattern: 'inc_incorporated', similarity: 0.98, frequency: 12 },
        { pattern: 'llc_limited', similarity: 0.92, frequency: 8 },
        { pattern: 'street_st', similarity: 0.99, frequency: 25 },
        { pattern: 'avenue_ave', similarity: 0.99, frequency: 18 }
      ];

      for (const pattern of patterns) {
        await client.query(`
          INSERT INTO similarity_patterns (
            pattern_type, pattern_embedding, confidence_weight, sample_count, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          'name_variation',
          JSON.stringify(this.generateEmbedding()),
          pattern.similarity,
          pattern.frequency,
          new Date(Date.now() - Math.random() * 86400000), // Random time in last day
          new Date()
        ]);
      }
      
      console.log(`   ✅ Added ${patterns.length} similarity patterns`);

      // Phase 8: Update session statistics
      console.log('📊 Phase 8: Updating session statistics...');
      
      const remainingPairs = duplicatePairs.length - 1; // One deleted
      const processedPairs = duplicatePairs.filter(p => p.status !== 'pending').length - 1; // Adjust for deleted pair
      
      await client.query(`
        UPDATE user_sessions 
        SET total_pairs = $1, processed_pairs = $2, last_accessed = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [remainingPairs, processedPairs, this.sessionId]);
      
      console.log(`   ✅ Updated session: ${remainingPairs} total, ${processedPairs} processed`);

      await client.query('COMMIT');
      
      console.log('\n🎉 Database seeding completed successfully!');
      console.log('\nSession Summary:');
      console.log(`- Session ID: ${this.sessionId}`);
      console.log(`- Total Pairs: ${remainingPairs}`);
      console.log(`- Processed: ${processedPairs}`);
      console.log(`- Progress: ${Math.round((processedPairs / remainingPairs) * 100)}%`);
      console.log(`- Original Records: ${companies.length}`);
      console.log(`- Similarity Patterns: ${patterns.length}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Run the seeder
async function main() {
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.seed();
    console.log('\n✅ All seeding operations completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Test API: curl "http://localhost:9003/api/sessions/list-with-stats?limit=1"');
    console.log('3. Load the demo session in the UI');
    
  } catch (error) {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { DatabaseSeeder };