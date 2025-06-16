#!/usr/bin/env pwsh
# Azure Container App deployment script for MDM PostgreSQL Database

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "",

    [Parameter(Mandatory=$false)]
    [string]$RegistryName = "containerregistry",

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
    
    # Service Principal Authentication (for hands-off deployment)
    [Parameter(Mandatory=$false)]
    [string]$ServicePrincipalId = [Environment]::GetEnvironmentVariable("AZURE_CLIENT_ID"),
    
    [Parameter(Mandatory=$false)]
    [string]$ServicePrincipalSecret = [Environment]::GetEnvironmentVariable("AZURE_CLIENT_SECRET"),
    
    [Parameter(Mandatory=$false)]
    [string]$TenantId = [Environment]::GetEnvironmentVariable("AZURE_TENANT_ID"),
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = [Environment]::GetEnvironmentVariable("AZURE_SUBSCRIPTION_ID"),
    
    [Parameter(Mandatory=$false)]
    [switch]$UseServicePrincipal = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipLogin = $false
)

$ErrorActionPreference = "Stop"
$CurrentDate = Get-Date -Format "yyyyMMdd-HHmmss"
$PostgresImageName = "$ContainerAppName"
$RedisImageName = "$RedisContainerAppName"
$FullImageTag = "$CurrentDate-$ImageTag"

Write-Host "Deploying MDM PostgreSQL Database to Azure Container Apps..." -ForegroundColor Cyan

# 1. Check if Azure CLI is installed
try {
    $azVersion = az --version
    Write-Host "Azure CLI is installed" -ForegroundColor Green
}
catch {
    Write-Host "Azure CLI is not installed. Please install it and try again." -ForegroundColor Red
    exit 1
}

# 2. Handle Azure Authentication
# Auto-detect service principal from environment variables
if ($ServicePrincipalId -and $ServicePrincipalSecret -and $TenantId) {
    $UseServicePrincipal = $true
}

if ($UseServicePrincipal) {
    Write-Host "Using Service Principal authentication..." -ForegroundColor Cyan
    
    if (-not $ServicePrincipalId -or -not $ServicePrincipalSecret -or -not $TenantId) {
        Write-Host "ERROR: Service Principal authentication requires AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID" -ForegroundColor Red
        Write-Host "Set these environment variables or pass them as parameters" -ForegroundColor Yellow
        exit 1
    }
    
    # Login with service principal (this bypasses MFA)
    Write-Host "Logging in with service principal (bypasses MFA)..." -ForegroundColor Cyan
    az login --service-principal --username $ServicePrincipalId --password $ServicePrincipalSecret --tenant $TenantId --output none
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to login with service principal" -ForegroundColor Red
        exit 1
    }
    
    # Set subscription if provided
    if ($SubscriptionId) {
        az account set --subscription $SubscriptionId --output none
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to set subscription" -ForegroundColor Red
            exit 1
        }
    }
    
    $account = az account show | ConvertFrom-Json
    Write-Host "Successfully authenticated with service principal" -ForegroundColor Green
    Write-Host "Active subscription: $($account.name) ($($account.id))" -ForegroundColor Green
} elseif (-not $SkipLogin) {
    # Check existing login status
    try {
        $account = az account show 2>$null | ConvertFrom-Json
        if ($account) {
            Write-Host "Already logged in to Azure as: $($account.user.name)" -ForegroundColor Green
        } else {
            throw "Not logged in"
        }
    }
    catch {
        Write-Host "ERROR: Not logged in to Azure and no service principal provided" -ForegroundColor Red
        Write-Host "Solutions:" -ForegroundColor Yellow
        Write-Host "1. Create service principal: ./setup-service-principal.ps1" -ForegroundColor Yellow
        Write-Host "2. Set environment variables and use -UseServicePrincipal" -ForegroundColor Yellow
        Write-Host "3. Run 'az login' first, then use -SkipLogin" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Skipping login check (assuming already authenticated)" -ForegroundColor Yellow
}

# 3. Login to Azure Container Registry
Write-Host "Logging in to Azure Container Registry..." -ForegroundColor Cyan
$acrLoginServer = az acr show --name $RegistryName --query loginServer -o tsv
$acrUsername = az acr credential show --name $RegistryName --query username -o tsv
$acrPassword = az acr credential show --name $RegistryName --query "passwords[0].value" -o tsv

if (-not $acrLoginServer -or -not $acrUsername -or -not $acrPassword) {
    Write-Host "Failed to get ACR credentials" -ForegroundColor Red
    exit 1
}

Write-Host "Successfully retrieved ACR credentials" -ForegroundColor Green

# Login to Docker
Write-Host "Logging in to Docker registry..." -ForegroundColor Cyan
$result = az acr login --name $RegistryName
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to login to ACR with the az acr login command" -ForegroundColor Red
    Write-Host "Attempting to login with docker login command..." -ForegroundColor Yellow

    echo $acrPassword | docker login $acrLoginServer --username $acrUsername --password-stdin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to login to Docker registry" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Successfully logged in to Docker registry" -ForegroundColor Green

# 4. Create Dockerfile for PostgreSQL with pgvector
Write-Host "Creating Dockerfile for PostgreSQL with pgvector..." -ForegroundColor Cyan
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

Set-Content -Path "Dockerfile.postgres" -Value $dockerfileContent
Write-Host "Created Dockerfile.postgres" -ForegroundColor Green

# 5. Build PostgreSQL Docker image
$fullPostgresImageName = "${acrLoginServer}/${PostgresImageName}:${FullImageTag}"
Write-Host "Building PostgreSQL Docker image: $fullPostgresImageName" -ForegroundColor Cyan
docker build -f Dockerfile.postgres -t $fullPostgresImageName .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build PostgreSQL Docker image" -ForegroundColor Red
    exit 1
}
Write-Host "Successfully built PostgreSQL Docker image" -ForegroundColor Green

