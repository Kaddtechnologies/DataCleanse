const { Client } = require('pg');

// Azure PostgreSQL container connection details
const connectionConfig = {
  host: 'mdm-postgres-pgvector.westus2.azurecontainer.io',
  port: 5432,
  database: 'mdm_dedup',
  user: 'postgres',
  password: 'mdm_password123',
  ssl: false, // Azure Container Instances don't require SSL
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000,
  query_timeout: 60000,
};

console.log('🔄 Testing PostgreSQL connection to Azure container...');
console.log(`📍 Host: ${connectionConfig.host}`);
console.log(`🔌 Port: ${connectionConfig.port}`);
console.log(`🗄️  Database: ${connectionConfig.database}`);
console.log(`👤 User: ${connectionConfig.user}`);
console.log('');

async function testConnection() {
  const client = new Client(connectionConfig);
  
  try {
    console.log('⏳ Attempting to connect...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test 1: Check PostgreSQL version
    console.log('\n📋 Test 1: PostgreSQL Version');
    const versionResult = await client.query('SELECT version()');
    console.log(`   Version: ${versionResult.rows[0].version}`);
    
    // Test 2: Check if pgvector extension is available
    console.log('\n📋 Test 2: pgvector Extension');
    try {
      const extensionResult = await client.query(`
        SELECT name, default_version, installed_version 
        FROM pg_available_extensions 
        WHERE name = 'vector'
      `);
      
      if (extensionResult.rows.length > 0) {
        const ext = extensionResult.rows[0];
        console.log(`   ✅ pgvector extension found`);
        console.log(`   📦 Default version: ${ext.default_version}`);
        console.log(`   🔧 Installed version: ${ext.installed_version || 'Not installed'}`);
      } else {
        console.log('   ❌ pgvector extension not found');
      }
    } catch (error) {
      console.log(`   ⚠️  Error checking pgvector: ${error.message}`);
    }
    
    // Test 3: List all databases
    console.log('\n📋 Test 3: Available Databases');
    const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    dbResult.rows.forEach(row => {
      console.log(`   📁 ${row.datname}`);
    });
    
    // Test 4: List tables in current database
    console.log('\n📋 Test 4: Tables in mdm_dedup database');
    const tablesResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => {
        console.log(`   📄 ${row.table_name} (${row.table_type})`);
      });
    } else {
      console.log('   📭 No tables found in public schema');
    }
    
    // Test 5: Check if we can create a test table
    console.log('\n📋 Test 5: Write Permission Test');
    try {
      await client.query('CREATE TABLE IF NOT EXISTS connection_test (id SERIAL PRIMARY KEY, test_time TIMESTAMP DEFAULT NOW())');
      await client.query('INSERT INTO connection_test DEFAULT VALUES');
      const testResult = await client.query('SELECT COUNT(*) as count FROM connection_test');
      console.log(`   ✅ Write test successful - ${testResult.rows[0].count} test records`);
      
      // Clean up test table
      await client.query('DROP TABLE IF EXISTS connection_test');
      console.log('   🧹 Test table cleaned up');
    } catch (error) {
      console.log(`   ❌ Write test failed: ${error.message}`);
    }
    
    // Test 6: Connection performance
    console.log('\n📋 Test 6: Connection Performance');
    const startTime = Date.now();
    await client.query('SELECT 1');
    const queryTime = Date.now() - startTime;
    console.log(`   ⚡ Simple query took: ${queryTime}ms`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Connection Summary:');
    console.log(`   🌐 FQDN: ${connectionConfig.host}`);
    console.log(`   🔗 Full URL: postgresql://${connectionConfig.user}:${connectionConfig.password}@${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);
    console.log(`   ✅ Status: Connected and operational`);
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    // Provide troubleshooting suggestions
    console.log('\n🔧 Troubleshooting suggestions:');
    console.log('   1. Verify the container is running in Azure Portal');
    console.log('   2. Check if the container port 5432 is exposed');
    console.log('   3. Verify the FQDN is correct');
    console.log('   4. Check if there are any firewall restrictions');
    console.log('   5. Verify the database credentials');
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed');
  }
}

// Run the test
testConnection().catch(console.error); 