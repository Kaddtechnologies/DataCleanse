#!/bin/bash

# Google Cloud deployment script for MDM Master Data Cleanse
# This script will deploy the application to Google Cloud Run and set up Cloud SQL

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
REGION="${GOOGLE_CLOUD_REGION:-us-central1}"
SERVICE_NAME="mdm-master-data-cleanse"
SQL_INSTANCE_NAME="mdm-postgres-instance"
DATABASE_NAME="mdm_dedup"
DATABASE_USER="mdm_user"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker."
        exit 1
    fi
    
    print_success "All dependencies are installed."
}

# Check if user is authenticated
check_auth() {
    print_status "Checking Google Cloud authentication..."
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "You are not authenticated with Google Cloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    print_success "Authentication verified."
}

# Validate project ID
validate_project() {
    if [ -z "$PROJECT_ID" ]; then
        print_error "GOOGLE_CLOUD_PROJECT environment variable is not set."
        print_status "Please set it with: export GOOGLE_CLOUD_PROJECT=your-project-id"
        exit 1
    fi
    
    print_status "Using project: $PROJECT_ID"
    print_status "Using region: $REGION"
    
    # Set the project
    gcloud config set project "$PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    print_status "Enabling required Google Cloud APIs..."
    
    gcloud services enable \
        cloudbuild.googleapis.com \
        run.googleapis.com \
        sql-component.googleapis.com \
        sqladmin.googleapis.com \
        compute.googleapis.com \
        artifactregistry.googleapis.com \
        secretmanager.googleapis.com
    
    print_success "Required APIs enabled."
}

# Create Artifact Registry repository
create_artifact_registry() {
    print_status "Creating Artifact Registry repository..."
    
    if ! gcloud artifacts repositories describe mdm-repo --location=$REGION &>/dev/null; then
        gcloud artifacts repositories create mdm-repo \
            --repository-format=docker \
            --location=$REGION \
            --description="MDM Master Data Cleanse repository"
        print_success "Artifact Registry repository created."
    else
        print_warning "Artifact Registry repository already exists."
    fi
}

# Create Cloud SQL instance
create_cloud_sql() {
    print_status "Setting up Cloud SQL PostgreSQL instance..."
    
    if ! gcloud sql instances describe "$SQL_INSTANCE_NAME" &>/dev/null; then
        print_status "Creating Cloud SQL instance (this may take 5-10 minutes)..."
        
        gcloud sql instances create "$SQL_INSTANCE_NAME" \
            --database-version=POSTGRES_15 \
            --tier=db-f1-micro \
            --region=$REGION \
            --storage-type=SSD \
            --storage-size=10GB \
            --storage-auto-increase
        
        print_success "Cloud SQL instance created."
    else
        print_warning "Cloud SQL instance already exists."
    fi
    
    # Create database
    print_status "Creating database..."
    if ! gcloud sql databases describe "$DATABASE_NAME" --instance="$SQL_INSTANCE_NAME" &>/dev/null; then
        gcloud sql databases create "$DATABASE_NAME" --instance="$SQL_INSTANCE_NAME"
        print_success "Database created."
    else
        print_warning "Database already exists."
    fi
    
    # Create user (generate random password)
    DATABASE_PASSWORD=$(openssl rand -base64 32)
    print_status "Creating database user..."
    
    if ! gcloud sql users describe "$DATABASE_USER" --instance="$SQL_INSTANCE_NAME" &>/dev/null; then
        gcloud sql users create "$DATABASE_USER" \
            --instance="$SQL_INSTANCE_NAME" \
            --password="$DATABASE_PASSWORD"
        print_success "Database user created."
    else
        print_warning "Database user already exists. Updating password..."
        gcloud sql users set-password "$DATABASE_USER" \
            --instance="$SQL_INSTANCE_NAME" \
            --password="$DATABASE_PASSWORD"
    fi
    
    # Store database password in Secret Manager
    print_status "Storing database password in Secret Manager..."
    echo -n "$DATABASE_PASSWORD" | gcloud secrets create database-password --data-file=- || \
    echo -n "$DATABASE_PASSWORD" | gcloud secrets versions add database-password --data-file=-
    
    print_success "Database password stored in Secret Manager."
}

