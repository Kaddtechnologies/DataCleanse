const { Client } = require('pg');

// Azure PostgreSQL container connection
const client = new Client({
  host: 'mdm-postgres-pgvector.westus2.azurecontainer.io',
  port: 5432,
  database: 'mdm_dedup',
  user: 'mdm_user',
  password: 'mdm_password123',
  ssl: false,
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  try {
    console.log('🔄 Connecting to Azure PostgreSQL container...');
    console.log(`📍 Host: mdm-postgres-pgvector.westus2.azurecontainer.io:5432`);
    console.log(`🗄️  Database: mdm_dedup`);
    console.log('');

    await client.connect();
    console.log('✅ Connected successfully!');

    // Test basic query
    const result = await client.query('SELECT version(), current_database(), current_user, now()');
    console.log('📊 Database Info:');
    console.log(`   Version: ${result.rows[0].version}`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Time: ${result.rows[0].now}`);
    console.log('');

    // Test tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`📋 Tables (${tables.rows.length}):`);
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    console.log('');

    // Test pgvector extension
    const extensions = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `);
    if (extensions.rows.length > 0) {
      console.log('🚀 pgvector extension:');
      console.log(`   Version: ${extensions.rows[0].extversion}`);
    } else {
      console.log('⚠️  pgvector extension not found');
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

testConnection(); 