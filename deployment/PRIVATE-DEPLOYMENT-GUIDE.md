# Private Deployment Guide for Master Data Cleanse UI

This guide provides multiple options for deploying your Master Data Cleanse UI application to Azure with private network access only (accessible through your work VPN).

## 🚀 Deployment Options

### Option 1: Azure Container Apps with VPN Gateway (Recommended)
**Best for**: Modern containerized applications with full control over networking

**Script**: `deploy-private-container-app.ps1`
**Setup Time**: ~45 minutes (VPN Gateway takes 20-45 min)
**Cost**: $$$ (VPN Gateway is ~$25-50/month)
**Complexity**: Medium

```powershell
.\deploy-private-container-app.ps1
```

**Features**:
- Latest Azure Container Apps technology
- Built-in scaling and health monitoring
- Site-to-site VPN connection to your corporate network
- Custom domain with private DNS
- Full container orchestration

### Option 2: App Service with Private Endpoints
**Best for**: Simpler setup, existing App Service workflows

**Script**: `deploy-private-endpoint.ps1`
**Setup Time**: ~15 minutes
**Cost**: $$ (App Service P1V3 plan ~$75/month)
**Complexity**: Low

```powershell
.\deploy-private-endpoint.ps1
```

**Features**:
- Azure App Service reliability
- Private Link connectivity
- No VPN gateway required
- Jump box access for testing
- Easier to manage

### Option 3: Container Instances with VNet Integration
**Best for**: Simple containerized deployment without orchestration

**Script**: Available on request
**Setup Time**: ~30 minutes
**Cost**: $ (Pay per use)
**Complexity**: Low-Medium

## 📋 Prerequisites

Before deploying, you'll need:

1. **Azure CLI installed and logged in**
   ```powershell
   az login
   ```

2. **Corporate Network Information**:
   - Your corporate public IP address
   - Your internal network CIDR (e.g., `192.168.0.0/16`)
   - VPN pre-shared key (for VPN options)

3. **Network Administrator Access**:
   - Ability to configure corporate firewall/router
   - DNS configuration access (optional but recommended)

## 🎯 Quick Start - Recommended Approach

### Step 1: Deploy Private Container App
```powershell
cd deployment
.\deploy-private-container-app.ps1
```
**Time**: ~45 minutes (VPN Gateway provisioning)

### Step 2: Configure VPN Connection
```powershell
.\configure-vpn-connection.ps1 -YourPublicIP "YOUR_CORPORATE_IP" -YourNetworkCIDR "192.168.0.0/16" -SharedKey "YOUR_SECURE_KEY"
```
**Time**: ~5 minutes

### Step 3: Configure Corporate Network
Work with your network administrator to configure:

1. **Firewall Rules**:
   - Allow UDP 500 (IKE)
   - Allow UDP 4500 (IPSec)
   - Allow Protocol 50 (ESP)

2. **VPN Settings**:
   - Remote Gateway IP: (provided by script)
   - Local Network: Your CIDR
   - Remote Network: `10.1.0.0/16`
   - Pre-shared Key: (your key)

3. **DNS (Optional)**:
   - Add `mdm-ui.mdm.internal` pointing to private IP
   - Or add to local hosts file

## 🔍 Testing Access

### Option 1: From Corporate Network
Once VPN is configured:
```
https://mdm-ui.mdm.internal
```

### Option 2: Using Jump Box (Private Endpoint option)
```powershell
# Create Windows jump box in same VNet
az vm create --resource-group RG_DAI_S01 --name "mdm-jumpbox" --image "Win2022Datacenter" --vnet-name "mdm-private-vnet" --subnet "webapp-subnet" --admin-username "azureuser"

# Connect via RDP and access private endpoint
```

### Option 3: Azure Bastion (Secure browser-based access)
```powershell
# Deploy Azure Bastion for secure access
az network bastion create --resource-group RG_DAI_S01 --name "mdm-bastion" --vnet-name "mdm-private-vnet" --location westus2
```

## 🔧 Troubleshooting

### VPN Connection Issues
```powershell
# Check VPN status
az network vpn-connection show --name mdm-vpn-connection --resource-group RG_DAI_S01 --query 'connectionStatus'

# Check gateway status
az network vnet-gateway show --name mdm-vpn-gateway --resource-group RG_DAI_S01 --query 'provisioningState'
```

### DNS Resolution Issues
```powershell
# Test from jump box or corporate network
nslookup mdm-ui.mdm.internal

# Or add to hosts file temporarily
echo "10.1.2.4 mdm-ui.mdm.internal" >> C:\Windows\System32\drivers\etc\hosts
```

### Container Issues
```powershell
# Check container app logs
az containerapp logs show --name mdm-ui-private --resource-group RG_DAI_S01 --container mdm-ui

# Check container app status
az containerapp show --name mdm-ui-private --resource-group RG_DAI_S01 --query 'properties.provisioningState'
```

## 💰 Cost Comparison

| Option | Monthly Cost | Setup Time | Complexity |
|--------|-------------|------------|-----------|
| Container Apps + VPN | $75-100 | 45 min | Medium |
| App Service + Private Endpoint | $75-90 | 15 min | Low |
| Container Instances + VNet | $30-50 | 30 min | Low-Medium |

## 🔒 Security Features

All options include:
- ✅ No public internet access
- ✅ Private IP addresses only
- ✅ Azure network security groups
- ✅ Encrypted connections (HTTPS/TLS)
- ✅ Azure AD integration capability
- ✅ Network traffic logging

## 📞 Support

If you encounter issues:

1. **Check Azure Resource Status**: Ensure all resources are "Succeeded"
2. **Verify Network Configuration**: Double-check IP ranges and routing
3. **Test from Jump Box**: Use Azure Bastion or VM in same VNet
4. **Contact Network Admin**: Verify corporate firewall settings

## 🚀 Next Steps

After successful deployment:
1. Configure SSL certificates for custom domains
2. Set up Azure AD authentication
3. Configure backup and monitoring
4. Implement CI/CD pipelines for updates
5. Set up log analytics and alerting

Choose the option that best fits your organization's requirements and existing infrastructure! 