const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'mdm-postgres-pgvector.westus2.azurecontainer.io',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mdm_dedup',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'mdm_password123',
  ssl: false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Serve static files (HTML page)
app.use(express.static(__dirname));

// CORS middleware for cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Root endpoint - serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'db-health-web-endpoint.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🏥 Database health check started...');
    
    const client = await pool.connect();
    const connectionTime = Date.now() - startTime;
    
    try {
      // Test basic connectivity
      const result = await client.query('SELECT NOW() as current_time, version() as db_version, current_database() as db_name, current_user as db_user');
      
      // Get database size information
      const dbSizeResult = await client.query(`
        SELECT 
          pg_database.datname as db_name,
          pg_size_pretty(pg_database_size(pg_database.datname)) as db_size
        FROM pg_database 
        WHERE pg_database.datname = current_database()
      `);
      
      // Get all tables in the database
      const allTablesResult = await client.query(`
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      // Test if business_rules table exists and get count
      let rulesCount = 0;
      const hasBusinessRulesTable = allTablesResult.rows.some(row => row.table_name === 'business_rules');
      if (hasBusinessRulesTable) {
        const rulesResult = await client.query('SELECT COUNT(*) as count FROM business_rules');
        rulesCount = parseInt(rulesResult.rows[0].count);
      }
      
      // Get user_sessions count if table exists
      let sessionsCount = 0;
      const sessionsTableExists = allTablesResult.rows.some(row => row.table_name === 'user_sessions');
      if (sessionsTableExists) {
        const sessionsResult = await client.query('SELECT COUNT(*) as count FROM user_sessions');
        sessionsCount = parseInt(sessionsResult.rows[0].count);
      }
      
      // Check if pgvector extension is available
      let pgvectorEnabled = false;
      try {
        const pgvectorResult = await client.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
        pgvectorEnabled = pgvectorResult.rows.length > 0;
      } catch (error) {
        console.log('pgvector check failed:', error.message);
      }
      
      const totalTime = Date.now() - startTime;
      
      const healthData = {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        performance: {
          connection_time_ms: connectionTime,
          total_time_ms: totalTime
        },
        database: {
          connected: true,
          name: result.rows[0].db_name,
          user: result.rows[0].db_user,
          version: result.rows[0].db_version,
          current_time: result.rows[0].current_time,
          size: dbSizeResult.rows[0]?.db_size || 'unknown',
          host: process.env.DB_HOST || 'mdm-postgres-pgvector.westus2.azurecontainer.io',
          port: process.env.DB_PORT || 5432,
          pgvector_enabled: pgvectorEnabled
        },
        tables: {
          total_tables: allTablesResult.rows.length,
          business_rules_table_exists: hasBusinessRulesTable,
          rules_count: rulesCount,
          sessions_count: sessionsCount,
          all_tables: allTablesResult.rows.map(row => row.table_name)
        },
        pool_stats: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount
        }
      };
      
      console.log('✅ Database health check successful');
      res.json(healthData);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    const totalTime = Date.now() - startTime;
    
    const errorData = {
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      performance: {
        total_time_ms: totalTime
      },
      error: error.message,
      database: {
        connected: false,
        host: process.env.DB_HOST || 'mdm-postgres-pgvector.westus2.azurecontainer.io',
        port: process.env.DB_PORT || 5432,
      },
      pool_stats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
    
    res.status(500).json(errorData);
  }
});

// API endpoint that returns JSON (for programmatic access)
app.get('/api/health', async (req, res) => {
  // Same as /health but with JSON response
  req.url = '/health';
  app._router.handle(req, res);
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Database health server is running',
    timestamp: new Date().toISOString(),
    server_info: {
      port: PORT,
      node_version: process.version,
      uptime: process.uptime()
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Database Health Server running on port ${PORT}`);
  console.log(`📊 Health endpoint: http://localhost:${PORT}/health`);
  console.log(`🌐 Web interface: http://localhost:${PORT}/`);
  console.log(`🏓 Ping endpoint: http://localhost:${PORT}/ping`);
  console.log(`🔧 Database host: ${process.env.DB_HOST || 'mdm-postgres-pgvector.westus2.azurecontainer.io'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await pool.end();
  process.exit(0);
}); 