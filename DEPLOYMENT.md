# Google Cloud Deployment Guide

This guide will help you deploy your MDM Master Data Cleanse application to Google Cloud Platform using Cloud Run and Cloud SQL.

## Prerequisites

### Required Tools
1. **Google Cloud SDK (gcloud)** - [Install Guide](https://cloud.google.com/sdk/docs/install)
2. **Docker Desktop** - [Install Guide](https://docs.docker.com/get-docker/)
3. **Google Cloud Project** with billing enabled

### Required Environment Variables
Set these environment variables before deployment:

```bash
# Required
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"  # Optional, defaults to us-central1

# Optional API Keys (for AI features)
export AZURE_OPENAI_API_KEY="your-azure-openai-key"
export AZURE_OPENAI_ENDPOINT="your-azure-openai-endpoint"
export AZURE_OPENAI_DEPLOYMENT_NAME="your-deployment-name"
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export GOOGLE_API_KEY="your-google-key"
```

For PowerShell (Windows):
```powershell
$env:GOOGLE_CLOUD_PROJECT="your-project-id"
$env:GOOGLE_CLOUD_REGION="us-central1"
# Add other environment variables as needed
```

## Quick Start

### Option 1: Automated Deployment (Recommended)

**For Linux/macOS:**
```bash
# Make the script executable
chmod +x deploy-to-gcloud.sh

# Run the deployment
./deploy-to-gcloud.sh
```

**For Windows (PowerShell):**
```powershell
# Run the deployment script
.\deploy-to-gcloud.ps1
```

### Option 2: Manual Deployment

If you prefer to run commands manually, follow these steps:

#### 1. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 2. Enable Required APIs
```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sql-component.googleapis.com \
    sqladmin.googleapis.com \
    compute.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com
```

#### 3. Create Artifact Registry Repository
```bash
gcloud artifacts repositories create mdm-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="MDM Master Data Cleanse repository"
```

#### 4. Create Cloud SQL Instance
```bash
# Create PostgreSQL instance
gcloud sql instances create mdm-postgres-instance \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase

# Create database
gcloud sql databases create mdm_dedup --instance=mdm-postgres-instance

# Create user (replace PASSWORD with a secure password)
gcloud sql users create mdm_user \
    --instance=mdm-postgres-instance \
    --password=YOUR_SECURE_PASSWORD
```

#### 5. Build and Push Docker Image
```bash
# Configure Docker
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build image
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mdm-repo/mdm-master-data-cleanse:latest .

# Push image
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mdm-repo/mdm-master-data-cleanse:latest
```

#### 6. Deploy to Cloud Run
```bash
gcloud run deploy mdm-master-data-cleanse \
    --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mdm-repo/mdm-master-data-cleanse:latest \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --port=3000 \
    --memory=1Gi \
    --cpu=1 \
    --set-env-vars="NODE_ENV=production,DATABASE_URL=postgresql://mdm_user:PASSWORD@localhost/mdm_dedup?host=/cloudsql/YOUR_PROJECT_ID:us-central1:mdm-postgres-instance" \
    --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:mdm-postgres-instance
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloud Run     │    │   Cloud SQL     │    │ Secret Manager  │
│   (Next.js App) │◄──►│   (PostgreSQL)  │    │   (API Keys)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌─────────────────┐
│ Artifact        │    │   Cloud Build   │
│ Registry        │    │   (CI/CD)       │
└─────────────────┘    └─────────────────┘
```

## Services Created

The deployment creates the following Google Cloud resources:

1. **Cloud Run Service**: Hosts your Next.js application
2. **Cloud SQL Instance**: PostgreSQL database with pgvector extension
3. **Artifact Registry**: Stores your Docker images
4. **Secret Manager**: Stores sensitive configuration (API keys, passwords)
5. **Cloud Build** (optional): For automated deployments

## Configuration

### Environment Variables

The application uses the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Node.js environment (production) | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | No |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | No |
| `OPENAI_API_KEY` | OpenAI API key | No |
| `ANTHROPIC_API_KEY` | Anthropic API key | No |
| `GOOGLE_API_KEY` | Google API key | No |

### Database Configuration

The application automatically detects Cloud SQL and configures the connection appropriately:

- **Local Development**: Uses individual connection parameters
- **Production**: Uses `DATABASE_URL` with Cloud SQL proxy

## Post-Deployment Steps

### 1. Initialize Database Schema

Connect to your Cloud SQL instance and run the initialization scripts:

```bash
# Connect to Cloud SQL
gcloud sql connect mdm-postgres-instance --user=mdm_user --database=mdm_dedup

# Run initialization scripts (in psql)
\i scripts/init-db.sql
```

### 2. Update Local Configuration

To point your local development environment to the cloud database:

1. Get the database connection details from the deployment output
2. Update your local `.env.local` file:

```env
DATABASE_URL="postgresql://mdm_user:PASSWORD@localhost/mdm_dedup?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
```

### 3. Configure Custom Domain (Optional)

If you want to use a custom domain:

```bash
# Map domain to Cloud Run service
gcloud run domain-mappings create --service=mdm-master-data-cleanse --domain=your-domain.com --region=us-central1
```

### 4. Set up Monitoring

Enable monitoring and logging:

```bash
# Enable Cloud Monitoring
gcloud services enable monitoring.googleapis.com

# Set up log-based metrics
gcloud logging metrics create app_errors \
    --description="Application errors" \
    --log-filter="resource.type=cloud_run_revision AND severity>=ERROR"
```

## Scaling and Performance

### Automatic Scaling
Cloud Run automatically scales based on incoming requests:
- **Min instances**: 0 (scales to zero when no traffic)
- **Max instances**: 10 (configurable)
- **Memory**: 1GB (configurable)
- **CPU**: 1 vCPU (configurable)

### Database Scaling
Cloud SQL automatically manages:
- **Storage**: Auto-increases when needed
- **Connections**: Pool managed by the application
- **Backups**: Automatic daily backups

## Cost Optimization

### Cloud Run
- Uses pay-per-request pricing
- Scales to zero when idle
- 2 million requests free per month

### Cloud SQL
- db-f1-micro tier for development (upgradable)
- 10GB storage with auto-increase
- Consider larger tiers for production

### Storage
- Artifact Registry: Free tier available
- Secret Manager: Free tier for basic usage

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log BUILD_ID
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   gcloud sql connect mdm-postgres-instance --user=mdm_user
   ```

3. **Application Errors**
   ```bash
   # View application logs
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mdm-master-data-cleanse" --limit=50
   ```

### Debug Commands

```bash
# Check service status
gcloud run services describe mdm-master-data-cleanse --region=us-central1

# View recent logs
gcloud logs tail cloud-run-service

# Test database connection
gcloud sql instances describe mdm-postgres-instance
```

## Security Best Practices

1. **API Keys**: Store in Secret Manager, never in code
2. **Database**: Use IAM authentication when possible
3. **Network**: Configure VPC if needed for additional security
4. **SSL**: Enforced by default on Cloud Run
5. **Authentication**: Configure IAM for sensitive endpoints

## Cleanup

To remove all created resources:

```bash
# Delete Cloud Run service
gcloud run services delete mdm-master-data-cleanse --region=us-central1

# Delete Cloud SQL instance
gcloud sql instances delete mdm-postgres-instance

# Delete Artifact Registry repository
gcloud artifacts repositories delete mdm-repo --location=us-central1

# Delete secrets
gcloud secrets delete database-password
gcloud secrets delete azure-openai-api-key
# ... delete other secrets as needed
```

## Support

For issues related to:
- **Google Cloud**: [Cloud Support](https://cloud.google.com/support)
- **Application**: Check the application logs and GitHub issues
- **Database**: Use Cloud SQL documentation and support 