# 6. Push PostgreSQL Docker image to ACR
Write-Host "Pushing PostgreSQL Docker image to ACR..." -ForegroundColor Cyan
docker push $fullPostgresImageName
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push PostgreSQL Docker image to ACR" -ForegroundColor Red
    exit 1
}
Write-Host "Successfully pushed PostgreSQL Docker image to ACR" -ForegroundColor Green

# 7. Create Redis Dockerfile if deploying Redis
if ($DeployRedis) {
    Write-Host "Creating Dockerfile for Redis..." -ForegroundColor Cyan
    $redisDockerfileContent = @'
FROM redis:7-alpine

# Copy custom redis configuration if needed
# COPY redis.conf /usr/local/etc/redis/redis.conf

# Expose Redis port
EXPOSE 6379

# Use appendonly persistence
CMD ["redis-server", "--appendonly", "yes"]
'@

    Set-Content -Path "Dockerfile.redis" -Value $redisDockerfileContent
    Write-Host "Created Dockerfile.redis" -ForegroundColor Green

    # Build Redis Docker image
    $fullRedisImageName = "${acrLoginServer}/${RedisImageName}:${FullImageTag}"
    Write-Host "Building Redis Docker image: $fullRedisImageName" -ForegroundColor Cyan
    docker build -f Dockerfile.redis -t $fullRedisImageName .
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to build Redis Docker image" -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully built Redis Docker image" -ForegroundColor Green

    # Push Redis Docker image to ACR
    Write-Host "Pushing Redis Docker image to ACR..." -ForegroundColor Cyan
    docker push $fullRedisImageName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to push Redis Docker image to ACR" -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully pushed Redis Docker image to ACR" -ForegroundColor Green
}

# 8. Check if Container App environment exists
$envExists = az containerapp env list --resource-group $ResourceGroup | ConvertFrom-Json
$envName = "mdm-database-env"

