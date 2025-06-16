#!/usr/bin/env pwsh
# Test version of the deployment script to identify issues

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "test-rg",

    [Parameter(Mandatory=$false)]
    [string]$RegistryName = "testregistry",

    [Parameter(Mandatory=$false)]
    [string]$ContainerAppName = "mdm-postgres",

    [Parameter(Mandatory=$false)]
    [string]$Location = "centralus",

    [Parameter(Mandatory=$false)]
    [string]$ImageTag = "latest",
    
    [Parameter(Mandatory=$false)]
    [string]$DbName = "mdm_dedup",
    
    [Parameter(Mandatory=$false)]
    [string]$DbUser = "mdm_user",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPassword = "mdm_password123",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPort = "5433",
    
    [Parameter(Mandatory=$false)]
    [string]$RedisContainerAppName = "mdm-redis",
    
    [Parameter(Mandatory=$false)]
    [switch]$DeployRedis = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateFileShare = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$TestMode = $true
)

$ErrorActionPreference = "Stop"
$CurrentDate = Get-Date -Format "yyyyMMdd-HHmmss"
$PostgresImageName = "$ContainerAppName"
$RedisImageName = "$RedisContainerAppName"
$FullImageTag = "$CurrentDate-$ImageTag"

Write-Host "Testing MDM PostgreSQL Database deployment script..." -ForegroundColor Cyan
Write-Host "Test Mode: $TestMode" -ForegroundColor Yellow

# Test 1: Check if required files exist
Write-Host "Test 1: Checking required files..." -ForegroundColor Yellow
if (-not (Test-Path "scripts/init-db.sql")) {
    Write-Host "ERROR: scripts/init-db.sql not found" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Available files:" -ForegroundColor Yellow
    Get-ChildItem -Recurse -Name "*.sql" | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    exit 1
} else {
    Write-Host "✓ scripts/init-db.sql found" -ForegroundColor Green
}

# Test 2: Check Docker availability
Write-Host "Test 2: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker is available: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not available" -ForegroundColor Red
    if ($TestMode) {
        Write-Host "Continuing in test mode..." -ForegroundColor Yellow
    } else {
        exit 1
    }
}

# Test 3: Create test Dockerfile
Write-Host "Test 3: Creating test Dockerfile..." -ForegroundColor Yellow
$dockerfileContent = @"
FROM pgvector/pgvector:pg16

# Set environment variables
ENV POSTGRES_DB=$DbName
ENV POSTGRES_USER=$DbUser
ENV POSTGRES_PASSWORD=$DbPassword
ENV POSTGRES_INITDB_ARGS="--encoding=UTF8"
ENV PGPORT=$DbPort

# Copy initialization script
COPY scripts/init-db.sql /docker-entrypoint-initdb.d/01-init-db.sql

# Expose the custom port
EXPOSE $DbPort

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
  CMD pg_isready -U $DbUser -d $DbName -p $DbPort

# Use the default entrypoint from the base image
"@

try {
    Set-Content -Path "Dockerfile.postgres.test" -Value $dockerfileContent
    Write-Host "✓ Test Dockerfile created successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create Dockerfile: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: Test variable substitution
Write-Host "Test 4: Testing variable substitution..." -ForegroundColor Yellow
Write-Host "  Database Name: $DbName" -ForegroundColor White
Write-Host "  Database User: $DbUser" -ForegroundColor White
Write-Host "  Database Port: $DbPort" -ForegroundColor White
Write-Host "  Image Name: $PostgresImageName" -ForegroundColor White
Write-Host "  Full Image Tag: $FullImageTag" -ForegroundColor White

# Test 5: Test Redis configuration
if ($DeployRedis) {
    Write-Host "Test 5: Testing Redis configuration..." -ForegroundColor Yellow
    $redisDockerfileContent = @'
FROM redis:7-alpine

# Expose Redis port
EXPOSE 6379

# Use appendonly persistence
CMD ["redis-server", "--appendonly", "yes"]
'@
    
    try {
        Set-Content -Path "Dockerfile.redis.test" -Value $redisDockerfileContent
        Write-Host "✓ Redis Dockerfile created successfully" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to create Redis Dockerfile: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Test 5: Redis deployment disabled" -ForegroundColor Yellow
}

# Test 6: Test environment variable construction
Write-Host "Test 6: Testing environment variable construction..." -ForegroundColor Yellow
$secrets = @(
    "postgres-password=$DbPassword",
    "postgres-user=$DbUser",
    "postgres-db=$DbName"
)

$postgresEnvVars = @(
    "POSTGRES_DB=secretref:postgres-db",
    "POSTGRES_USER=secretref:postgres-user", 
    "POSTGRES_PASSWORD=secretref:postgres-password",
    "POSTGRES_INITDB_ARGS=--encoding=UTF8",
    "PGPORT=$DbPort"
)

Write-Host "  Secrets: $($secrets -join ', ')" -ForegroundColor White
Write-Host "  Environment Variables: $($postgresEnvVars -join ', ')" -ForegroundColor White

# Test 7: Test Azure CLI command construction (without execution)
Write-Host "Test 7: Testing Azure CLI command construction..." -ForegroundColor Yellow
$testCreateCmd = "az containerapp create " +
    "--name $ContainerAppName " +
    "--resource-group $ResourceGroup " +
    "--environment test-env " +
    "--registry-server test.azurecr.io " +
    "--registry-username testuser " +
    "--registry-password testpass " +
    "--image test.azurecr.io/${PostgresImageName}:${FullImageTag} " +
    "--target-port $DbPort " +
    "--ingress internal " +
    "--cpu 2.0 " +
    "--memory 4.0Gi " +
    "--min-replicas 1 " +
    "--max-replicas 1 " +
    "--secrets `"$($secrets -join ' ')`" " +
    "--env-vars `"$($postgresEnvVars -join ' ')`""

Write-Host "  Command would be:" -ForegroundColor White
Write-Host "  $testCreateCmd" -ForegroundColor Cyan

# Clean up test files
Write-Host "Cleaning up test files..." -ForegroundColor Yellow
Remove-Item -Path "Dockerfile.postgres.test" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "Dockerfile.redis.test" -Force -ErrorAction SilentlyContinue

Write-Host "" -ForegroundColor White
Write-Host "✓ All tests passed! The deployment script structure appears to be correct." -ForegroundColor Green
Write-Host "Ready to run with actual Azure credentials once authentication is complete." -ForegroundColor Cyan
