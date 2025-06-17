# Google Cloud deployment script for MDM Master Data Cleanse (PowerShell)
# This script will deploy the application to Google Cloud Run and set up Cloud SQL

param(
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [string]$Region = $env:GOOGLE_CLOUD_REGION ?? "us-central1",
    [string]$ServiceName = "mdm-master-data-cleanse",
    [string]$SqlInstanceName = "mdm-postgres-instance",
    [string]$DatabaseName = "mdm_dedup",
    [string]$DatabaseUser = "mdm_user"
)

# Color functions for output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if required tools are installed
function Test-Dependencies {
    Write-Status "Checking dependencies..."
    
    if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    }
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed. Please install Docker Desktop."
        exit 1
    }
    
    Write-Success "All dependencies are installed."
}

# Check if user is authenticated
function Test-Authentication {
    Write-Status "Checking Google Cloud authentication..."
    
    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if ([string]::IsNullOrEmpty($activeAccount)) {
        Write-Error "You are not authenticated with Google Cloud. Please run 'gcloud auth login'"
        exit 1
    }
    
    Write-Success "Authentication verified."
}

# Validate project ID
function Initialize-Project {
    if ([string]::IsNullOrEmpty($ProjectId)) {
        Write-Error "GOOGLE_CLOUD_PROJECT environment variable is not set."
        Write-Status "Please set it with: `$env:GOOGLE_CLOUD_PROJECT='your-project-id'"
        exit 1
    }
    
    Write-Status "Using project: $ProjectId"
    Write-Status "Using region: $Region"
    
    # Set the project
    gcloud config set project $ProjectId
}

# Enable required APIs
function Enable-APIs {
    Write-Status "Enabling required Google Cloud APIs..."
    
    $apis = @(
        "cloudbuild.googleapis.com",
        "run.googleapis.com",
        "sql-component.googleapis.com",
        "sqladmin.googleapis.com",
        "compute.googleapis.com",
        "artifactregistry.googleapis.com",
        "secretmanager.googleapis.com"
    )
    
    foreach ($api in $apis) {
        gcloud services enable $api
    }
    
    Write-Success "Required APIs enabled."
}

