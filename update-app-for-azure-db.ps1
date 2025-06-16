#!/usr/bin/env pwsh
# Script to update application environment variables for Azure-deployed database

param(
    [Parameter(Mandatory=$true)]
    [string]$PostgresFqdn,
    
    [Parameter(Mandatory=$false)]
    [string]$RedisFqdn = "",
    
    [Parameter(Mandatory=$false)]
    [string]$DbName = "mdm_dedup",
    
    [Parameter(Mandatory=$false)]
    [string]$DbUser = "mdm_user",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPassword = "mdm_password123",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPort = "5433",
    
    [Parameter(Mandatory=$false)]
    [string]$AppContainerName = "datacleansing",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = ""
)

$ErrorActionPreference = "Stop"

Write-Host "Updating application environment variables for Azure database..." -ForegroundColor Cyan

# 1. Create/update .env.production file
Write-Host "Creating .env.production file..." -ForegroundColor Yellow

$envContent = @"
# Azure Database Configuration
DATABASE_URL=postgresql://$DbUser`:$DbPassword@$PostgresFqdn`:$DbPort/$DbName
POSTGRES_HOST=$PostgresFqdn
POSTGRES_PORT=$DbPort
POSTGRES_DB=$DbName
POSTGRES_USER=$DbUser
POSTGRES_PASSWORD=$DbPassword

# Redis Configuration (if deployed)
$(if ($RedisFqdn) { "REDIS_URL=redis://$RedisFqdn`:6379" } else { "# REDIS_URL=redis://localhost:6379" })

# Application Configuration
NODE_ENV=production
ENVIRONMENT=production

# AI Configuration (add your API keys here)
OPENAI_API_KEY=6kEA8jhAvaSiqoIDVUXygVWyLEKsmSUY0zIBOqsNeN2g0O6QWtWuJQQJ99BDACHYHv6XJ3w3AAABACOGTeiK
GOOGLE_API_KEY=AIzaSyAGxugbJDi84dIQeIvx6moBPdCDwJdhJIw

# Embedding Service Configuration (update if you have a separate embedding service)
EMBEDDING_API_URL=http://localhost:8000/embed
"@

Set-Content -Path ".env.production" -Value $envContent
Write-Host "Created .env.production file" -ForegroundColor Green

