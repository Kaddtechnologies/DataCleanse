#!/usr/bin/env pwsh
# Test script to verify deployment works with mock service principal

# Set mock environment variables for testing
$env:AZURE_CLIENT_ID = "test-client-id"
$env:AZURE_CLIENT_SECRET = "test-client-secret"
$env:AZURE_TENANT_ID = "test-tenant-id"
$env:AZURE_SUBSCRIPTION_ID = "test-subscription-id"

Write-Host "Testing deployment script with mock service principal..." -ForegroundColor Cyan
Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "  AZURE_CLIENT_ID: $env:AZURE_CLIENT_ID" -ForegroundColor White
Write-Host "  AZURE_CLIENT_SECRET: [HIDDEN]" -ForegroundColor White
Write-Host "  AZURE_TENANT_ID: $env:AZURE_TENANT_ID" -ForegroundColor White
Write-Host "  AZURE_SUBSCRIPTION_ID: $env:AZURE_SUBSCRIPTION_ID" -ForegroundColor White

# Test the deployment script (it will fail at Azure login, but we can see if the logic works)
Write-Host "" -ForegroundColor White
Write-Host "Running deployment script..." -ForegroundColor Cyan
./deploy-database-azure.ps1 -ResourceGroup "test-rg" -RegistryName "testregistry"
