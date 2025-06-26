# MDM Master Data Cleanse - Azure Database Setup Script
# This script initializes the database schema on the Azure PostgreSQL container

param(
    [string]$Host = "mdm-postgres-pgvector.westus2.azurecontainer.io",
    [int]$Port = 5432,
    [string]$Database = "mdm_dedup", 
    [string]$Username = "postgres",
    [string]$Password = "mdm_password123"
)

Write-Host "===============================================" -ForegroundColor Blue
Write-Host "  MDM Master Data Cleanse - Azure DB Setup   " -ForegroundColor Blue  
Write-Host "===============================================" -ForegroundColor Blue
Write-Host ""

# Function to execute SQL command
function Invoke-PostgresCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string]$SqlCommand,
        [string]$Description = "Executing SQL command"
    )
    
    Write-Host "→ $Description..." -ForegroundColor Yellow
    
    try {
        # Escape quotes for Node.js
        $escapedSql = $SqlCommand -replace '`', '\\`' -replace '"', '\\"'
        
        $nodeScript = @"
const { Client } = require('pg');
const client = new Client({
    host: '$Host',
    port: $Port,
    database: '$Database', 
    user: '$Username',
    password: '$Password',
    ssl: false
});

(async () => {
    try {
        await client.connect();
        const result = await client.query("$escapedSql");
        console.log(JSON.stringify(result.rows));
        await client.end();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
})();
"@
        
        $result = $nodeScript | node
        Write-Host "✅ $Description completed" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "❌ $Description failed: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

try {
    Write-Host "🔌 Connecting to Azure PostgreSQL container..." -ForegroundColor Cyan
    Write-Host "   Host: $Host" -ForegroundColor Gray
    Write-Host "   Database: $Database" -ForegroundColor Gray
    Write-Host ""

    # Enable pgvector extension
    Invoke-PostgresCommand -SqlCommand "CREATE EXTENSION IF NOT EXISTS vector;" -Description "Installing pgvector extension"

    # Create main data tables
    Write-Host "📋 Creating database schema..." -ForegroundColor Cyan
    
    # Sessions table
    $sessionsTable = @"
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
"@
    Invoke-PostgresCommand -SqlCommand $sessionsTable -Description "Creating sessions table"

    # Original data table
    $originalDataTable = @"
CREATE TABLE IF NOT EXISTS original_data (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, row_index)
);
"@
    Invoke-PostgresCommand -SqlCommand $originalDataTable -Description "Creating original_data table"

    # Processed data table
    $processedDataTable = @"
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
"@
    Invoke-PostgresCommand -SqlCommand $processedDataTable -Description "Creating processed_data table"

    # Duplicate pairs table
    $duplicatePairsTable = @"
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
"@
    Invoke-PostgresCommand -SqlCommand $duplicatePairsTable -Description "Creating duplicate_pairs table"

    # Business rules table
    $businessRulesTable = @"
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
"@
    Invoke-PostgresCommand -SqlCommand $businessRulesTable -Description "Creating business_rules table"

    # Field mappings table
    $fieldMappingsTable = @"
CREATE TABLE IF NOT EXISTS field_mappings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    original_field VARCHAR(255) NOT NULL,
    mapped_field VARCHAR(255) NOT NULL,
    data_type VARCHAR(50),
    is_key_field BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"@
    Invoke-PostgresCommand -SqlCommand $fieldMappingsTable -Description "Creating field_mappings table"

    # AI rules table
    $aiRulesTable = @"
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
"@
    Invoke-PostgresCommand -SqlCommand $aiRulesTable -Description "Creating ai_rules table"

    # Create indexes for better performance
    Write-Host "🚀 Creating performance indexes..." -ForegroundColor Cyan
    
    Invoke-PostgresCommand -SqlCommand "CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);" -Description "Creating sessions index"
    Invoke-PostgresCommand -SqlCommand "CREATE INDEX IF NOT EXISTS idx_original_data_session_id ON original_data(session_id);" -Description "Creating original_data index"
    Invoke-PostgresCommand -SqlCommand "CREATE INDEX IF NOT EXISTS idx_processed_data_session_id ON processed_data(session_id);" -Description "Creating processed_data index" 
    Invoke-PostgresCommand -SqlCommand "CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_session_id ON duplicate_pairs(session_id);" -Description "Creating duplicate_pairs index"
    Invoke-PostgresCommand -SqlCommand "CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_confidence ON duplicate_pairs(confidence_score DESC);" -Description "Creating confidence index"
    Invoke-PostgresCommand -SqlCommand "CREATE INDEX IF NOT EXISTS idx_business_rules_active ON business_rules(is_active);" -Description "Creating business_rules index"

    # Insert sample business rules (separate inserts to avoid quoting issues)
    Write-Host "📝 Adding sample business rules..." -ForegroundColor Cyan
    
    $rule1 = "INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by) VALUES ('Exact Name Match', 'Identifies exact matches on company names', 'exact_match', '{\"fields\": [\"company_name\"], \"case_sensitive\": false}', true, 'system') ON CONFLICT DO NOTHING;"
    Invoke-PostgresCommand -SqlCommand $rule1 -Description "Adding exact name match rule"
    
    $rule2 = "INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by) VALUES ('Email Domain Match', 'Groups records by email domain', 'similarity', '{\"field\": \"email\", \"similarity_threshold\": 0.8, \"method\": \"domain\"}', true, 'system') ON CONFLICT DO NOTHING;"
    Invoke-PostgresCommand -SqlCommand $rule2 -Description "Adding email domain match rule"
    
    $rule3 = "INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by) VALUES ('Phone Number Fuzzy Match', 'Matches phone numbers with fuzzy logic', 'fuzzy_match', '{\"field\": \"phone\", \"threshold\": 0.9}', true, 'system') ON CONFLICT DO NOTHING;"
    Invoke-PostgresCommand -SqlCommand $rule3 -Description "Adding phone fuzzy match rule"
    
    $rule4 = "INSERT INTO business_rules (name, description, rule_type, configuration, is_active, created_by) VALUES ('Address Similarity', 'Identifies similar addresses', 'similarity', '{\"fields\": [\"address_line1\", \"city\", \"postal_code\"], \"threshold\": 0.85}', true, 'system') ON CONFLICT DO NOTHING;"
    Invoke-PostgresCommand -SqlCommand $rule4 -Description "Adding address similarity rule"

    # Verify database setup
    Write-Host "🔍 Verifying database setup..." -ForegroundColor Cyan
    
    $tableCount = Invoke-PostgresCommand -SqlCommand "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public';" -Description "Counting tables"
    $tableCountResult = $tableCount | ConvertFrom-Json
    
    $ruleCount = Invoke-PostgresCommand -SqlCommand "SELECT COUNT(*) as count FROM business_rules;" -Description "Counting business rules"
    $ruleCountResult = $ruleCount | ConvertFrom-Json

    Write-Host ""
    Write-Host "🎉 Database setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Database Summary:" -ForegroundColor Cyan
    Write-Host "   • Host: $Host" -ForegroundColor White
    Write-Host "   • Database: $Database" -ForegroundColor White  
    Write-Host "   • Tables created: $($tableCountResult[0].count)" -ForegroundColor White
    Write-Host "   • Business rules: $($ruleCountResult[0].count)" -ForegroundColor White
    Write-Host "   • pgvector extension: Enabled" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Connection String:" -ForegroundColor Cyan
    Write-Host "   postgresql://$Username`:$Password@$Host`:$Port/$Database" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Your Azure PostgreSQL database is ready for the MDM application!" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "❌ Database setup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your connection details and try again." -ForegroundColor Yellow
    exit 1
} 