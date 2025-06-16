#!/usr/bin/env pwsh
# Script to create Azure Service Principal for hands-off deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$ServicePrincipalName = "mdm-database-deployer",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$OutputToFile = $true
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up Service Principal for hands-off Azure deployment..." -ForegroundColor Cyan

# 1. Check if logged in to Azure
try {
    $account = az account show | ConvertFrom-Json
    Write-Host "Logged in to Azure as: $($account.user.name)" -ForegroundColor Green
    
    if (-not $SubscriptionId) {
        $SubscriptionId = $account.id
    }
} catch {
    Write-Host "ERROR: Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# 2. Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Cyan
    az account set --subscription $SubscriptionId
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to set subscription" -ForegroundColor Red
        exit 1
    }
}

# 3. Create service principal
Write-Host "Creating service principal: $ServicePrincipalName" -ForegroundColor Cyan

$scope = "/subscriptions/$SubscriptionId"
if ($ResourceGroup) {
    $scope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup"
    Write-Host "Scoping to resource group: $ResourceGroup" -ForegroundColor Yellow
}

$spResult = az ad sp create-for-rbac --name $ServicePrincipalName --role Contributor --scopes $scope --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0 -or -not $spResult) {
    Write-Host "Failed to create service principal" -ForegroundColor Red
    exit 1
}

Write-Host "Successfully created service principal" -ForegroundColor Green

# 4. Display results
Write-Host "" -ForegroundColor White
Write-Host "Service Principal Details:" -ForegroundColor Yellow
Write-Host "  App ID (Client ID): $($spResult.appId)" -ForegroundColor White
Write-Host "  Password (Client Secret): $($spResult.password)" -ForegroundColor White
Write-Host "  Tenant ID: $($spResult.tenant)" -ForegroundColor White
Write-Host "  Subscription ID: $SubscriptionId" -ForegroundColor White

# 5. Create environment variables script
if ($OutputToFile) {
    $envScript = @"
# Azure Service Principal Environment Variables
# Source this file or set these environment variables for hands-off deployment

# For PowerShell:
`$env:AZURE_CLIENT_ID = "$($spResult.appId)"
`$env:AZURE_CLIENT_SECRET = "$($spResult.password)"
`$env:AZURE_TENANT_ID = "$($spResult.tenant)"
`$env:AZURE_SUBSCRIPTION_ID = "$SubscriptionId"

# For Bash/Linux:
export AZURE_CLIENT_ID="$($spResult.appId)"
export AZURE_CLIENT_SECRET="$($spResult.password)"
export AZURE_TENANT_ID="$($spResult.tenant)"
export AZURE_SUBSCRIPTION_ID="$SubscriptionId"

# For Windows Command Prompt:
set AZURE_CLIENT_ID=$($spResult.appId)
set AZURE_CLIENT_SECRET=$($spResult.password)
set AZURE_TENANT_ID=$($spResult.tenant)
set AZURE_SUBSCRIPTION_ID=$SubscriptionId
"@

    Set-Content -Path "azure-service-principal.env" -Value $envScript
    Write-Host "" -ForegroundColor White
    Write-Host "Environment variables saved to: azure-service-principal.env" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
}

# 6. Show usage instructions
Write-Host "Usage Instructions:" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "1. Set environment variables (choose one method):" -ForegroundColor White
Write-Host "   PowerShell:" -ForegroundColor Cyan
Write-Host "   `$env:AZURE_CLIENT_ID = `"$($spResult.appId)`"" -ForegroundColor Gray
Write-Host "   `$env:AZURE_CLIENT_SECRET = `"$($spResult.password)`"" -ForegroundColor Gray
Write-Host "   `$env:AZURE_TENANT_ID = `"$($spResult.tenant)`"" -ForegroundColor Gray
Write-Host "   `$env:AZURE_SUBSCRIPTION_ID = `"$SubscriptionId`"" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "   Or source the generated file:" -ForegroundColor Cyan
Write-Host "   . ./azure-service-principal.env" -ForegroundColor Gray
Write-Host "" -ForegroundColor White

Write-Host "2. Run deployment with service principal:" -ForegroundColor White
Write-Host "   ./deploy-database-azure.ps1 -UseServicePrincipal -ResourceGroup `"your-rg`" -RegistryName `"your-registry`"" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White

Write-Host "3. Or run with SkipLogin if already authenticated:" -ForegroundColor White
Write-Host "   ./deploy-database-azure.ps1 -SkipLogin -ResourceGroup `"your-rg`" -RegistryName `"your-registry`"" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White

Write-Host "IMPORTANT: Keep the client secret secure and do not commit it to version control!" -ForegroundColor Red
Write-Host "" -ForegroundColor White
Write-Host "Service Principal setup completed successfully!" -ForegroundColor Green
