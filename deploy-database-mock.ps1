#!/usr/bin/env pwsh
# Mock deployment script to test the full deployment flow without Azure authentication

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
    [switch]$MockMode = $true
)

$ErrorActionPreference = "Stop"
$CurrentDate = Get-Date -Format "yyyyMMdd-HHmmss"
$PostgresImageName = "$ContainerAppName"
$RedisImageName = "$RedisContainerAppName"
$FullImageTag = "$CurrentDate-$ImageTag"

Write-Host "MOCK: Deploying MDM PostgreSQL Database to Azure Container Apps..." -ForegroundColor Cyan
Write-Host "MOCK MODE: Simulating deployment without actual Azure calls" -ForegroundColor Yellow

# Mock Azure CLI commands
function Invoke-MockAzCommand {
    param([string]$Command, [string]$ExpectedResult = "success")
    
    Write-Host "MOCK: $Command" -ForegroundColor Gray
    Start-Sleep -Milliseconds 500  # Simulate processing time
    
    switch -Wildcard ($Command) {
        "*az --version*" { 
            Write-Host "azure-cli 2.57.0" -ForegroundColor Green
            return "azure-cli 2.57.0"
        }
        "*az account show*" { 
            return '{"user":{"name":"test@example.com"},"id":"test-subscription","name":"Test Subscription"}'
        }
        "*az acr show*" { 
            return "testregistry.azurecr.io"
        }
        "*az acr credential show*username*" { 
            return "testuser"
        }
        "*az acr credential show*password*" { 
            return "testpassword123"
        }
        "*az containerapp env list*" { 
            return "[]"
        }
        "*az storage account keys list*" { 
            return "teststoragekey123"
        }
        "*az containerapp show*fqdn*" { 
            if ($Command -like "*mdm-postgres*") {
                return "mdm-postgres.internal.centralus.azurecontainerapps.io"
            } else {
                return "mdm-redis.internal.centralus.azurecontainerapps.io"
            }
        }
        default { 
            return "success"
        }
    }
}

# 1. Check if Azure CLI is installed
Write-Host "1. Checking Azure CLI installation..." -ForegroundColor Cyan
$azVersion = Invoke-MockAzCommand "az --version"
Write-Host "✓ Azure CLI is installed: $azVersion" -ForegroundColor Green

# 2. Check Azure login status
Write-Host "2. Checking Azure authentication..." -ForegroundColor Cyan
$account = Invoke-MockAzCommand "az account show" | ConvertFrom-Json
Write-Host "✓ Logged in to Azure as: $($account.user.name)" -ForegroundColor Green

# 3. Login to Azure Container Registry
Write-Host "3. Logging in to Azure Container Registry..." -ForegroundColor Cyan
$acrLoginServer = Invoke-MockAzCommand "az acr show --name $RegistryName --query loginServer -o tsv"
$acrUsername = Invoke-MockAzCommand "az acr credential show --name $RegistryName --query username -o tsv"
$acrPassword = Invoke-MockAzCommand "az acr credential show --name $RegistryName --query passwords[0].value -o tsv"
Write-Host "✓ Successfully retrieved ACR credentials" -ForegroundColor Green
Write-Host "  Server: $acrLoginServer" -ForegroundColor White
Write-Host "  Username: $acrUsername" -ForegroundColor White

# 4. Create Dockerfile for PostgreSQL with pgvector
Write-Host "4. Creating Dockerfile for PostgreSQL with pgvector..." -ForegroundColor Cyan
$dockerfileContent = @"