# 2. Update Azure Container App environment variables (if ResourceGroup and AppContainerName provided)
if ($ResourceGroup -and $AppContainerName) {
    Write-Host "Updating Azure Container App environment variables..." -ForegroundColor Yellow
    
    # Check if the app exists
    try {
        $appExists = az containerapp show --name $AppContainerName --resource-group $ResourceGroup 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Found existing container app: $AppContainerName" -ForegroundColor Green
            
            # Prepare environment variables
            $envVars = @(
                "DATABASE_URL=postgresql://$DbUser`:$DbPassword@$PostgresFqdn`:$DbPort/$DbName",
                "POSTGRES_HOST=$PostgresFqdn",
                "POSTGRES_PORT=$DbPort",
                "POSTGRES_DB=$DbName",
                "POSTGRES_USER=$DbUser",
                "POSTGRES_PASSWORD=$DbPassword",
                "NODE_ENV=production",
                "ENVIRONMENT=production"
            )
            
            if ($RedisFqdn) {
                $envVars += "REDIS_URL=redis://$RedisFqdn`:6379"
            }
            
            # Update the container app environment variables
            az containerapp update `
                --name $AppContainerName `
                --resource-group $ResourceGroup `
                --set-env-vars $($envVars -join ' ')
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully updated container app environment variables" -ForegroundColor Green
            } else {
                Write-Host "Failed to update container app environment variables" -ForegroundColor Red
            }
        } else {
            Write-Host "Container app $AppContainerName not found in resource group $ResourceGroup" -ForegroundColor Yellow
            Write-Host "You'll need to manually update the environment variables when you deploy the app" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not check for existing container app. You may need to update environment variables manually." -ForegroundColor Yellow
    }
}

# 3. Create a docker-compose.override.yml for local testing with Azure database
Write-Host "Creating docker-compose.override.yml for local testing..." -ForegroundColor Yellow

$dockerComposeOverride = @"
version: '3.8'

# Override for testing with Azure database
services:
  # Comment out local postgres since we're using Azure
  postgres:
    profiles:
      - disabled
  
  # Comment out local redis if using Azure Redis
  $(if ($RedisFqdn) { 
@"
  redis:
    profiles:
      - disabled
"@ 
} else { "# redis: # Uncomment to disable local redis" })

# If you have an app service, you can override its environment here
# app:
#   environment:
#     - DATABASE_URL=postgresql://$DbUser`:$DbPassword@$PostgresFqdn`:$DbPort/$DbName
#     - POSTGRES_HOST=$PostgresFqdn
#     - POSTGRES_PORT=$DbPort
#     - POSTGRES_DB=$DbName
#     - POSTGRES_USER=$DbUser
#     - POSTGRES_PASSWORD=$DbPassword
$(if ($RedisFqdn) { "#     - REDIS_URL=redis://$RedisFqdn`:6379" })
"@

Set-Content -Path "docker-compose.override.yml" -Value $dockerComposeOverride
Write-Host "Created docker-compose.override.yml" -ForegroundColor Green

# 4. Update existing .env files with Azure database info
Write-Host "Updating existing .env files..." -ForegroundColor Yellow

$envFiles = @(".env", ".env.local")
foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        Write-Host "Backing up $envFile..." -ForegroundColor Cyan
        Copy-Item $envFile "$envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        
        # Read existing content
        $existingContent = Get-Content $envFile -Raw
        
        # Replace database-related variables
        $existingContent = $existingContent -replace "DATABASE_URL=.*", "DATABASE_URL=postgresql://$DbUser`:$DbPassword@$PostgresFqdn`:$DbPort/$DbName"
        $existingContent = $existingContent -replace "POSTGRES_HOST=.*", "POSTGRES_HOST=$PostgresFqdn"
        $existingContent = $existingContent -replace "POSTGRES_PORT=.*", "POSTGRES_PORT=$DbPort"
        $existingContent = $existingContent -replace "POSTGRES_DB=.*", "POSTGRES_DB=$DbName"
        $existingContent = $existingContent -replace "POSTGRES_USER=.*", "POSTGRES_USER=$DbUser"
        $existingContent = $existingContent -replace "POSTGRES_PASSWORD=.*", "POSTGRES_PASSWORD=$DbPassword"
        
        if ($RedisFqdn) {
            $existingContent = $existingContent -replace "REDIS_URL=.*", "REDIS_URL=redis://$RedisFqdn`:6379"
        }
        
        # Add variables if they don't exist
        if ($existingContent -notmatch "DATABASE_URL=") {
            $existingContent += "`nDATABASE_URL=postgresql://$DbUser`:$DbPassword@$PostgresFqdn`:$DbPort/$DbName"
        }
        if ($existingContent -notmatch "POSTGRES_HOST=") {
            $existingContent += "`nPOSTGRES_HOST=$PostgresFqdn"
        }
        if ($existingContent -notmatch "POSTGRES_PORT=") {
            $existingContent += "`nPOSTGRES_PORT=$DbPort"
        }
        if ($existingContent -notmatch "POSTGRES_DB=") {
            $existingContent += "`nPOSTGRES_DB=$DbName"
        }
        if ($existingContent -notmatch "POSTGRES_USER=") {
            $existingContent += "`nPOSTGRES_USER=$DbUser"
        }
        if ($existingContent -notmatch "POSTGRES_PASSWORD=") {
            $existingContent += "`nPOSTGRES_PASSWORD=$DbPassword"
        }
        
        if ($RedisFqdn -and $existingContent -notmatch "REDIS_URL=") {
            $existingContent += "`nREDIS_URL=redis://$RedisFqdn`:6379"
        }
        
        Set-Content -Path $envFile -Value $existingContent
        Write-Host "Updated $envFile" -ForegroundColor Green
    }
}

# 5. Create a connection test script
Write-Host "Creating database connection test script..." -ForegroundColor Yellow