# Build and push Docker image
build_and_push_image() {
    print_status "Building and pushing Docker image..."
    
    IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/mdm-repo/$SERVICE_NAME:latest"
    
    # Configure Docker to use gcloud as a credential helper
    gcloud auth configure-docker "$REGION-docker.pkg.dev"
    
    # Build the image
    print_status "Building Docker image..."
    docker build -t "$IMAGE_URI" .
    
    # Push the image
    print_status "Pushing Docker image to Artifact Registry..."
    docker push "$IMAGE_URI"
    
    print_success "Docker image built and pushed: $IMAGE_URI"
    echo "IMAGE_URI=$IMAGE_URI" > .env.deploy
}

# Deploy to Cloud Run
deploy_cloud_run() {
    print_status "Deploying to Cloud Run..."
    
    IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/mdm-repo/$SERVICE_NAME:latest"
    CONNECTION_NAME="$PROJECT_ID:$REGION:$SQL_INSTANCE_NAME"
    
    # Get database password from Secret Manager
    DATABASE_PASSWORD=$(gcloud secrets versions access latest --secret="database-password")
    
    # Construct database URL for Cloud SQL
    DATABASE_URL="postgresql://$DATABASE_USER:$DATABASE_PASSWORD@localhost/$DATABASE_NAME?host=/cloudsql/$CONNECTION_NAME"
    
    gcloud run deploy "$SERVICE_NAME" \
        --image="$IMAGE_URI" \
        --platform=managed \
        --region="$REGION" \
        --allow-unauthenticated \
        --port=3000 \
        --memory=1Gi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=10 \
        --set-env-vars="NODE_ENV=production" \
        --set-env-vars="DATABASE_URL=$DATABASE_URL" \
        --set-env-vars="NEXT_PUBLIC_API_BASE_URL=https://$SERVICE_NAME-$PROJECT_ID.run.app" \
        --set-env-vars="NEXT_PUBLIC_FEATURE_AI_RULES=true" \
        --set-env-vars="NEXT_PUBLIC_FEATURE_ERP_INTEGRATION=true" \
        --set-env-vars="NEXT_PUBLIC_FEATURE_DATA_QUALITY=true" \
        --add-cloudsql-instances="$CONNECTION_NAME" \
        --timeout=300
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")
    
    print_success "Application deployed successfully!"
    print_success "Service URL: $SERVICE_URL"
    
    echo "SERVICE_URL=$SERVICE_URL" >> .env.deploy
}

# Create secrets for API keys
create_secrets() {
    print_status "Setting up Secret Manager for API keys..."
    
    if [ ! -z "$AZURE_OPENAI_API_KEY" ]; then
        echo -n "$AZURE_OPENAI_API_KEY" | gcloud secrets create azure-openai-api-key --data-file=- || \
        echo -n "$AZURE_OPENAI_API_KEY" | gcloud secrets versions add azure-openai-api-key --data-file=-
    fi
    
    if [ ! -z "$OPENAI_API_KEY" ]; then
        echo -n "$OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=- || \
        echo -n "$OPENAI_API_KEY" | gcloud secrets versions add openai-api-key --data-file=-
    fi
    
    if [ ! -z "$ANTHROPIC_API_KEY" ]; then
        echo -n "$ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key --data-file=- || \
        echo -n "$ANTHROPIC_API_KEY" | gcloud secrets versions add anthropic-api-key --data-file=-
    fi
    
    print_success "API keys stored in Secret Manager."
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # This would typically run your database initialization script
    # For now, we'll create the basic schema
    print_warning "Database migrations need to be run manually."
    print_status "Connect to your Cloud SQL instance and run the SQL scripts in the scripts/ directory."
}

# Main deployment function
main() {
    print_status "Starting Google Cloud deployment for MDM Master Data Cleanse..."
    
    check_dependencies
    check_auth
    validate_project
    enable_apis
    create_artifact_registry
    create_cloud_sql
    create_secrets
    build_and_push_image
    deploy_cloud_run
    run_migrations
    
    print_success "Deployment completed successfully!"
    print_status "Next steps:"
    echo "1. Update your local environment to point to the cloud database"
    echo "2. Run database migrations if needed"
    echo "3. Configure your domain name if required"
    echo "4. Set up monitoring and logging"
    
    if [ -f .env.deploy ]; then
        print_status "Deployment details saved to .env.deploy"
        cat .env.deploy
    fi
}

# Run main function
main "$@" 