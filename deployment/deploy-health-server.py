#!/usr/bin/env python3
"""
Azure Health Server Deployment Script
This script deploys a Node.js health monitoring server to Azure Container Instances
"""

import os
import subprocess
import tempfile
import shutil
import json
import sys

# Configuration
CONFIG = {
    'resource_group': 'RG_DAI_S01',
    'acr_name': 'mdmcleansecr',
    'image_name': 'mdm-health-server',
    'container_name': 'mdm-health-server',
    'location': 'westus2',
    'port': 3000,
    'db_host': 'mdm-postgres-pgvector.westus2.azurecontainer.io',
    'db_port': '5432',
    'db_name': 'mdm_dedup',
    'db_user': 'postgres',
    'db_password': 'mdm_password123'
}

def run_command(cmd, check=True, capture_output=True):
    """Run a shell command and return the result"""
    print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    try:
        result = subprocess.run(
            cmd, 
            shell=True if isinstance(cmd, str) else False,
            check=check, 
            capture_output=capture_output, 
            text=True
        )
        if capture_output:
            return result.stdout.strip()
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        if capture_output and e.stdout:
            print(f"STDOUT: {e.stdout}")
        if capture_output and e.stderr:
            print(f"STDERR: {e.stderr}")
        raise

def create_package_json():
    """Create package.json content"""
    return {
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

def create_server_js():
    """Create the Node.js server code"""
    return '''const express = require('express');
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
                        statusDiv.innerHTML = \\`
                            <div class="status healthy">
                                <strong>✅ Database Status:</strong> Connected<br>
                                <strong>Last Check:</strong> \\${new Date(data.timestamp).toLocaleString()}<br>
                                <strong>PostgreSQL Version:</strong> \\${data.postgres_version}
                            </div>
                        \\`;
                    } else {
                        statusDiv.innerHTML = \\`
                            <div class="status unhealthy">
                                <strong>❌ Database Status:</strong> Disconnected<br>
                                <strong>Error:</strong> \\${data.error}<br>
                                <strong>Last Check:</strong> \\${new Date(data.timestamp).toLocaleString()}
                            </div>
                        \\`;
                    }
                } catch (error) {
                    document.getElementById('health-status').innerHTML = \\`
                        <div class="status unhealthy">
                            <strong>❌ Health Check Failed:</strong> \\${error.message}
                        </div>
                    \\`;
                }
            }
            
            function showLogs() {
                const logsDiv = document.getElementById('logs');
                logsDiv.style.display = logsDiv.style.display === 'none' ? 'block' : 'none';
                if (logsDiv.style.display === 'block') {
                    document.getElementById('log-content').textContent = 'Server started at ' + new Date().toLocaleString() + '\\\\nHealth monitoring active...';
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
});'''

def create_dockerfile():
    """Create Dockerfile content"""
    return '''FROM node:18-alpine

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
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]'''

def get_acr_credentials():
    """Get ACR credentials"""
    try:
        username = run_command(['az', 'acr', 'credential', 'show', '--name', CONFIG['acr_name'], '--query', 'username', '-o', 'tsv'])
        password = run_command(['az', 'acr', 'credential', 'show', '--name', CONFIG['acr_name'], '--query', 'passwords[0].value', '-o', 'tsv'])
        return username, password
    except Exception as e:
        print(f"Error getting ACR credentials: {e}")
        raise

def deploy_health_server():
    """Main deployment function"""
    print("Starting health server deployment...")
    print(f"Resource Group: {CONFIG['resource_group']}")
    print(f"ACR: {CONFIG['acr_name']}")
    print(f"Container: {CONFIG['container_name']}")
    print(f"Location: {CONFIG['location']}")
    print()

    # Use relative path to avoid WSL/Windows path issues
    build_dir_name = 'health-server-build'
    
    # Remove existing build directory if it exists
    if os.path.exists(build_dir_name):
        shutil.rmtree(build_dir_name)
    
    # Create new build directory
    os.makedirs(build_dir_name)
    print(f"Created build directory: {build_dir_name}")

    try:
        # Create package.json
        package_json_path = os.path.join(build_dir_name, 'package.json')
        with open(package_json_path, 'w') as f:
            json.dump(create_package_json(), f, indent=2)

        # Create server.js
        server_js_path = os.path.join(build_dir_name, 'server.js')
        with open(server_js_path, 'w') as f:
            f.write(create_server_js())

        # Create Dockerfile
        dockerfile_path = os.path.join(build_dir_name, 'Dockerfile')
        with open(dockerfile_path, 'w') as f:
            f.write(create_dockerfile())

        print("Created application files in build directory")

        # Get ACR access token (no Docker required)
        print("Getting Azure Container Registry access token...")
        token_result = run_command(['az', 'acr', 'login', '--name', CONFIG['acr_name'], '--expose-token'])
        token_data = json.loads(token_result)
        acr_token = token_data['accessToken']
        acr_server = token_data['loginServer']
        print(f"✅ Got ACR token for {acr_server}")

        # Build and push using Azure Container Registry build (no local Docker required)
        print("Building and pushing image using ACR build...")
        image_tag = f"{CONFIG['acr_name']}.azurecr.io/{CONFIG['image_name']}:latest"
        
        # Use relative path that works in both Windows and WSL
        run_command([
            'az', 'acr', 'build',
            '--registry', CONFIG['acr_name'],
            '--image', f"{CONFIG['image_name']}:latest",
            build_dir_name  # Use relative path
        ])

        # Get ACR credentials
        print("Getting ACR credentials...")
        username, password = get_acr_credentials()

        # Deploy to Azure Container Instances
        print("Deploying to Azure Container Instances...")
        deploy_cmd = [
            'az', 'container', 'create',
            '--resource-group', CONFIG['resource_group'],
            '--name', CONFIG['container_name'],
            '--image', f"{CONFIG['acr_name']}.azurecr.io/{CONFIG['container_name']}:latest",
            '--registry-login-server', f"{CONFIG['acr_name']}.azurecr.io",
            '--registry-username', username,
            '--registry-password', password,
            '--dns-name-label', CONFIG['container_name'],
            '--ports', '3000',
            '--location', CONFIG['location'],
            '--cpu', '1',
            '--memory', '1',
            '--os-type', 'Linux',
            '--restart-policy', 'Always',
            '--environment-variables',
            f"PORT=3000",
            f"DB_HOST={CONFIG['db_host']}",
            f"DB_PORT={CONFIG['db_port']}",
            f"DB_NAME={CONFIG['db_name']}",
            f"DB_USER={CONFIG['db_user']}",
            f"DB_PASSWORD={CONFIG['db_password']}"
        ]
        
        run_command(deploy_cmd)

        # Get deployment status
        print("\nDeployment completed!")
        print("Container Status:")
        status_cmd = [
            'az', 'container', 'show',
            '--resource-group', CONFIG['resource_group'],
            '--name', CONFIG['container_name'],
            '--query', '{Name:name,State:containers[0].instanceView.currentState.state,FQDN:ipAddress.fqdn,IP:ipAddress.ip}',
            '-o', 'table'
        ]
        run_command(status_cmd, capture_output=False)

        print()
        print("🎉 Health server deployed successfully!")
        print(f"🌐 Web Interface: http://{CONFIG['container_name']}.{CONFIG['location']}.azurecontainer.io:{CONFIG['port']}")
        print(f"🏥 Health Endpoint: http://{CONFIG['container_name']}.{CONFIG['location']}.azurecontainer.io:{CONFIG['port']}/health")
        print()
        print(f"To view logs: az container logs --resource-group {CONFIG['resource_group']} --name {CONFIG['container_name']}")
        print(f"To delete: az container delete --resource-group {CONFIG['resource_group']} --name {CONFIG['container_name']} --yes")

    except Exception as e:
        print(f"Deployment failed: {e}")
        sys.exit(1)
    finally:
        # Clean up build directory
        if os.path.exists(build_dir_name):
            print(f"Cleaning up build directory: {build_dir_name}")
            shutil.rmtree(build_dir_name, ignore_errors=True)

if __name__ == "__main__":
    deploy_health_server() 