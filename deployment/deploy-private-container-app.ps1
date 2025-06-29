# Deploy Master Data Cleanse UI to Private Azure Container Apps
# Accessible only through corporate VPN

param(
    [string]$SubscriptionId = "f91c0687-6c71-4a3b-ab6c-6bb9b65b42c8",
    [string]$ResourceGroupName = "RG_DAI_S01",
    [string]$Location = "westus2",
    [string]$RegistryName = "mdmcleansecr",
    [string]$ImageName = "mdm-master-data-cleanse-ui",
    [string]$ImageTag = "latest",
    [string]$VNetName = "mdm-private-vnet",
    [string]$SubnetName = "container-apps-subnet",
    [string]$ContainerAppEnvName = "mdm-private-env",
    [string]$ContainerAppName = "mdm-ui-private",
    [string]$VpnGatewayName = "mdm-vpn-gateway",
    
    # VPN Configuration - You'll need to provide these
    [string]$YourPublicIP = "",  # Your corporate public IP
    [string]$YourNetworkCIDR = "",  # Your corporate network CIDR (e.g., "10.0.0.0/16")
    [string]$SharedKey = ""  # Pre-shared key for VPN
)

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$NC = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $NC)
    Write-Host "${Color}${Message}${NC}"
}

function Test-AzureLogin {
    try {
        $context = az account show --query "name" -o tsv 2>$null
        if ($context) {
            Write-ColorOutput "Logged in to Azure: $context" $Green
            return $true
        }
    }
    catch {
        Write-ColorOutput "Not logged in to Azure" $Red
        return $false
    }
    return $false
}

# Main deployment function
function Deploy-PrivateContainerApp {
    Write-ColorOutput "Starting Private Container App Deployment..." $Blue
    Write-ColorOutput "=================================" $Blue

    # Check Azure login
    if (-not (Test-AzureLogin)) {
        Write-ColorOutput "Please login to Azure first: az login" $Red
        exit 1
    }

    # Set subscription
    Write-ColorOutput "Setting subscription to $SubscriptionId..." $Yellow
    az account set --subscription $SubscriptionId
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Failed to set subscription" $Red
        exit 1
    }

    # Create Virtual Network
    Write-ColorOutput "Creating Virtual Network..." $Yellow
    az network vnet create `
        --resource-group $ResourceGroupName `
        --name $VNetName `
        --address-prefix "10.1.0.0/16" `
        --subnet-name $SubnetName `
        --subnet-prefix "10.1.1.0/24" `
        --location $Location

    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Failed to create Virtual Network" $Red
        exit 1
    }

    # Create Gateway Subnet for VPN
    Write-ColorOutput "Creating Gateway Subnet..." $Yellow
    az network vnet subnet create `
        --resource-group $ResourceGroupName `
        --vnet-name $VNetName `
        --name "GatewaySubnet" `
        --address-prefix "10.1.2.0/24"

    # Create Public IP for VPN Gateway
    Write-ColorOutput "Creating Public IP for VPN Gateway..." $Yellow
    az network public-ip create `
        --resource-group $ResourceGroupName `
        --name "${VpnGatewayName}-ip" `
        --allocation-method Dynamic `
        --location $Location

    # Create VPN Gateway (this takes 20-45 minutes)
    Write-ColorOutput "Creating VPN Gateway (this will take 20-45 minutes)..." $Yellow
    Write-ColorOutput "You can continue with other steps while this completes..." $Blue
    
    az network vnet-gateway create `
        --resource-group $ResourceGroupName `
        --name $VpnGatewayName `
        --public-ip-address "${VpnGatewayName}-ip" `
        --vnet $VNetName `
        --gateway-type Vpn `
        --sku VpnGw1 `
        --vpn-type RouteBased `
        --location $Location `
        --no-wait

    # Create Container Apps Environment with VNet integration
    Write-ColorOutput "Creating Container Apps Environment..." $Yellow
    az containerapp env create `
        --name $ContainerAppEnvName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --infrastructure-subnet-resource-id "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.Network/virtualNetworks/$VNetName/subnets/$SubnetName" `
        --internal-only true

    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Failed to create Container Apps Environment" $Red
        exit 1
    }

    # Get ACR login server
    $registryServer = az acr show --name $RegistryName --query "loginServer" -o tsv
    
    # Create Container App
    Write-ColorOutput "Creating Private Container App..." $Yellow
    az containerapp create `
        --name $ContainerAppName `
        --resource-group $ResourceGroupName `
        --environment $ContainerAppEnvName `
        --image "${registryServer}/${ImageName}:${ImageTag}" `
        --registry-server $registryServer `
        --target-port 3000 `
        --ingress internal `
        --cpu 1.0 `
        --memory 2.0Gi `
        --min-replicas 1 `
        --max-replicas 3 `
        --env-vars "DB_HOST=mdm-postgres-pgvector.westus2.azurecontainer.io" "DB_PORT=5432" "DB_NAME=mdm_dedup" "DB_USER=postgres" "DB_PASSWORD=mdm_password123" "NODE_ENV=production"

    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "Failed to create Container App" $Red
        exit 1
    }

    # Create Private DNS Zone
    Write-ColorOutput "Creating Private DNS Zone..." $Yellow
    az network private-dns zone create `
        --resource-group $ResourceGroupName `
        --name "mdm.internal"

    # Link Private DNS to VNet
    az network private-dns link vnet create `
        --resource-group $ResourceGroupName `
        --zone-name "mdm.internal" `
        --name "mdm-vnet-link" `
        --virtual-network $VNetName `
        --registration-enabled false

    # Get Container App FQDN
    $appFqdn = az containerapp show --name $ContainerAppName --resource-group $ResourceGroupName --query "properties.configuration.ingress.fqdn" -o tsv

    Write-ColorOutput "Private Container App Deployment Complete!" $Green
    Write-ColorOutput "=================================" $Green
    Write-ColorOutput "Container App FQDN: $appFqdn" $Blue
    Write-ColorOutput "" $NC
    Write-ColorOutput "IMPORTANT: VPN Gateway Setup Required" $Yellow
    Write-ColorOutput "1. Wait for VPN Gateway creation to complete (20-45 minutes)" $Yellow
    Write-ColorOutput "2. Configure site-to-site VPN connection to your corporate network" $Yellow
    Write-ColorOutput "3. Add DNS record in your corporate DNS: mdm-ui.mdm.internal -> $appFqdn" $Yellow
    Write-ColorOutput "" $NC
    Write-ColorOutput "Check VPN Gateway status:" $Blue
    Write-ColorOutput "az network vnet-gateway show --name $VpnGatewayName --resource-group $ResourceGroupName --query 'provisioningState'" $Blue
}

