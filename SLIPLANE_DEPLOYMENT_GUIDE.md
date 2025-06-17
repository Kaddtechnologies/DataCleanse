# Sliplane Deployment Guide

This guide explains how to deploy the MDM Master Data Cleanse application to Sliplane.

## Overview

The application has been optimized for Sliplane deployment with the following improvements:

1. **Removed hardcoded environment variables** from Dockerfile
2. **Improved database connection handling** with fallback configurations
3. **Enhanced error handling** for missing environment variables
4. **Optimized Docker build** with proper .dockerignore

## Required Environment Variables

### Set these in your Sliplane service settings:

#### Core Application Settings
```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
SKIP_DB_HEALTH_CHECK=false
```

#### Public Configuration (Client-side)
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-app-name.sliplane.app
NEXT_PUBLIC_APP_NAME=MDM Master Data Governance Platform
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_FEATURE_AI_RULES=true
NEXT_PUBLIC_FEATURE_ERP_INTEGRATION=true
NEXT_PUBLIC_FEATURE_DATA_QUALITY=true
```

#### Database Configuration (choose one approach)

**Option 1: Full DATABASE_URL (Recommended)**
```bash
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```

**Option 2: Individual Database Parameters**
```bash
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=mdm_dedup
DB_USER=mdm_user
DB_PASSWORD=your-secure-password
```

#### AI Provider Configuration (Optional)
```bash
AZURE_OPENAI_ENDPOINT=https://your-openai-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_API_VERSION=2025-01-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key
```

## Deployment Steps

### 1. Create a New Service in Sliplane

1. Log in to your Sliplane dashboard
2. Click "Create Service"
3. Choose "Deploy from GitHub" or "Deploy from Docker Hub"
4. Connect your repository

### 2. Configure Environment Variables

In your Sliplane service settings, add all the environment variables listed above. **Important**: Replace placeholder values with your actual configuration:

- Replace `your-app-name.sliplane.app` with your actual Sliplane domain
- Replace database credentials with your actual database connection details
- Add API keys for AI providers if you want to use AI features

### 3. Database Setup

You have several options for the database:

#### Option A: Sliplane Database Service
- Create a PostgreSQL service in Sliplane
- Use the connection details provided by Sliplane
- Set the `DATABASE_URL` environment variable

#### Option B: External Database
- Use an external PostgreSQL database (AWS RDS, Google Cloud SQL, etc.)
- Set the appropriate connection parameters

#### Option C: No Database (Limited Functionality)
- Set `SKIP_DB_HEALTH_CHECK=true`
- The app will start but database-dependent features will be unavailable

### 4. Deploy

1. Push your code to the connected repository
2. Sliplane will automatically build and deploy your application
3. The application will be available at `https://your-app-name.sliplane.app`

## Troubleshooting

### Database Connection Issues

If you see errors like `getaddrinfo EAI_AGAIN https`:

1. **Check DATABASE_URL format**: Must be valid PostgreSQL URL format
   ```
   postgresql://username:password@hostname:port/database
   ```

2. **Verify database accessibility**: Ensure your database accepts connections from Sliplane servers

3. **Use individual parameters**: If DATABASE_URL doesn't work, try individual DB_* variables

### API Call Failures

If you see `Failed to parse URL from /api/rules/active`:

1. **Check NEXT_PUBLIC_API_BASE_URL**: Should match your Sliplane domain
2. **Verify the URL format**: Must include `https://` protocol
3. **Check build logs**: Ensure all environment variables are set during build

### Missing Features

If AI features don't work:

1. **Verify AI API keys**: Ensure they're correctly set in environment variables
2. **Check feature flags**: Ensure `NEXT_PUBLIC_FEATURE_*` variables are set to `true`
3. **Review logs**: Check for API key validation errors

## Production Checklist

- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] Custom domain configured (optional)
- [ ] SSL certificate working
- [ ] Health check endpoints accessible (`/api/health` and `/api/health/db`)
- [ ] AI features tested (if enabled)
- [ ] File upload functionality tested
- [ ] Performance monitoring configured

## Monitoring and Logs

### Health Check Endpoints

- **App Health**: `https://your-app.sliplane.app/api/health`
- **Database Health**: `https://your-app.sliplane.app/api/health/db`

### Viewing Logs

In your Sliplane dashboard:
1. Go to your service
2. Click on "Logs" tab
3. Monitor for any errors or warnings

### Common Log Messages

- ✅ `Connected to PostgreSQL database` - Database connection successful
- ⚠️ `Database unavailable in production - continuing without database features` - App running without database
- ❌ `Database health check failed` - Database connection issue
- ✅ `Next.js started successfully` - Application started

## Support

If you encounter issues:

1. Check the logs in Sliplane dashboard
2. Verify all environment variables are set correctly
3. Test database connectivity separately
4. Review this guide for common issues

## Security Notes

- Never commit environment variables to git
- Use strong, unique passwords for database connections
- Regularly rotate API keys
- Enable SSL/HTTPS (automatic with Sliplane)
- Consider using Sliplane's built-in secrets management 