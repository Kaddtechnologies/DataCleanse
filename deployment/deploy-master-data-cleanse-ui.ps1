# Deploy Master Data Cleanse UI to Azure Container Instances
# PowerShell version with enhanced error handling and build process

param(
    [string]$SubscriptionId = "f91c0687-6c71-4a3b-ab6c-6bb9b65b42c8",
    [string]$ResourceGroupName = "RG_DAI_S01",
    [string]$Location = "westus2",
    [string]$RegistryName = "mdmcleansecr",
    [string]$ImageName = "mdm-master-data-cleanse-ui",
    [string]$ImageTag = "latest",
    [string]$ContainerGroupName = "mdm-ui",
    [string]$ContainerName = "mdm-ui-app",
    [string]$DnsLabel = "mdm-ui-app"
)

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$NC = "`e[0m" # No Color

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $NC)
    Write-Host "${Color}${Message}${NC}"
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check prerequisites
Write-ColorOutput "Checking prerequisites..." $Blue

if (-not (Test-Command "az")) {
    Write-ColorOutput "ERROR: Azure CLI not found. Please install Azure CLI first." $Red
    exit 1
}

# Check if logged in to Azure
try {
    $account = az account show --query "user.name" -o tsv 2>$null
    if (-not $account) {
        Write-ColorOutput "ERROR: Not logged in to Azure. Please run 'az login' first." $Red
        exit 1
    }
    Write-ColorOutput "SUCCESS: Logged in to Azure as: $account" $Green
}
catch {
    Write-ColorOutput "ERROR: Failed to check Azure login status." $Red
    exit 1
}

# Set subscription
Write-ColorOutput "Setting Azure subscription..." $Blue
try {
    az account set --subscription $SubscriptionId
    Write-ColorOutput "SUCCESS: Set subscription to: $SubscriptionId" $Green
}
catch {
    Write-ColorOutput "ERROR: Failed to set subscription. Please check subscription ID." $Red
    exit 1
}

# Navigate to project root (assuming script is in deployment folder)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
Write-ColorOutput "Working from project root: $ProjectRoot" $Blue

# Create build directory
$BuildDir = "temp-build"
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Path $BuildDir | Out-Null
Write-ColorOutput "Created build directory: $BuildDir" $Blue

# Create Dockerfile for Next.js application
$DockerfileContent = @'
# Multi-stage build for Next.js application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
'@

$DockerfileContent | Out-File -FilePath "$BuildDir/Dockerfile" -Encoding UTF8
Write-ColorOutput "Created Dockerfile" $Green

# Copy necessary files to build directory
Write-ColorOutput "Copying project files..." $Blue

$FilesToCopy = @(
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.mjs"
)

foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file "$BuildDir/" -Force
        Write-ColorOutput "SUCCESS: Copied $file" $Green
    } else {
        Write-ColorOutput "WARNING: $file not found, skipping..." $Yellow
    }
}

# Copy directories
$DirsToCopy = @("src", "public")
foreach ($dir in $DirsToCopy) {
    if (Test-Path $dir) {
        Copy-Item $dir "$BuildDir/" -Recurse -Force
        Write-ColorOutput "SUCCESS: Copied $dir/ directory" $Green
    } else {
        Write-ColorOutput "WARNING: $dir/ directory not found, skipping..." $Yellow
    }
}

# Check if next.config.ts needs standalone output
$NextConfigPath = "$BuildDir/next.config.ts"
if (Test-Path $NextConfigPath) {
    Write-ColorOutput "Updating next.config.ts for standalone output..." $Blue
    
    $NextConfigContent = Get-Content $NextConfigPath -Raw
    if ($NextConfigContent -notmatch "output:\s*[`"']standalone[`"']") {
        # Simple replacement to add standalone output
        $UpdatedConfig = $NextConfigContent -replace 
            "(const nextConfig.*?=.*?{)", 
            "`$1`n  output: 'standalone',"
        
        $UpdatedConfig | Out-File -FilePath $NextConfigPath -Encoding UTF8
        Write-ColorOutput "SUCCESS: Updated next.config.ts with standalone output" $Green
    }
}

