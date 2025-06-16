#!/usr/bin/env pwsh
# Clean test version of the deployment script

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "test-rg",
    [Parameter(Mandatory=$false)]
    [string]$RegistryName = "testregistry",
    [Parameter(Mandatory=$false)]
    [string]$ContainerAppName = "mdm-postgres"
)

Write-Host "Testing MDM PostgreSQL Database deployment script..." -ForegroundColor Cyan

# Test 1: Check if required files exist
Write-Host "Test 1: Checking required files..." -ForegroundColor Yellow
if (-not (Test-Path "scripts/init-db.sql")) {
    Write-Host "ERROR: scripts/init-db.sql not found" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Available SQL files:" -ForegroundColor Yellow
    Get-ChildItem -Recurse -Name "*.sql" | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    exit 1
} else {
    Write-Host "SUCCESS: scripts/init-db.sql found" -ForegroundColor Green
}

# Test 2: Check Docker availability
Write-Host "Test 2: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "SUCCESS: Docker is available: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Docker is not available" -ForegroundColor Yellow
}

# Test 3: Test variable substitution
Write-Host "Test 3: Testing variable substitution..." -ForegroundColor Yellow
$DbName = "mdm_dedup"
$DbUser = "mdm_user"
$DbPassword = "mdm_password123"
$DbPort = "5433"

Write-Host "  Database Name: $DbName" -ForegroundColor White
Write-Host "  Database User: $DbUser" -ForegroundColor White
Write-Host "  Database Port: $DbPort" -ForegroundColor White

# Test 4: Test Dockerfile creation
Write-Host "Test 4: Testing Dockerfile creation..." -ForegroundColor Yellow
$dockerfileContent = "FROM pgvector/pgvector:pg16`nENV POSTGRES_DB=$DbName`nEXPOSE $DbPort"

try {
    Set-Content -Path "Dockerfile.test" -Value $dockerfileContent
    Write-Host "SUCCESS: Test Dockerfile created" -ForegroundColor Green
    Remove-Item -Path "Dockerfile.test" -Force
} catch {
    Write-Host "ERROR: Failed to create Dockerfile: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: All tests passed!" -ForegroundColor Green
