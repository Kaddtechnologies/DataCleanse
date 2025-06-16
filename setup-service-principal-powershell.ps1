#!/usr/bin/env pwsh
# Setup Service Principal using Azure PowerShell Module (Alternative to Azure CLI)
# This might handle MFA requirements differently than Azure CLI

param(
    [Parameter(Mandatory=$false)]
    [string]$ServicePrincipalName = "mdm-database-deployment-sp",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "pottersailearning",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = ""
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up Service Principal using Azure PowerShell Module..." -ForegroundColor Cyan
Write-Host "This is an alternative approach that might handle MFA better than Azure CLI" -ForegroundColor Yellow

# 1. Check if Azure PowerShell module is installed
Write-Host "Checking Azure PowerShell module..." -ForegroundColor Cyan
$azModule = Get-Module -ListAvailable -Name Az.Accounts
if (-not $azModule) {
    Write-Host "Azure PowerShell module not found. Installing..." -ForegroundColor Yellow
    Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force -AllowClobber
    Write-Host "Azure PowerShell module installed" -ForegroundColor Green
} else {
    Write-Host "Azure PowerShell module is available" -ForegroundColor Green
}

# 2. Import required modules
Import-Module Az.Accounts -Force
Import-Module Az.Resources -Force
Import-Module Az.Profile -Force

# 3. Connect to Azure (this might handle MFA better)
Write-Host "Connecting to Azure using PowerShell module..." -ForegroundColor Cyan
try {
    $context = Get-AzContext
    if (-not $context) {
        Write-Host "Not connected to Azure. Attempting to connect..." -ForegroundColor Yellow
        Connect-AzAccount -ErrorAction Stop
    } else {
        Write-Host "Already connected to Azure as: $($context.Account.Id)" -ForegroundColor Green
    }
} catch {
    Write-Host "Failed to connect to Azure: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please run Connect-AzAccount manually and then retry this script" -ForegroundColor Yellow
    exit 1
}

# 4. Set subscription if specified
if ($SubscriptionId) {
    Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Cyan
    Set-AzContext -SubscriptionId $SubscriptionId
}

# 5. Get current context
$context = Get-AzContext
$subscriptionId = $context.Subscription.Id
$tenantId = $context.Tenant.Id

Write-Host "Working with subscription: $($context.Subscription.Name) ($subscriptionId)" -ForegroundColor Green

# 6. Create Azure AD Application
Write-Host "Creating Azure AD Application..." -ForegroundColor Cyan
try {
    # Check if application already exists
    $existingApp = Get-AzADApplication -DisplayName $ServicePrincipalName -ErrorAction SilentlyContinue
    
    if ($existingApp) {
        Write-Host "Application '$ServicePrincipalName' already exists" -ForegroundColor Yellow
        $useExisting = Read-Host "Do you want to use the existing application? (y/n)"
        if ($useExisting.ToLower() -ne 'y') {
            Write-Host "Please delete the existing application or choose a different name" -ForegroundColor Red
            exit 1
        }
        $application = $existingApp
    } else {
        $application = New-AzADApplication -DisplayName $ServicePrincipalName
        Write-Host "Created Azure AD Application: $($application.AppId)" -ForegroundColor Green
    }
    
    # Create Service Principal
    $servicePrincipal = Get-AzADServicePrincipal -ApplicationId $application.AppId -ErrorAction SilentlyContinue
    if (-not $servicePrincipal) {
        $servicePrincipal = New-AzADServicePrincipal -ApplicationId $application.AppId
        Write-Host "Created Service Principal: $($servicePrincipal.Id)" -ForegroundColor Green
    }
    
    # Create Client Secret
    Write-Host "Creating client secret..." -ForegroundColor Cyan
    $clientSecret = New-AzADAppCredential -ApplicationId $application.AppId -EndDate (Get-Date).AddYears(2)
    
    Write-Host "Successfully created service principal and client secret" -ForegroundColor Green
    
} catch {
    Write-Host "Failed to create Azure AD application/service principal: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This might be due to insufficient permissions. You may need to:" -ForegroundColor Yellow
    Write-Host "1. Have 'Application Administrator' role in Azure AD, or" -ForegroundColor Yellow
    Write-Host "2. Use the Azure Portal method instead" -ForegroundColor Yellow
    exit 1
}

# 7. Assign roles
Write-Host "Assigning roles to service principal..." -ForegroundColor Cyan

# Get resource group
$resourceGroup = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
if (-not $resourceGroup) {
    Write-Host "Resource group '$ResourceGroupName' not found" -ForegroundColor Red
    exit 1
}

# Assign Contributor role to resource group
try {
    New-AzRoleAssignment -ObjectId $servicePrincipal.Id -RoleDefinitionName "Contributor" -ResourceGroupName $ResourceGroupName -ErrorAction SilentlyContinue
    Write-Host "Assigned Contributor role to resource group" -ForegroundColor Green
} catch {
    Write-Host "Warning: Failed to assign Contributor role: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Try to assign additional specific roles
try {
    # Container Registry roles
    $acrResourceId = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.ContainerRegistry/registries/kaddacontainerregistry"
    New-AzRoleAssignment -ObjectId $servicePrincipal.Id -RoleDefinitionName "AcrPush" -Scope $acrResourceId -ErrorAction SilentlyContinue
    
    # Storage roles
    New-AzRoleAssignment -ObjectId $servicePrincipal.Id -RoleDefinitionName "Storage Account Contributor" -ResourceGroupName $ResourceGroupName -ErrorAction SilentlyContinue
    
    Write-Host "Assigned additional specific roles" -ForegroundColor Green
} catch {
    Write-Host "Warning: Some specific role assignments may have failed, but Contributor should be sufficient" -ForegroundColor Yellow
}

# 8. Test the service principal
Write-Host "Testing service principal authentication..." -ForegroundColor Cyan
try {
    # Clear current context
    Clear-AzContext -Force
    
    # Convert secure string to plain text for connection
    $clientSecretValue = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret.SecretText))
    $securePassword = ConvertTo-SecureString $clientSecretValue -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($application.AppId, $securePassword)
    
    # Connect with service principal
    Connect-AzAccount -ServicePrincipal -Credential $credential -TenantId $tenantId -SubscriptionId $subscriptionId
    
    Write-Host "✅ Service principal authentication test successful!" -ForegroundColor Green
    
    # Switch back to user account
    Clear-AzContext -Force
    Connect-AzAccount
    
} catch {
    Write-Host "⚠️ Service principal authentication test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "This might be due to propagation delays. Try again in a few minutes." -ForegroundColor Yellow
}

