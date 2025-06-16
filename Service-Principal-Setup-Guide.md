# Service Principal Setup Guide for MDM Database Deployment

## Overview

Due to Microsoft's mandatory MFA requirements for user accounts, we need to create a **Service Principal** for automated deployment. This guide walks you through creating one via the Azure Portal.

## Why Service Principals?

According to [Microsoft's documentation](https://learn.microsoft.com/en-us/powershell/azure/authenticate-mfa?view=azps-14.1.0):
- **MFA is now mandatory** for all Microsoft Entra user identities
- **Service Principals bypass MFA** and are designed for automation
- **User accounts can no longer be used** for unattended automation scripts

## Step-by-Step Instructions

### Step 1: Create Service Principal in Azure Portal

1. **Open Azure Portal**: https://portal.azure.com
2. **Sign in** and complete MFA if prompted
3. **Navigate to Microsoft Entra ID**:
   - Search for "Microsoft Entra ID" in the top search bar
   - Click on "Microsoft Entra ID"

4. **Create App Registration**:
   - Click **App registrations** in the left sidebar
   - Click **New registration**
   - Fill in the details:
     - **Name**: `mdm-database-deployment-sp`
     - **Supported account types**: `Accounts in this organizational directory only`
     - **Redirect URI**: Leave blank
   - Click **Register**

5. **Copy Important Values**:
   From the app overview page, copy these values:
   - **Application (client) ID** ← This is your `AZURE_CLIENT_ID`d4aec173-3063-47e8-a303-96b139d19158

   - **Directory (tenant) ID** ← This is your `AZURE_TENANT_ID` 361cfe6c-e96a-4ef5-8363-cb16060a9a7f

### Step 2: Create Client Secret

1. **Go to Certificates & secrets**:
   - In your app registration, click **Certificates & secrets**
   - Click **New client secret**

2. **Create Secret**:
   - **Description**: `Database deployment automation`
   - **Expires**: `24 months` (recommended)
   - Click **Add**

3. **⚠️ CRITICAL**: Copy the **Value** immediately!
   - This is your `AZURE_CLIENT_SECRET`
   - **You can only see this once!** If you miss it, you'll need to create a new one.
Secret id - 5d30a85d-3b6b-421e-84c8-14d5c7ac2d31
value - uKz8Q~gZT3TMGIMPqCQo-Zxq438CV4z9E7-BoaLJ

### Step 3: Assign Permissions

1. **Navigate to Resource Group**:
   - Search for "Resource groups"
   - Click on **Resource groups**
   - Find and click **pottersailearning**

2. **Add Role Assignment**:
   - Click **Access control (IAM)** in the left sidebar
   - Click **Add** → **Add role assignment**

3. **Configure Role**:
   - **Role**: Select `Contributor`
   - Click **Next**

4. **Assign Access**:
   - **Assign access to**: `User, group, or service principal`
   - Click **Select members**
   - Search for: `mdm-database-deployment-sp`
   - Select it and click **Select**
   - Click **Review + assign**
   - Click **Review + assign** again

### Step 4: Set Environment Variables

Open PowerShell and run these commands with your actual values:

```powershell
$env:AZURE_CLIENT_ID='your-application-client-id-from-step-1'
$env:AZURE_CLIENT_SECRET='your-client-secret-from-step-2'
$env:AZURE_TENANT_ID='your-tenant-id-from-step-1'
$env:AZURE_SUBSCRIPTION_ID='be0d6ba7-6c56-4167-b3c2-74875b5f7a99'
```

### Step 5: Test Service Principal

Run the test script to verify everything works:

```powershell
./test-service-principal.ps1
```

If the test passes, you're ready to deploy!

### Step 6: Deploy Database

```powershell
./deploy-database-azure.ps1 -ResourceGroup "pottersailearning" -RegistryName "kaddacontainerregistry" -UseServicePrincipal
```

## Your Current Values

Based on the Azure CLI output, here are your known values:
- **Subscription ID**: `be0d6ba7-6c56-4167-b3c2-74875b5f7a99`
- **Tenant ID**: `361cfe6c-e96a-4ef5-8363-cb16060a9a7f`
- **Resource Group**: `pottersailearning`
- **Registry Name**: `kaddacontainerregistry`

You just need to get the **Application (Client) ID** and **Client Secret** from the Azure Portal.

## Troubleshooting

### Common Issues

1. **"Authentication failed"**:
   - Verify the Client Secret was copied correctly
   - Make sure you're using the Application (Client) ID, not Object ID

2. **"Access denied to resource group"**:
   - Ensure the Contributor role was assigned correctly
   - Wait 5-10 minutes for permissions to propagate

3. **"Cannot access Azure Container Registry"**:
   - The Contributor role should provide ACR access
   - If not, assign the "AcrPush" role specifically

### Additional Role Assignments (if needed)

If the test script shows ACR access issues, you may need to assign additional roles:

1. **For Container Registry**:
   - Go to your ACR resource: `kaddacontainerregistry`
   - Access control (IAM) → Add role assignment
   - Role: `AcrPush`
   - Assign to: `mdm-database-deployment-sp`

2. **For Storage (if using file shares)**:
   - Go to Resource Group: `pottersailearning`
   - Access control (IAM) → Add role assignment
   - Role: `Storage Account Contributor`
   - Assign to: `mdm-database-deployment-sp`

## Security Best Practices

- **Store secrets securely**: Don't commit client secrets to version control
- **Use minimum permissions**: The Contributor role is scoped only to your resource group
- **Set expiration**: Client secrets expire in 2 years - set a reminder to rotate
- **Monitor usage**: Regularly review service principal activity in Azure logs

## What This Solves

✅ **Bypasses MFA requirements** for automation  
✅ **Enables unattended deployment** without user interaction  
✅ **Follows Microsoft's recommended approach** for automation  
✅ **Provides secure, auditable authentication** for scripts  

Once set up, your deployment scripts will work reliably without MFA challenges! 