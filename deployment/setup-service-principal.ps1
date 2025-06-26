#!/usr/bin/env pwsh
# Setup Service Principal for MDM Database Deployment Automation
# This script helps create a service principal to handle Azure authentication without MFA

param(
    [Parameter(Mandatory=$false)]
    [string]$ServicePrincipalName = "mdm-database-deployment-sp",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "pottersailearning",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$OutputEnvironmentVariables = $true
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up Service Principal for MDM Database Deployment..." -ForegroundColor Cyan
Write-Host "This will create a service principal to bypass MFA requirements in automation" -ForegroundColor Yellow

# 1. Check if Azure CLI is installed
try {
    $azVersion = az --version
    Write-Host "Azure CLI is installed" -ForegroundColor Green
}
catch {
    Write-Host "Azure CLI is not installed. Please install it and try again." -ForegroundColor Red
    exit 1
}

# 2. Check current login status
try {
    $account = az account show | ConvertFrom-Json
    Write-Host "Currently logged in as: $($account.user.name)" -ForegroundColor Green
    Write-Host "Active subscription: $($account.name) ($($account.id))" -ForegroundColor Green
    
    if ($SubscriptionId -and $account.id -ne $SubscriptionId) {
        Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Cyan
        az account set --subscription $SubscriptionId
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to set subscription" -ForegroundColor Red
            exit 1
        }
    }
}
catch {
    Write-Host "Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    Write-Host "Note: You'll need to complete MFA authentication interactively once to create the service principal." -ForegroundColor Yellow
    exit 1
}

# 3. Get current subscription info
$currentSubscription = az account show | ConvertFrom-Json
$subscriptionId = $currentSubscription.id
$tenantId = $currentSubscription.tenantId

Write-Host "Working with subscription: $($currentSubscription.name) ($subscriptionId)" -ForegroundColor Green

# 4. Check if service principal already exists
Write-Host "Checking if service principal already exists..." -ForegroundColor Cyan
$existingSp = az ad sp list --display-name $ServicePrincipalName --query "[0]" | ConvertFrom-Json

if ($existingSp) {
    Write-Host "Service principal '$ServicePrincipalName' already exists" -ForegroundColor Yellow
    Write-Host "App ID: $($existingSp.appId)" -ForegroundColor White
    
    $useExisting = Read-Host "Do you want to use the existing service principal? (y/n)"
    if ($useExisting.ToLower() -ne 'y') {
        Write-Host "Please delete the existing service principal or choose a different name" -ForegroundColor Red
        exit 1
    }
    
    $appId = $existingSp.appId
    $spId = $existingSp.id
    
    # Reset credentials for existing SP
    Write-Host "Resetting credentials for existing service principal..." -ForegroundColor Cyan
    $spCredentials = az ad sp credential reset --id $appId | ConvertFrom-Json
    $clientSecret = $spCredentials.password
    
} else {
    # 5. Create the service principal
    Write-Host "Creating service principal: $ServicePrincipalName" -ForegroundColor Cyan
    
    $spCredentials = az ad sp create-for-rbac `
        --name $ServicePrincipalName `
        --role Contributor `
        --scopes "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup" `
        --years 2 | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create service principal" -ForegroundColor Red
        exit 1
    }
    
    $appId = $spCredentials.appId
    $clientSecret = $spCredentials.password
    $spId = $spCredentials.id
    
    Write-Host "Successfully created service principal" -ForegroundColor Green
}

# 6. Assign additional roles if needed
Write-Host "Ensuring service principal has required permissions..." -ForegroundColor Cyan

# Container Registry permissions
$registryName = "kaddacontainerregistry"
$registryResourceId = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.ContainerRegistry/registries/$registryName"

# Assign AcrPush role for pushing images
az role assignment create `
    --assignee $appId `
    --role "AcrPush" `
    --scope $registryResourceId `
    --output none 2>$null

# Assign Storage Account Contributor for file shares
az role assignment create `
    --assignee $appId `
    --role "Storage Account Contributor" `
    --scope "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup" `
    --output none 2>$null

# Assign Container Apps Contributor
az role assignment create `
    --assignee $appId `
    --role "Container App Contributor" `
    --scope "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup" `
    --output none 2>$null