if ($null -eq $envExists -or $envExists.Count -eq 0) {
    Write-Host "Creating Container App environment..." -ForegroundColor Cyan
    az containerapp env create `
        --name $envName `
        --resource-group $ResourceGroup `
        --location $Location

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create Container App environment" -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully created Container App environment" -ForegroundColor Green
} else {
    $envName = $envExists[0].name
    Write-Host "Using existing Container App environment: $envName" -ForegroundColor Green
}

# 9. Create Azure File Share for persistent storage (if requested)
if ($CreateFileShare) {
    Write-Host "Creating Azure File Share for persistent storage..." -ForegroundColor Cyan
    
    # Create storage account
    $storageAccountName = "mdmdb$(Get-Random -Minimum 1000 -Maximum 9999)"
    Write-Host "Creating storage account: $storageAccountName" -ForegroundColor Cyan
    
    az storage account create `
        --name $storageAccountName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Standard_LRS `
        --kind StorageV2
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create storage account" -ForegroundColor Red
        exit 1
    }
    
    # Get storage account key
    $storageKey = az storage account keys list --resource-group $ResourceGroup --account-name $storageAccountName --query "[0].value" -o tsv
    
    # Create file shares
    az storage share create --name "postgres-data" --account-name $storageAccountName --account-key $storageKey
    if ($DeployRedis) {
        az storage share create --name "redis-data" --account-name $storageAccountName --account-key $storageKey
    }
    
    Write-Host "Successfully created file shares" -ForegroundColor Green
}

# 10. Set up database secrets
Write-Host "Setting up database secrets..." -ForegroundColor Cyan
$secrets = @(
    "postgres-password=$DbPassword",
    "postgres-user=$DbUser",
    "postgres-db=$DbName"
)

if ($CreateFileShare) {
    $secrets += "storage-account-key=$storageKey"
}

# 11. Check if PostgreSQL Container App exists and create or update it
$postgresAppExists = $false
try {
    $appCheck = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup 2>&1
    if ($LASTEXITCODE -eq 0) {
        $postgresAppExists = $true
    }
} catch {
    $postgresAppExists = $false
}

# Environment variables for PostgreSQL
$postgresEnvVars = @(
    "POSTGRES_DB=secretref:postgres-db",
    "POSTGRES_USER=secretref:postgres-user", 
    "POSTGRES_PASSWORD=secretref:postgres-password",
    "POSTGRES_INITDB_ARGS=--encoding=UTF8",
    "PGPORT=$DbPort"
)

if (-not $postgresAppExists) {
    Write-Host "Creating new PostgreSQL Container App..." -ForegroundColor Cyan
    
    $createCmd = "az containerapp create " +
        "--name $ContainerAppName " +
        "--resource-group $ResourceGroup " +
        "--environment $envName " +
        "--registry-server $acrLoginServer " +
        "--registry-username $acrUsername " +
        "--registry-password $acrPassword " +
        "--image $fullPostgresImageName " +
        "--target-port $DbPort " +
        "--ingress internal " +
        "--cpu 2.0 " +
        "--memory 4.0Gi " +
        "--min-replicas 1 " +
        "--max-replicas 1 " +
        "--secrets `"$($secrets -join ' ')`" " +
        "--env-vars `"$($postgresEnvVars -join ' ')`""
    
    # Add volume mounts if file share was created
    if ($CreateFileShare) {
        $createCmd += " --azure-file-volume-name postgres-data --azure-file-share-name postgres-data --azure-file-account-name $storageAccountName --azure-file-account-key secretref:storage-account-key --azure-file-access-mode ReadWrite"
    }
    
    Invoke-Expression $createCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create PostgreSQL Container App" -ForegroundColor Red
        exit 1
    }
    Write-Host "Successfully created PostgreSQL Container App" -ForegroundColor Green
} else {
    Write-Host "Updating existing PostgreSQL Container App..." -ForegroundColor Cyan

    # Update the container app's image
    az containerapp update `
        --name $ContainerAppName `
        --resource-group $ResourceGroup `
        --image $fullPostgresImageName

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to update PostgreSQL Container App image" -ForegroundColor Red
        exit 1
    }

    # Update registry credentials
    az containerapp registry set `
        --name $ContainerAppName `
        --resource-group $ResourceGroup `
        --server $acrLoginServer `
        --username $acrUsername `
        --password $acrPassword

    # Update secrets and environment variables
    az containerapp secret set `
        --name $ContainerAppName `
        --resource-group $ResourceGroup `
        --secrets $($secrets -join ' ')

    az containerapp update `
        --name $ContainerAppName `
        --resource-group $ResourceGroup `
        --set-env-vars $($postgresEnvVars -join ' ')

    Write-Host "Successfully updated PostgreSQL Container App" -ForegroundColor Green
}

# 12. Deploy Redis if requested
if ($DeployRedis) {
    Write-Host "Deploying Redis Container App..." -ForegroundColor Cyan
    
    $redisAppExists = $false
    try {
        $redisAppCheck = az containerapp show --name $RedisContainerAppName --resource-group $ResourceGroup 2>&1
        if ($LASTEXITCODE -eq 0) {
            $redisAppExists = $true
        }
    } catch {
        $redisAppExists = $false
    }

    $redisEnvVars = @("REDIS_APPENDONLY=yes")
    $redisSecrets = @()
    
    if ($CreateFileShare) {
        $redisSecrets += "storage-account-key=$storageKey"
    }

    if (-not $redisAppExists) {
        Write-Host "Creating new Redis Container App..." -ForegroundColor Cyan
        
        $redisCreateCmd = "az containerapp create " +
            "--name $RedisContainerAppName " +
            "--resource-group $ResourceGroup " +
            "--environment $envName " +
            "--registry-server $acrLoginServer " +
            "--registry-username $acrUsername " +
            "--registry-password $acrPassword " +
            "--image $fullRedisImageName " +
            "--target-port 6379 " +
            "--ingress internal " +
            "--cpu 1.0 " +
            "--memory 2.0Gi " +
            "--min-replicas 1 " +
            "--max-replicas 1 " +
            "--env-vars `"$($redisEnvVars -join ' ')`""
        
        if ($CreateFileShare -and $redisSecrets.Count -gt 0) {
            $redisCreateCmd += " --secrets `"$($redisSecrets -join ' ')`" --azure-file-volume-name redis-data --azure-file-share-name redis-data --azure-file-account-name $storageAccountName --azure-file-account-key secretref:storage-account-key --azure-file-access-mode ReadWrite"
        }
        
        Invoke-Expression $redisCreateCmd
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to create Redis Container App" -ForegroundColor Red
            exit 1
        }
        Write-Host "Successfully created Redis Container App" -ForegroundColor Green
    } else {
        Write-Host "Updating existing Redis Container App..." -ForegroundColor Cyan
        
        az containerapp update `
            --name $RedisContainerAppName `
            --resource-group $ResourceGroup `
            --image $fullRedisImageName

        Write-Host "Successfully updated Redis Container App" -ForegroundColor Green
    }
}