# Create .env.production file with Azure configuration
$EnvContent = @"
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://$DnsLabel.${Location}.azurecontainer.io
DATABASE_URL=postgresql://postgres:mdm_password123@mdm-postgres-pgvector.${Location}.azurecontainer.io:5432/mdm_dedup
DB_HOST=mdm-postgres-pgvector.${Location}.azurecontainer.io
DB_PORT=5432
DB_NAME=mdm_dedup
DB_USER=postgres
DB_PASSWORD=mdm_password123
NEXT_TELEMETRY_DISABLED=1
"@

$EnvContent | Out-File -FilePath "$BuildDir/.env.production" -Encoding UTF8
Write-ColorOutput "SUCCESS: Created .env.production file" $Green

# Login to Azure Container Registry
Write-ColorOutput "Logging in to Azure Container Registry..." $Blue
try {
    az acr login --name $RegistryName
    Write-ColorOutput "SUCCESS: Logged in to registry: $RegistryName" $Green
}
catch {
    Write-ColorOutput "ERROR: Failed to login to Azure Container Registry" $Red
    exit 1
}

# Build and push image using Azure Container Registry
$FullImageName = "${RegistryName}.azurecr.io/${ImageName}:${ImageTag}"
Write-ColorOutput "Building and pushing Docker image..." $Blue
Write-ColorOutput "Image: $FullImageName" $Blue

try {
    Set-Location $BuildDir
    az acr build --registry $RegistryName --image "${ImageName}:${ImageTag}" . --platform linux
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "SUCCESS: Successfully built and pushed image: $FullImageName" $Green
    } else {
        throw "Build failed with exit code $LASTEXITCODE"
    }
}
catch {
    Write-ColorOutput "ERROR: Failed to build/push Docker image: $($_.Exception.Message)" $Red
    Set-Location $ProjectRoot
    exit 1
}

Set-Location $ProjectRoot

# Check if container group already exists
Write-ColorOutput "Checking if container group exists..." $Blue
$ExistingContainer = az container show --resource-group $ResourceGroupName --name $ContainerGroupName 2>$null
if ($ExistingContainer) {
    Write-ColorOutput "Deleting existing container group..." $Yellow
    az container delete --resource-group $ResourceGroupName --name $ContainerGroupName --yes
    Write-ColorOutput "SUCCESS: Deleted existing container group" $Green
}

# Get registry credentials
Write-ColorOutput "Getting registry credentials..." $Blue
$RegistryPassword = az acr credential show --name $RegistryName --query "passwords[0].value" --output tsv

# Deploy to Azure Container Instances
Write-ColorOutput "Deploying to Azure Container Instances..." $Blue

try {
    $AppUrl = az container create `
        --resource-group $ResourceGroupName `
        --name $ContainerGroupName `
        --image $FullImageName `
        --dns-name-label $DnsLabel `
        --location $Location `
        --cpu 2 `
        --memory 4 `
        --ports 3000 `
        --os-type Linux `
        --registry-login-server "${RegistryName}.azurecr.io" `
        --registry-username $RegistryName `
        --registry-password $RegistryPassword `
        --query "ipAddress.fqdn" `
        --output tsv
    
    if ($LASTEXITCODE -eq 0 -and $AppUrl) {
        Write-ColorOutput "SUCCESS: Deployment successful!" $Green
        Write-ColorOutput "Application URL: https://$AppUrl" $Green
        Write-ColorOutput "Health Check: https://$AppUrl/api/health" $Blue
        Write-ColorOutput "Monitor logs: az container logs --resource-group $ResourceGroupName --name $ContainerGroupName" $Blue
    } else {
        throw "Deployment failed - no URL returned"
    }
}
catch {
    Write-ColorOutput "ERROR: Failed to deploy container: $($_.Exception.Message)" $Red
    
    # Show container events for debugging
    Write-ColorOutput "Checking container events..." $Yellow
    az container show --resource-group $ResourceGroupName --name $ContainerGroupName --query "containers[0].instanceView.events" --output table
    
    exit 1
}

# Cleanup build directory
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
    Write-ColorOutput "Cleaned up build directory" $Green
}

Write-ColorOutput "SUCCESS: Master Data Cleanse UI deployment completed successfully!" $Green
Write-ColorOutput "Access your application at: https://$AppUrl" $Blue

# Optional: Open browser (uncomment if desired)
# Start-Process "https://$AppUrl" 