# Create Artifact Registry repository
function New-ArtifactRegistry {
    Write-Status "Creating Artifact Registry repository..."
    
    $repoExists = gcloud artifacts repositories describe mdm-repo --location=$Region 2>$null
    if ($LASTEXITCODE -ne 0) {
        gcloud artifacts repositories create mdm-repo `
            --repository-format=docker `
            --location=$Region `
            --description="MDM Master Data Cleanse repository"
        Write-Success "Artifact Registry repository created."
    } else {
        Write-Warning "Artifact Registry repository already exists."
    }
}

# Create Cloud SQL instance
function New-CloudSQL {
    Write-Status "Setting up Cloud SQL PostgreSQL instance..."
    
    $instanceExists = gcloud sql instances describe $SqlInstanceName 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Creating Cloud SQL instance (this may take 5-10 minutes)..."
        
        gcloud sql instances create $SqlInstanceName `
            --database-version=POSTGRES_15 `
            --tier=db-f1-micro `
            --region=$Region `
            --storage-type=SSD `
            --storage-size=10GB `
            --storage-auto-increase
        
        Write-Success "Cloud SQL instance created."
    } else {
        Write-Warning "Cloud SQL instance already exists."
    }
    
    # Create database
    Write-Status "Creating database..."
    $databaseExists = gcloud sql databases describe $DatabaseName --instance=$SqlInstanceName 2>$null
    if ($LASTEXITCODE -ne 0) {
        gcloud sql databases create $DatabaseName --instance=$SqlInstanceName
        Write-Success "Database created."
    } else {
        Write-Warning "Database already exists."
    }
    
    # Generate random password
    $DatabasePassword = [System.Web.Security.Membership]::GeneratePassword(32, 8)
    Write-Status "Creating database user..."
    
    $userExists = gcloud sql users describe $DatabaseUser --instance=$SqlInstanceName 2>$null
    if ($LASTEXITCODE -ne 0) {
        gcloud sql users create $DatabaseUser `
            --instance=$SqlInstanceName `
            --password=$DatabasePassword
        Write-Success "Database user created."
    } else {
        Write-Warning "Database user already exists. Updating password..."
        gcloud sql users set-password $DatabaseUser `
            --instance=$SqlInstanceName `
            --password=$DatabasePassword
    }
    
    # Store database password in Secret Manager
    Write-Status "Storing database password in Secret Manager..."
    $DatabasePassword | gcloud secrets create database-password --data-file=- 2>$null
    if ($LASTEXITCODE -ne 0) {
        $DatabasePassword | gcloud secrets versions add database-password --data-file=-
    }
    
    Write-Success "Database password stored in Secret Manager."
    return $DatabasePassword
}

# Build and push Docker image
function Build-AndPushImage {
    Write-Status "Building and pushing Docker image..."
    
    $ImageUri = "$Region-docker.pkg.dev/$ProjectId/mdm-repo/$ServiceName`:latest"
    
    # Configure Docker to use gcloud as a credential helper
    gcloud auth configure-docker "$Region-docker.pkg.dev"
    
    # Build the image
    Write-Status "Building Docker image..."
    docker build -t $ImageUri .
    
    # Push the image
    Write-Status "Pushing Docker image to Artifact Registry..."
    docker push $ImageUri
    
    Write-Success "Docker image built and pushed: $ImageUri"
    "IMAGE_URI=$ImageUri" | Out-File -FilePath ".env.deploy" -Encoding UTF8
    
    return $ImageUri
}

# Deploy to Cloud Run
function Deploy-CloudRun {
    param([string]$ImageUri, [string]$DatabasePassword)
    
    Write-Status "Deploying to Cloud Run..."
    
    $ConnectionName = "$ProjectId`:$Region`:$SqlInstanceName"
    $DatabaseUrl = "postgresql://$DatabaseUser`:$DatabasePassword@localhost/$DatabaseName`?host=/cloudsql/$ConnectionName"
    
    gcloud run deploy $ServiceName `
        --image=$ImageUri `
        --platform=managed `
        --region=$Region `
        --allow-unauthenticated `
        --port=3000 `
        --memory=1Gi `
        --cpu=1 `
        --min-instances=0 `
        --max-instances=10 `
        --set-env-vars="NODE_ENV=production" `
        --set-env-vars="DATABASE_URL=$DatabaseUrl" `
        --set-env-vars="NEXT_PUBLIC_API_BASE_URL=https://$ServiceName-$ProjectId.run.app" `
        --set-env-vars="NEXT_PUBLIC_FEATURE_AI_RULES=true" `
        --set-env-vars="NEXT_PUBLIC_FEATURE_ERP_INTEGRATION=true" `
        --set-env-vars="NEXT_PUBLIC_FEATURE_DATA_QUALITY=true" `
        --add-cloudsql-instances=$ConnectionName `
        --timeout=300
    
    # Get the service URL
    $ServiceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"
    
    Write-Success "Application deployed successfully!"
    Write-Success "Service URL: $ServiceUrl"
    
    "SERVICE_URL=$ServiceUrl" | Add-Content -Path ".env.deploy"
    return $ServiceUrl
}

# Create secrets for API keys
function New-Secrets {
    Write-Status "Setting up Secret Manager for API keys..."
    
    $apiKeys = @{
        "azure-openai-api-key" = $env:AZURE_OPENAI_API_KEY
        "openai-api-key" = $env:OPENAI_API_KEY
        "anthropic-api-key" = $env:ANTHROPIC_API_KEY
    }
    
    foreach ($key in $apiKeys.Keys) {
        if (![string]::IsNullOrEmpty($apiKeys[$key])) {
            $apiKeys[$key] | gcloud secrets create $key --data-file=- 2>$null
            if ($LASTEXITCODE -ne 0) {
                $apiKeys[$key] | gcloud secrets versions add $key --data-file=-
            }
        }
    }
    
    Write-Success "API keys stored in Secret Manager."
}

# Main deployment function
function Start-Deployment {
    Write-Status "Starting Google Cloud deployment for MDM Master Data Cleanse..."
    
    try {
        Test-Dependencies
        Test-Authentication
        Initialize-Project
        Enable-APIs
        New-ArtifactRegistry
        $DatabasePassword = New-CloudSQL
        New-Secrets
        $ImageUri = Build-AndPushImage
        $ServiceUrl = Deploy-CloudRun -ImageUri $ImageUri -DatabasePassword $DatabasePassword
        
        Write-Success "Deployment completed successfully!"
        Write-Status "Next steps:"
        Write-Host "1. Update your local environment to point to the cloud database"
        Write-Host "2. Run database migrations if needed"
        Write-Host "3. Configure your domain name if required"
        Write-Host "4. Set up monitoring and logging"
        
        if (Test-Path ".env.deploy") {
            Write-Status "Deployment details saved to .env.deploy"
            Get-Content ".env.deploy"
        }
    }
    catch {
        Write-Error "Deployment failed: $_"
        exit 1
    }
}

# Add System.Web assembly for password generation
Add-Type -AssemblyName System.Web

# Run main function
Start-Deployment 