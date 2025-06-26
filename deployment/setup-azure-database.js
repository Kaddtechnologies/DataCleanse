const { Client } = require('pg');

// Database connection configuration
const dbConfig = {
    host: 'mdm-postgres-pgvector.westus2.azurecontainer.io',
    port: 5432,
    database: 'mdm_dedup',
    user: 'postgres', 
    password: 'mdm_password123',
    ssl: false,
    connectTimeoutMillis: 10000
};

console.log('===============================================');
console.log('  MDM Master Data Cleanse - Azure DB Setup   ');
console.log('===============================================');
console.log('');

async function executeSQL(client, sql, description) {
    console.log(`→ ${description}...`);
    try {
        const result = await client.query(sql);
        console.log(`✅ ${description} completed`);
        return result;
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        throw error;
    }
}

async function setupDatabase() {
    const client = new Client(dbConfig);
    
    try {
        console.log('🔌 Connecting to Azure PostgreSQL container...');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   Database: ${dbConfig.database}`);
        console.log('');
        
        await client.connect();
        console.log('✅ Connected successfully!');
        console.log('');

        // Enable pgvector extension
        await executeSQL(client, 
            'CREATE EXTENSION IF NOT EXISTS vector;',
            'Installing pgvector extension'
        );

        // Create main data tables
        console.log('📋 Creating database schema...');
        
        // Sessions table
        await executeSQL(client, `
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                filename VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                row_count INTEGER DEFAULT 0,
                processed_count INTEGER DEFAULT 0,
                duplicate_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active'
            );
        `, 'Creating sessions table');

        // Original data table
        await executeSQL(client, `
            CREATE TABLE IF NOT EXISTS original_data (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
                row_index INTEGER NOT NULL,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, row_index)
            );
        `, 'Creating original_data table');

        // Processed data table
        await executeSQL(client, `
            CREATE TABLE IF NOT EXISTS processed_data (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
                original_id INTEGER REFERENCES original_data(id) ON DELETE CASCADE,
                data JSONB NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                confidence_score FLOAT,
                embedding vector(384),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `, 'Creating processed_data table');

        // Duplicate pairs table
        await executeSQL(client, `
            CREATE TABLE IF NOT EXISTS duplicate_pairs (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
                record1_id INTEGER REFERENCES processed_data(id) ON DELETE CASCADE,
                record2_id INTEGER REFERENCES processed_data(id) ON DELETE CASCADE,
                confidence_score FLOAT NOT NULL,
                similarity_reasons JSONB,
                status VARCHAR(20) DEFAULT 'pending',
                decision VARCHAR(20),
                decided_by VARCHAR(100),
                decided_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id, record1_id, record2_id)
            );
        `, 'Creating duplicate_pairs table');

        // Business rules table
        await executeSQL(client, `
            CREATE TABLE IF NOT EXISTS business_rules (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                rule_type VARCHAR(50) NOT NULL,
                configuration JSONB NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                version INTEGER DEFAULT 1,
                approval_status VARCHAR(20) DEFAULT 'draft'
            );
        `, 'Creating business_rules table');

        // Field mappings table
        await executeSQL(client, `
            CREATE TABLE IF NOT EXISTS field_mappings (
                id SERIAL PRIMARY KEY,
                session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
                original_field VARCHAR(255) NOT NULL,
                mapped_field VARCHAR(255) NOT NULL,
                data_type VARCHAR(50),
                is_key_field BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `, 'Creating field_mappings table');

        // AI rules table
        await executeSQL(client, `
            CREATE TABLE IF NOT EXISTS ai_rules (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                rule_code TEXT NOT NULL,
                test_cases JSONB,
                performance_metrics JSONB,
                status VARCHAR(20) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deployed_at TIMESTAMP,
                version INTEGER DEFAULT 1
            );
        `, 'Creating ai_rules table');

        // Create indexes for better performance
        console.log('🚀 Creating performance indexes...');
        
        await executeSQL(client, 'CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);', 'Creating sessions index');
        await executeSQL(client, 'CREATE INDEX IF NOT EXISTS idx_original_data_session_id ON original_data(session_id);', 'Creating original_data index');
        await executeSQL(client, 'CREATE INDEX IF NOT EXISTS idx_processed_data_session_id ON processed_data(session_id);', 'Creating processed_data index');
        await executeSQL(client, 'CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_session_id ON duplicate_pairs(session_id);', 'Creating duplicate_pairs index');
        await executeSQL(client, 'CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_confidence ON duplicate_pairs(confidence_score DESC);', 'Creating confidence index');
        await executeSQL(client, 'CREATE INDEX IF NOT EXISTS idx_business_rules_active ON business_rules(is_active);', 'Creating business_rules index');

        // Insert sample business rules
        console.log('📝 Adding sample business rules...');
        
        await executeSQL(client, `
            INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by) 
            VALUES ('Exact Name Match', 'Identifies exact matches on company names', 'exact_match', 
                    '{"fields": ["company_name"], "case_sensitive": false}', true, 'system') 
            ON CONFLICT DO NOTHING;
        `, 'Adding exact name match rule');
        
        await executeSQL(client, `
            INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by)
            VALUES ('Email Domain Match', 'Groups records by email domain', 'similarity',
                    '{"field": "email", "similarity_threshold": 0.8, "method": "domain"}', true, 'system')
            ON CONFLICT DO NOTHING;
        `, 'Adding email domain match rule');
        
        await executeSQL(client, `
            INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by)
            VALUES ('Phone Number Fuzzy Match', 'Matches phone numbers with fuzzy logic', 'fuzzy_match',
                    '{"field": "phone", "threshold": 0.9}', true, 'system')
            ON CONFLICT DO NOTHING;
        `, 'Adding phone fuzzy match rule');
        
        await executeSQL(client, `
            INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by)
            VALUES ('Address Similarity', 'Identifies similar addresses', 'similarity',
                    '{"fields": ["address_line1", "city", "postal_code"], "threshold": 0.85}', true, 'system')
            ON CONFLICT DO NOTHING;
        `, 'Adding address similarity rule');

        // Verify database setup
        console.log('🔍 Verifying database setup...');
        
        const tableCount = await client.query("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public';");
        const ruleCount = await client.query("SELECT COUNT(*) as count FROM business_rules;");

        console.log('');
        console.log('🎉 Database setup completed successfully!');
        console.log('');
        console.log('📊 Database Summary:');
        console.log(`   • Host: ${dbConfig.host}`);
        console.log(`   • Database: ${dbConfig.database}`);
        console.log(`   • Tables created: ${tableCount.rows[0].count}`);
        console.log(`   • Business rules: ${ruleCount.rows[0].count}`);
        console.log('   • pgvector extension: Enabled');
        console.log('');
        console.log('🔗 Connection String:');
        console.log(`   postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        console.log('');
        console.log('✅ Your Azure PostgreSQL database is ready for the MDM application!');

    } catch (error) {
        console.error('');
        console.error('❌ Database setup failed:', error.message);
        console.error('Please check your connection details and try again.');
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Run the setup
setupDatabase(); 