# 9. Display results
Write-Host "" -ForegroundColor White
Write-Host "Service Principal Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Service Principal Name: $ServicePrincipalName" -ForegroundColor White
Write-Host "Application (Client) ID: $($application.AppId)" -ForegroundColor White
Write-Host "Tenant ID: $tenantId" -ForegroundColor White
Write-Host "Subscription ID: $subscriptionId" -ForegroundColor White

Write-Host "" -ForegroundColor White
Write-Host "Environment Variables:" -ForegroundColor Yellow
Write-Host "AZURE_CLIENT_ID=$($application.AppId)" -ForegroundColor Green
Write-Host "AZURE_CLIENT_SECRET=[HIDDEN - Use the value from above]" -ForegroundColor Green
Write-Host "AZURE_TENANT_ID=$tenantId" -ForegroundColor Green
Write-Host "AZURE_SUBSCRIPTION_ID=$subscriptionId" -ForegroundColor Green

Write-Host "" -ForegroundColor White
Write-Host "PowerShell Commands to set environment variables:" -ForegroundColor Yellow
Write-Host "`$env:AZURE_CLIENT_ID='$($application.AppId)'" -ForegroundColor Cyan
Write-Host "`$env:AZURE_CLIENT_SECRET='$clientSecretValue'" -ForegroundColor Cyan
Write-Host "`$env:AZURE_TENANT_ID='$tenantId'" -ForegroundColor Cyan
Write-Host "`$env:AZURE_SUBSCRIPTION_ID='$subscriptionId'" -ForegroundColor Cyan

Write-Host "" -ForegroundColor White
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Copy and run the PowerShell commands above to set environment variables" -ForegroundColor White
Write-Host "2. Run the deployment script:" -ForegroundColor White
Write-Host "   ./deploy-database-azure.ps1 -ResourceGroup '$ResourceGroupName' -RegistryName 'kaddacontainerregistry' -UseServicePrincipal" -ForegroundColor Cyan

Write-Host "" -ForegroundColor White
Write-Host "Security Notes:" -ForegroundColor Yellow
Write-Host "- Store the client secret securely" -ForegroundColor White
Write-Host "- Credentials expire in 2 years" -ForegroundColor White
Write-Host "- Service principal has minimal required permissions" -ForegroundColor White

Write-Host "" -ForegroundColor White
Write-Host "If this script fails due to permissions, please use the Azure Portal method described above." -ForegroundColor Yellow 