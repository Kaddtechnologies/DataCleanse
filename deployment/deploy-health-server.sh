#!/bin/bash

# Azure Health Server Deployment Script
# This script deploys a Node.js health monitoring server to Azure Container Instances

set -e  # Exit on any error

# Configuration
RESOURCE_GROUP="RG_DAI_S01"
ACR_NAME="mdmcleansecr"
IMAGE_NAME="mdm-health-server"
CONTAINER_NAME="mdm-health-server"
LOCATION="westus2"
PORT=3000

echo "Starting health server deployment..."
echo "Resource Group: $RESOURCE_GROUP"
echo "ACR: $ACR_NAME"
echo "Container: $CONTAINER_NAME"
echo "Location: $LOCATION"
echo ""

# Create temporary directory for build context
BUILD_DIR=$(mktemp -d)
echo "Created build directory: $BUILD_DIR"

# Create package.json
cat > "$BUILD_DIR/package.json" << 'EOF'
{
  "name": "mdm-health-server",
  "version": "1.0.0",
  "description": "Health monitoring server for MDM PostgreSQL database",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0"
  }
}
EOF

# Create the Node.js server code
cat > "$BUILD_DIR/server.js" << 'EOF'
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'mdm-postgres-pgvector.westus2.azurecontainer.io',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mdm_dedup',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'mdm_password123',
  ssl: false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 10
});

// Test database connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('Database connection successful:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as timestamp, version() as version');
    client.release();
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].timestamp,
      postgres_version: result.rows[0].version,
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Web interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>MDM Database Health Monitor</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
            .status { padding: 15px; margin: 20px 0; border-radius: 5px; }
            .healthy { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
            .unhealthy { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
            button { background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 10px 5px 0 0; }
            button:hover { background: #005a9e; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏥 MDM Database Health Monitor</h1>
            <div class="info">
                <strong>Server Status:</strong> Running<br>
                <strong>Port:</strong> ${port}<br>
                <strong>Uptime:</strong> ${Math.floor(process.uptime())} seconds
            </div>
            <div id="health-status">Loading health status...</div>
            <button onclick="checkHealth()">🔄 Refresh Health Check</button>
            <button onclick="showLogs()">📋 Show Logs</button>
            <div id="logs" style="display: none;">
                <h3>Recent Activity</h3>
                <pre id="log-content">Logs will appear here...</pre>
            </div>
        </div>
        
        <script>
            async function checkHealth() {
                try {
                    const response = await fetch('/health');
                    const data = await response.json();
                    const statusDiv = document.getElementById('health-status');
                    
                    if (data.status === 'healthy') {
                        statusDiv.innerHTML = \`
                            <div class="status healthy">
                                <strong>✅ Database Status:</strong> Connected<br>
                                <strong>Last Check:</strong> \${new Date(data.timestamp).toLocaleString()}<br>
                                <strong>PostgreSQL Version:</strong> \${data.postgres_version}
                            </div>
                        \`;
                    } else {
                        statusDiv.innerHTML = \`
                            <div class="status unhealthy">
                                <strong>❌ Database Status:</strong> Disconnected<br>
                                <strong>Error:</strong> \${data.error}<br>
                                <strong>Last Check:</strong> \${new Date(data.timestamp).toLocaleString()}
                            </div>
                        \`;
                    }
                } catch (error) {
                    document.getElementById('health-status').innerHTML = \`
                        <div class="status unhealthy">
                            <strong>❌ Health Check Failed:</strong> \${error.message}
                        </div>
                    \`;
                }
            }
            
            function showLogs() {
                const logsDiv = document.getElementById('logs');
                logsDiv.style.display = logsDiv.style.display === 'none' ? 'block' : 'none';
                if (logsDiv.style.display === 'block') {
                    document.getElementById('log-content').textContent = 'Server started at ' + new Date().toLocaleString() + '\\nHealth monitoring active...';
                }
            }
            
            // Auto-refresh health status every 30 seconds
            setInterval(checkHealth, 30000);
            
            // Initial health check
            checkHealth();
        </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(port, '0.0.0.0', async () => {
  console.log(`Health server running on port ${port}`);
  console.log('Testing initial database connection...');
  await testConnection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  pool.end(() => {
    process.exit(0);
  });
});
EOF

# Create Dockerfile
cat > "$BUILD_DIR/Dockerfile" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application code
COPY server.js ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
EOF

echo "Created application files in build directory"

# Login to ACR
echo "Logging into Azure Container Registry..."
az acr login --name $ACR_NAME

# Build and push image
echo "Building Docker image..."
cd "$BUILD_DIR"
docker build -t $ACR_NAME.azurecr.io/$IMAGE_NAME:latest .

echo "Pushing image to ACR..."
docker push $ACR_NAME.azurecr.io/$IMAGE_NAME:latest

# Deploy to Azure Container Instances
echo "Deploying to Azure Container Instances..."
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CONTAINER_NAME \
  --image $ACR_NAME.azurecr.io/$IMAGE_NAME:latest \
  --registry-login-server $ACR_NAME.azurecr.io \
  --registry-username $(az acr credential show --name $ACR_NAME --query username -o tsv) \
  --registry-password $(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv) \
  --dns-name-label $CONTAINER_NAME \
  --ports $PORT \
  --location $LOCATION \
  --cpu 1 \
  --memory 1 \
  --restart-policy Always \
  --environment-variables \
    PORT=$PORT \
    DB_HOST=mdm-postgres-pgvector.westus2.azurecontainer.io \
    DB_PORT=5432 \
    DB_NAME=mdm_dedup \
    DB_USER=postgres \
    DB_PASSWORD=mdm_password123

# Clean up build directory
echo "Cleaning up build directory..."
rm -rf "$BUILD_DIR"

# Get deployment status
echo ""
echo "Deployment completed!"
echo "Container Status:"
az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query "{Name:name,State:containers[0].instanceView.currentState.state,FQDN:ipAddress.fqdn,IP:ipAddress.ip}" -o table

echo ""
echo "🎉 Health server deployed successfully!"
echo "🌐 Web Interface: http://$CONTAINER_NAME.$LOCATION.azurecontainer.io:$PORT"
echo "🏥 Health Endpoint: http://$CONTAINER_NAME.$LOCATION.azurecontainer.io:$PORT/health"
echo ""
echo "To view logs: az container logs --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME"
echo "To delete: az container delete --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --yes" 