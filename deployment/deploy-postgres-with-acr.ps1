# Deploy PostgreSQL using your existing Azure Container Registry
# This uses your mdmcleansecr registry

param(
    [string]$ResourceGroup = "RG_DAI_S01",
    [string]$ContainerName = "mdm-postgres-db",
    [string]$Location = "westus2",
    [string]$AcrName = "mdmcleansecr"
)

Write-Host "Deploying PostgreSQL using your ACR..." -ForegroundColor Green

# First, let's import the PostgreSQL image to your ACR
Write-Host "Importing PostgreSQL with pgvector to your ACR..." -ForegroundColor Yellow
az acr import `
    --name $AcrName `
    --source docker.io/pgvector/pgvector:pg16 `
    --image postgres-pgvector:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to import image. Continuing with existing image..." -ForegroundColor Yellow
}

# Get ACR credentials
Write-Host "Getting ACR credentials..." -ForegroundColor Yellow
$acrServer = "$AcrName.azurecr.io"
$acrUsername = $AcrName
$acrPassword = "ltdXERsWT2CCvYvt2rNuHuh19RBlXP/HHGqANZfrTH+ACRBYmDYf"

Write-Host "Deploying PostgreSQL database container..." -ForegroundColor Green

# Deploy the PostgreSQL container
az container create `
    --resource-group $ResourceGroup `
    --name $ContainerName `
    --image "$acrServer/postgres-pgvector:latest" `
    --registry-login-server $acrServer `
    --registry-username $acrUsername `
    --registry-password $acrPassword `
    --dns-name-label "mdm-postgres-pgvector" `
    --ports 5432 `
    --os-type Linux `
    --environment-variables `
        POSTGRES_DB=mdm_dedup `
        POSTGRES_USER=postgres `
        POSTGRES_PASSWORD=mdm_password123 `
    --cpu 1 `
    --memory 2 `
    --location $Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL database container deployed successfully!" -ForegroundColor Green
    Write-Host "Database URL: mdm-postgres-pgvector.westus2.azurecontainer.io:5432" -ForegroundColor Cyan
    Write-Host "Database: mdm_dedup" -ForegroundColor Cyan
    Write-Host "Username: postgres" -ForegroundColor Cyan
    Write-Host "Password: mdm_password123" -ForegroundColor Cyan
    
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Wait 2-3 minutes for container to fully start" -ForegroundColor White
    Write-Host "2. Run your setup-database.sh script" -ForegroundColor White
    Write-Host "3. Test the database connection" -ForegroundColor White
} else {
    Write-Host "Failed to deploy PostgreSQL container" -ForegroundColor Red
} 