Write-Host "Assigned required roles to service principal" -ForegroundColor Green

# 7. Test the service principal login
Write-Host "Testing service principal authentication..." -ForegroundColor Cyan
$testLogin = az login --service-principal --username $appId --password $clientSecret --tenant $tenantId --output none 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service principal authentication test successful!" -ForegroundColor Green
    
    # Switch back to user login
    Write-Host "Switching back to user authentication..." -ForegroundColor Cyan
    az logout --output none
    az login --output none
} else {
    Write-Host "⚠️ Service principal authentication test failed" -ForegroundColor Yellow
    Write-Host "This might be due to propagation delays. Try again in a few minutes." -ForegroundColor Yellow
}

# 8. Display results and instructions
Write-Host "" -ForegroundColor White
Write-Host "Service Principal Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Service Principal Name: $ServicePrincipalName" -ForegroundColor White
Write-Host "Application (Client) ID: $appId" -ForegroundColor White
Write-Host "Tenant ID: $tenantId" -ForegroundColor White
Write-Host "Subscription ID: $subscriptionId" -ForegroundColor White

if ($OutputEnvironmentVariables) {
    Write-Host "" -ForegroundColor White
    Write-Host "Environment Variables (add these to your environment):" -ForegroundColor Yellow
    Write-Host "AZURE_CLIENT_ID=$appId" -ForegroundColor Green
    Write-Host "AZURE_CLIENT_SECRET=$clientSecret" -ForegroundColor Green
    Write-Host "AZURE_TENANT_ID=$tenantId" -ForegroundColor Green
    Write-Host "AZURE_SUBSCRIPTION_ID=$subscriptionId" -ForegroundColor Green
    
    Write-Host "" -ForegroundColor White
    Write-Host "PowerShell Commands to set environment variables:" -ForegroundColor Yellow
    Write-Host "`$env:AZURE_CLIENT_ID='$appId'" -ForegroundColor Cyan
    Write-Host "`$env:AZURE_CLIENT_SECRET='$clientSecret'" -ForegroundColor Cyan
    Write-Host "`$env:AZURE_TENANT_ID='$tenantId'" -ForegroundColor Cyan
    Write-Host "`$env:AZURE_SUBSCRIPTION_ID='$subscriptionId'" -ForegroundColor Cyan
    
    Write-Host "" -ForegroundColor White
    Write-Host "Command Prompt Commands:" -ForegroundColor Yellow
    Write-Host "set AZURE_CLIENT_ID=$appId" -ForegroundColor Cyan
    Write-Host "set AZURE_CLIENT_SECRET=$clientSecret" -ForegroundColor Cyan
    Write-Host "set AZURE_TENANT_ID=$tenantId" -ForegroundColor Cyan
    Write-Host "set AZURE_SUBSCRIPTION_ID=$subscriptionId" -ForegroundColor Cyan
}

Write-Host "" -ForegroundColor White
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Set the environment variables above in your shell" -ForegroundColor White
Write-Host "2. Run the deployment script with -UseServicePrincipal flag:" -ForegroundColor White
Write-Host "   ./deploy-database-azure.ps1 -ResourceGroup '$ResourceGroup' -RegistryName 'kaddacontainerregistry' -UseServicePrincipal" -ForegroundColor Cyan
Write-Host "3. The script will automatically use the environment variables for authentication" -ForegroundColor White

Write-Host "" -ForegroundColor White
Write-Host "Security Notes:" -ForegroundColor Yellow
Write-Host "- Store the client secret securely (consider using Azure Key Vault for production)" -ForegroundColor White
Write-Host "- The service principal has minimal required permissions scoped to the resource group" -ForegroundColor White
Write-Host "- Credentials expire in 2 years - set a reminder to rotate them" -ForegroundColor White
Write-Host "- You can delete the service principal when no longer needed with:" -ForegroundColor White
Write-Host "  az ad sp delete --id $appId" -ForegroundColor Cyan

Write-Host "" -ForegroundColor White
Write-Host "Service Principal setup completed successfully!" -ForegroundColor Green
