#!/usr/bin/env pwsh
# Test Service Principal Authentication
# Run this after setting up your service principal to verify it works

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "pottersailearning"
)

$ErrorActionPreference = "Stop"

Write-Host "Testing Service Principal Authentication..." -ForegroundColor Cyan

# Check environment variables
$clientId = [Environment]::GetEnvironmentVariable("AZURE_CLIENT_ID")
$clientSecret = [Environment]::GetEnvironmentVariable("AZURE_CLIENT_SECRET")
$tenantId = [Environment]::GetEnvironmentVariable("AZURE_TENANT_ID")
$subscriptionId = [Environment]::GetEnvironmentVariable("AZURE_SUBSCRIPTION_ID")

if (-not $clientId -or -not $clientSecret -or -not $tenantId) {
    Write-Host "ERROR: Missing required environment variables" -ForegroundColor Red
    Write-Host "Please set the following environment variables:" -ForegroundColor Yellow
    Write-Host "`$env:AZURE_CLIENT_ID='your-application-client-id'" -ForegroundColor Cyan
    Write-Host "`$env:AZURE_CLIENT_SECRET='your-client-secret-value'" -ForegroundColor Cyan
    Write-Host "`$env:AZURE_TENANT_ID='your-tenant-id'" -ForegroundColor Cyan
    Write-Host "`$env:AZURE_SUBSCRIPTION_ID='your-subscription-id'" -ForegroundColor Cyan
    exit 1
}

Write-Host "Environment variables found:" -ForegroundColor Green
Write-Host "  AZURE_CLIENT_ID: $clientId" -ForegroundColor White
Write-Host "  AZURE_TENANT_ID: $tenantId" -ForegroundColor White
Write-Host "  AZURE_SUBSCRIPTION_ID: $subscriptionId" -ForegroundColor White

# Test Azure CLI login with service principal
Write-Host "Testing Azure CLI login with service principal..." -ForegroundColor Cyan
az login --service-principal --username $clientId --password $clientSecret --tenant $tenantId --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service principal authentication successful!" -ForegroundColor Green
    
    # Set subscription if provided
    if ($subscriptionId) {
        az account set --subscription $subscriptionId --output none
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Subscription set successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Failed to set subscription" -ForegroundColor Yellow
        }
    }
    
    # Test resource group access
    Write-Host "Testing resource group access..." -ForegroundColor Cyan
    $rgExists = az group show --name $ResourceGroup --output none 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Resource group access confirmed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Cannot access resource group: $ResourceGroup" -ForegroundColor Yellow
    }
    
    # Test ACR access
    Write-Host "Testing Azure Container Registry access..." -ForegroundColor Cyan
    $acrLoginServer = az acr show --name "kaddacontainerregistry" --query loginServer -o tsv 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ACR access confirmed! Login server: $acrLoginServer" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Cannot access Azure Container Registry" -ForegroundColor Yellow
        Write-Host "This might require additional role assignments" -ForegroundColor Yellow
    }
    
    Write-Host "" -ForegroundColor White
    Write-Host "🎉 Service Principal test completed!" -ForegroundColor Green
    Write-Host "You can now run the deployment script with:" -ForegroundColor White
    Write-Host "./deploy-database-azure.ps1 -ResourceGroup '$ResourceGroup' -RegistryName 'kaddacontainerregistry' -UseServicePrincipal" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Service principal authentication failed!" -ForegroundColor Red
    Write-Host "Please verify:" -ForegroundColor Yellow
    Write-Host "1. The service principal was created correctly in Azure Portal" -ForegroundColor White
    Write-Host "2. The environment variables contain the correct values" -ForegroundColor White
    Write-Host "3. The service principal has been assigned the Contributor role" -ForegroundColor White
    exit 1
} 