# 13. Get connection information
Write-Host "Getting connection information..." -ForegroundColor Cyan
$postgresFqdn = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv

if ($DeployRedis) {
    $redisFqdn = az containerapp show --name $RedisContainerAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
}

# 14. Display deployment results
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Database Information:" -ForegroundColor Yellow
Write-Host "  Internal FQDN: $postgresFqdn" -ForegroundColor White
Write-Host "  Port: $DbPort" -ForegroundColor White
Write-Host "  Database: $DbName" -ForegroundColor White
Write-Host "  Username: $DbUser" -ForegroundColor White
Write-Host "  Connection String: postgresql://$DbUser" + ":[PASSWORD]@$postgresFqdn" + ":$DbPort/$DbName" -ForegroundColor White

if ($DeployRedis) {
    Write-Host "" -ForegroundColor White
    Write-Host "Redis Cache Information:" -ForegroundColor Yellow
    Write-Host "  Internal FQDN: $redisFqdn" -ForegroundColor White
    Write-Host "  Port: 6379" -ForegroundColor White
    Write-Host "  Connection String: redis://$redisFqdn`:6379" -ForegroundColor White
}

if ($CreateFileShare) {
    Write-Host "" -ForegroundColor White
    Write-Host "Storage Information:" -ForegroundColor Yellow
    Write-Host "  Storage Account: $storageAccountName" -ForegroundColor White
    Write-Host "  PostgreSQL Data Share: postgres-data" -ForegroundColor White
    if ($DeployRedis) {
        Write-Host "  Redis Data Share: redis-data" -ForegroundColor White
    }
}

Write-Host "" -ForegroundColor White
Write-Host "Environment Variables for your application:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL=postgresql://$DbUser`:$DbPassword@$postgresFqdn`:$DbPort/$DbName" -ForegroundColor Green
Write-Host "  POSTGRES_HOST=$postgresFqdn" -ForegroundColor Green
Write-Host "  POSTGRES_PORT=$DbPort" -ForegroundColor Green
Write-Host "  POSTGRES_DB=$DbName" -ForegroundColor Green
Write-Host "  POSTGRES_USER=$DbUser" -ForegroundColor Green
Write-Host "  POSTGRES_PASSWORD=$DbPassword" -ForegroundColor Green

if ($DeployRedis) {
    Write-Host "  REDIS_URL=redis://$redisFqdn`:6379" -ForegroundColor Green
}

Write-Host "" -ForegroundColor White
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update your application's environment variables with the connection strings above" -ForegroundColor White
Write-Host "2. Ensure your application container app is in the same Container App Environment for internal networking" -ForegroundColor White
Write-Host "3. Test the database connection from your application" -ForegroundColor White
Write-Host "4. Consider setting up backup and monitoring for production use" -ForegroundColor White

# 15. Clean up temporary files
Remove-Item -Path "Dockerfile.postgres" -Force -ErrorAction SilentlyContinue
if ($DeployRedis) {
    Remove-Item -Path "Dockerfile.redis" -Force -ErrorAction SilentlyContinue
}

Write-Host "" -ForegroundColor White
Write-Host "Database deployment completed successfully!" -ForegroundColor Green