# Display usage if VPN parameters are missing
if ([string]::IsNullOrEmpty($YourPublicIP) -or [string]::IsNullOrEmpty($YourNetworkCIDR)) {
    Write-ColorOutput "VPN Configuration Required" $Yellow
    Write-ColorOutput "=========================" $Yellow
    Write-ColorOutput "Before running this script, you need to provide:" $Yellow
    Write-ColorOutput "- YourPublicIP: Your corporate network's public IP address" $Yellow
    Write-ColorOutput "- YourNetworkCIDR: Your corporate network CIDR (e.g., '192.168.0.0/16')" $Yellow
    Write-ColorOutput "- SharedKey: Pre-shared key for VPN connection" $Yellow
    Write-ColorOutput "" $NC
    Write-ColorOutput "Example usage:" $Blue
    Write-ColorOutput "./deploy-private-container-app.ps1 -YourPublicIP '203.0.113.1' -YourNetworkCIDR '192.168.0.0/16' -SharedKey 'your-secure-key'" $Blue
    Write-ColorOutput "" $NC
    Write-ColorOutput "To find your public IP: https://whatismyipaddress.com/" $Blue
    Write-ColorOutput "" $NC
    Write-ColorOutput "Running deployment without VPN connection (you can configure VPN later)..." $Green
}

# Run the deployment
Deploy-PrivateContainerApp

Write-ColorOutput "" $NC
Write-ColorOutput "Next Steps for VPN Configuration:" $Blue
Write-ColorOutput "1. Get your corporate network details" $Blue
Write-ColorOutput "2. Run the VPN configuration script (will be created next)" $Blue
Write-ColorOutput "3. Configure your corporate firewall to allow VPN traffic" $Blue 