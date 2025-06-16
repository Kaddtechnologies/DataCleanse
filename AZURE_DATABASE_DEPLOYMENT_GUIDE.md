# Azure Database Deployment Guide

This guide explains how to deploy your PostgreSQL database to Azure Container Apps and configure your application to use it.

## Overview

The deployment consists of two main scripts:
1. `deploy-database-azure.ps1` - Deploys PostgreSQL and Redis to Azure Container Apps
2. `update-app-for-azure-db.ps1` - Updates your application configuration to use the Azure database

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Docker installed and running
- Azure Container Registry created
- Resource Group created
- PowerShell 7+ (for cross-platform compatibility)

## Step 1: Deploy Database to Azure

Run the database deployment script:

```powershell
./deploy-database-azure.ps1 -ResourceGroup "your-resource-group" -RegistryName "your-container-registry"
```

### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ResourceGroup` | Azure Resource Group name | Required |
| `RegistryName` | Azure Container Registry name | "containerregistry" |
| `ContainerAppName` | PostgreSQL container app name | "mdm-postgres" |
| `Location` | Azure region | "centralus" |
| `DbName` | Database name | "mdm_dedup" |
| `DbUser` | Database username | "mdm_user" |
| `DbPassword` | Database password | "mdm_password123" |
| `DbPort` | Database port | "5433" |
| `RedisContainerAppName` | Redis container app name | "mdm-redis" |
| `DeployRedis` | Deploy Redis cache | `$true` |
| `CreateFileShare` | Create persistent storage | `$true` |

### Example with custom parameters:

```powershell
./deploy-database-azure.ps1 `
  -ResourceGroup "mdm-production" `
  -RegistryName "mdmregistry" `
  -ContainerAppName "mdm-postgres-prod" `
  -Location "eastus" `
  -DbPassword "YourSecurePassword123!" `
  -DeployRedis:$false
```

## Step 2: Update Application Configuration

After the database is deployed, update your application configuration:

```powershell
./update-app-for-azure-db.ps1 `
  -PostgresFqdn "mdm-postgres.internal.domain.com" `
  -RedisFqdn "mdm-redis.internal.domain.com" `
  -ResourceGroup "your-resource-group" `
  -AppContainerName "datacleansing"
```

### Parameters

| Parameter | Description | Required |
|-----------|-------------|----------|
| `PostgresFqdn` | PostgreSQL FQDN from deployment output | Yes |
| `RedisFqdn` | Redis FQDN (if deployed) | No |
| `DbName` | Database name | No (uses default) |
| `DbUser` | Database username | No (uses default) |
| `DbPassword` | Database password | No (uses default) |
| `DbPort` | Database port | No (uses default) |
| `AppContainerName` | Your app's container name | No |
| `ResourceGroup` | Resource group name | No |

## What the Scripts Do

### deploy-database-azure.ps1

1. **Validates Prerequisites**: Checks Azure CLI and Docker installation
2. **Creates Docker Images**: Builds PostgreSQL and Redis images with your configuration
3. **Pushes to Registry**: Uploads images to Azure Container Registry
4. **Creates Storage**: Sets up Azure File Shares for persistent data (optional)
5. **Deploys Container Apps**: Creates PostgreSQL and Redis container apps
6. **Configures Networking**: Sets up internal networking between services
7. **Outputs Connection Info**: Provides connection strings and FQDNs

### update-app-for-azure-db.ps1

1. **Creates Environment Files**: Generates `.env.production` with Azure database settings
2. **Updates Existing Files**: Modifies `.env` and `.env.local` files
3. **Creates Override File**: Generates `docker-compose.override.yml` for local testing
4. **Updates Container App**: Modifies your app's environment variables (if specified)
5. **Creates Test Script**: Generates connection test script
6. **Provides Instructions**: Shows next steps and connection details

## Files Created/Modified

After running both scripts, you'll have:

- `.env.production` - Production environment variables
- `docker-compose.override.yml` - Local development override
- `test-azure-db-connection.js` - Database connection test
- Updated `.env` and `.env.local` files
- Backup files (`.env.backup.TIMESTAMP`)

## Testing the Deployment

### 1. Test Database Connection

```bash
node test-azure-db-connection.js
```

### 2. Test Local Development

```bash
# This will use Azure database instead of local
docker-compose up -d
npm run dev
```

### 3. Test Production Deployment

Deploy your application using your existing deployment script. The environment variables will now point to Azure database.

## Important Notes

### Security Considerations

- **Change Default Passwords**: Use strong, unique passwords in production
- **Network Security**: Container apps use internal networking by default
- **Secrets Management**: Consider using Azure Key Vault for sensitive data
- **SSL/TLS**: Enable SSL for production databases

### Storage and Persistence

- **File Shares**: Azure File Shares provide persistent storage
- **Backups**: Set up automated backups for production data
- **Scaling**: Database containers are set to min/max 1 replica for data consistency

### Cost Optimization

- **Resource Sizing**: Adjust CPU/memory based on your needs
- **Storage Tiers**: Use appropriate storage tiers for your data
- **Auto-scaling**: Redis can scale, but database should remain single instance

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Ensure container apps are in the same environment
   - Check internal networking configuration

2. **Authentication Failures**
   - Verify database credentials
   - Check environment variable configuration

3. **Storage Issues**
   - Ensure file shares are properly mounted
   - Check storage account permissions

4. **Build Failures**
   - Verify Docker is running
   - Check Azure Container Registry permissions

### Debugging Commands

```powershell
# Check container app status
az containerapp show --name mdm-postgres --resource-group your-rg

# View container logs
az containerapp logs show --name mdm-postgres --resource-group your-rg

# Test connectivity
az containerapp exec --name mdm-postgres --resource-group your-rg --command "pg_isready -U mdm_user"
```

## Production Recommendations

### For Production Use

1. **Use Azure Database for PostgreSQL**: Consider managed PostgreSQL service for production
2. **Implement Monitoring**: Set up Azure Monitor and alerts
3. **Configure Backups**: Implement automated backup strategies
4. **Security Hardening**: Use managed identities and Key Vault
5. **Performance Tuning**: Optimize database configuration for your workload

### Migration Path

If you want to migrate to Azure Database for PostgreSQL later:

1. Export data from container database
2. Create Azure Database for PostgreSQL
3. Import data to managed service
4. Update connection strings
5. Remove container database

## Support

For issues with:
- **Azure CLI**: Check Azure documentation
- **Container Apps**: Review Azure Container Apps documentation
- **Database Issues**: Check PostgreSQL logs and configuration
- **Application Issues**: Verify environment variables and connection strings

## Example Complete Deployment

```powershell
# 1. Deploy database
./deploy-database-azure.ps1 `
  -ResourceGroup "mdm-prod" `
  -RegistryName "mdmregistry" `
  -Location "eastus"

# 2. Note the output FQDNs, then update app config
./update-app-for-azure-db.ps1 `
  -PostgresFqdn "mdm-postgres.internal.eastus.azurecontainerapps.io" `
  -RedisFqdn "mdm-redis.internal.eastus.azurecontainerapps.io" `
  -ResourceGroup "mdm-prod" `
  -AppContainerName "datacleansing"

# 3. Test connection
node test-azure-db-connection.js

# 4. Deploy your application (it will now use Azure database)
./deploy-to-azure.ps1 -ResourceGroup "mdm-prod"
```

This completes the Azure database deployment process. Your application will now use the cloud-hosted PostgreSQL database instead of localhost.