$testScript = @"
#!/usr/bin/env node
// Test script to verify Azure database connection

const { Pool } = require('pg');

const connectionConfig = {
  host: '$PostgresFqdn',
  port: $DbPort,
  database: '$DbName',
  user: '$DbUser',
  password: '$DbPassword',
  ssl: {
    rejectUnauthorized: false // For Azure Container Apps internal networking
  }
};

async function testConnection() {
  console.log('Testing Azure PostgreSQL connection...');
  console.log('Connection config:', {
    ...connectionConfig,
    password: '[HIDDEN]'
  });
  
  const pool = new Pool(connectionConfig);
  
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to Azure PostgreSQL!');
    
    // Test basic query
    const result = await client.query('SELECT version(), now() as current_time');
    console.log('Database version:', result.rows[0].version);
    console.log('Current time:', result.rows[0].current_time);
    
    // Test if our tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Available tables:', tablesResult.rows.map(row => row.table_name));
    
    client.release();
    
    $(if ($RedisFqdn) {
@"
    // Test Redis connection if available
    console.log('\nTesting Redis connection...');
    const redis = require('redis');
    const redisClient = redis.createClient({
      url: 'redis://$RedisFqdn:6379'
    });
    
    try {
      await redisClient.connect();
      await redisClient.ping();
      console.log('✅ Successfully connected to Azure Redis!');
      await redisClient.disconnect();
    } catch (redisError) {
      console.log('❌ Redis connection failed:', redisError.message);
    }
"@
    })
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
"@

Set-Content -Path "test-azure-db-connection.js" -Value $testScript
Write-Host "Created test-azure-db-connection.js" -ForegroundColor Green

# 6. Display summary
Write-Host "" -ForegroundColor White
Write-Host "Configuration Update Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan

Write-Host "" -ForegroundColor White
Write-Host "Files Created/Updated:" -ForegroundColor Yellow
Write-Host "  ✅ .env.production - Production environment variables" -ForegroundColor White
Write-Host "  ✅ docker-compose.override.yml - Local testing with Azure DB" -ForegroundColor White
Write-Host "  ✅ test-azure-db-connection.js - Connection test script" -ForegroundColor White
Write-Host "  ✅ Updated existing .env files with Azure database settings" -ForegroundColor White

Write-Host "" -ForegroundColor White
Write-Host "Database Connection Details:" -ForegroundColor Yellow
Write-Host "  Host: $PostgresFqdn" -ForegroundColor White
Write-Host "  Port: $DbPort" -ForegroundColor White
Write-Host "  Database: $DbName" -ForegroundColor White
Write-Host "  Username: $DbUser" -ForegroundColor White
Write-Host "  Connection String: postgresql://$DbUser:[PASSWORD]@$PostgresFqdn`:$DbPort/$DbName" -ForegroundColor White

if ($RedisFqdn) {
    Write-Host "" -ForegroundColor White
    Write-Host "Redis Connection Details:" -ForegroundColor Yellow
    Write-Host "  Host: $RedisFqdn" -ForegroundColor White
    Write-Host "  Port: 6379" -ForegroundColor White
    Write-Host "  Connection String: redis://$RedisFqdn`:6379" -ForegroundColor White
}

Write-Host "" -ForegroundColor White
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the database connection:" -ForegroundColor White
Write-Host "   node test-azure-db-connection.js" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "2. For local development with Azure database:" -ForegroundColor White
Write-Host "   docker-compose up -d  # This will skip local postgres/redis" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "3. Deploy your application with updated environment variables:" -ForegroundColor White
Write-Host "   # Your existing deployment script will now use Azure database" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "4. Verify your application can connect to the Azure database" -ForegroundColor White

if ($ResourceGroup -and $AppContainerName) {
    Write-Host "" -ForegroundColor White
    Write-Host "Azure Container App Updated:" -ForegroundColor Green
    Write-Host "  Container App: $AppContainerName" -ForegroundColor White
    Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor White
    Write-Host "  Environment variables have been updated to use Azure database" -ForegroundColor White
}

Write-Host "" -ForegroundColor White
Write-Host "Configuration update completed successfully!" -ForegroundColor Green
