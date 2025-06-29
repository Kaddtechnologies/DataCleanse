# Deploy Master Data Cleanse UI with Private Endpoint
# Alternative approach using Azure Private Link

param(
    [string]$SubscriptionId = "f91c0687-6c71-4a3b-ab6c-6bb9b65b42c8",
    [string]$ResourceGroupName = "RG_DAI_S01",
    [string]$Location = "westus2",
    [string]$RegistryName = "mdmcleansecr",
    [string]$ImageName = "mdm-master-data-cleanse-ui",
    [string]$ImageTag = "latest",
    [string]$VNetName = "mdm-private-vnet",
    [string]$SubnetName = "webapp-subnet",
    [string]$PrivateEndpointSubnet = "private-endpoint-subnet",
    [string]$AppServicePlanName = "mdm-private-plan",
    [string]$WebAppName = "mdm-ui-private-app",
    [string]$PrivateEndpointName = "mdm-private-endpoint",
    [string]$PrivateDnsZoneName = "privatelink.azurewebsites.net"
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

function Deploy-PrivateEndpointApp {
    Write-ColorOutput "Starting Private Endpoint Deployment..." $Blue
    Write-ColorOutput "=================================" $Blue

    # Check Azure login
    if (-not (Test-AzureLogin)) {
        Write-ColorOutput "Please login to Azure first: az login" $Red
        exit 1
    }

    # Set subscription
    Write-ColorOutput "Setting subscription to $SubscriptionId..." $Yellow
    az account set --subscription $SubscriptionId

    # Create Virtual Network
    Write-ColorOutput "Creating Virtual Network..." $Yellow
    az network vnet create `
        --resource-group $ResourceGroupName `
        --name $VNetName `
        --address-prefix "10.2.0.0/16" `
        --subnet-name $SubnetName `
        --subnet-prefix "10.2.1.0/24" `
        --location $Location

    # Create subnet for private endpoints
    Write-ColorOutput "Creating Private Endpoint Subnet..." $Yellow
    az network vnet subnet create `
        --resource-group $ResourceGroupName `
        --vnet-name $VNetName `
        --name $PrivateEndpointSubnet `
        --address-prefix "10.2.2.0/24" `
        --disable-private-endpoint-network-policies true

    # Create App Service Plan
    Write-ColorOutput "Creating App Service Plan..." $Yellow
    az appservice plan create `
        --resource-group $ResourceGroupName `
        --name $AppServicePlanName `
        --location $Location `
        --sku P1V3 `
        --is-linux

    # Create Web App
    Write-ColorOutput "Creating Web App..." $Yellow
    az webapp create `
        --resource-group $ResourceGroupName `
        --plan $AppServicePlanName `
        --name $WebAppName `
        --deployment-container-image-name "${RegistryName}.azurecr.io/${ImageName}:${ImageTag}"

    # Configure container registry
    $registryServer = az acr show --name $RegistryName --query "loginServer" -o tsv
    $registryUsername = az acr credential show --name $RegistryName --query "username" -o tsv
    $registryPassword = az acr credential show --name $RegistryName --query "passwords[0].value" -o tsv

    az webapp config container set `
        --resource-group $ResourceGroupName `
        --name $WebAppName `
        --docker-custom-image-name "${registryServer}/${ImageName}:${ImageTag}" `
        --docker-registry-server-url "https://$registryServer" `
        --docker-registry-server-user $registryUsername `
        --docker-registry-server-password $registryPassword

    # Set environment variables
    Write-ColorOutput "Configuring environment variables..." $Yellow
    az webapp config appsettings set `
        --resource-group $ResourceGroupName `
        --name $WebAppName `
        --settings "DB_HOST=mdm-postgres-pgvector.westus2.azurecontainer.io" "DB_PORT=5432" "DB_NAME=mdm_dedup" "DB_USER=postgres" "DB_PASSWORD=mdm_password123" "NODE_ENV=production" "WEBSITES_PORT=3000"

    # Enable VNet integration
    Write-ColorOutput "Enabling VNet integration..." $Yellow
    az webapp vnet-integration add `
        --resource-group $ResourceGroupName `
        --name $WebAppName `
        --vnet $VNetName `
        --subnet $SubnetName

    # Disable public access
    Write-ColorOutput "Disabling public access..." $Yellow
    az webapp update `
        --resource-group $ResourceGroupName `
        --name $WebAppName `
        --set publicNetworkAccess=Disabled

    # Create Private DNS Zone
    Write-ColorOutput "Creating Private DNS Zone..." $Yellow
    az network private-dns zone create `
        --resource-group $ResourceGroupName `
        --name $PrivateDnsZoneName

    # Link Private DNS to VNet
    az network private-dns link vnet create `
        --resource-group $ResourceGroupName `
        --zone-name $PrivateDnsZoneName `
        --name "webapp-dns-link" `
        --virtual-network $VNetName `
        --registration-enabled false

    # Create Private Endpoint
    Write-ColorOutput "Creating Private Endpoint..." $Yellow
    $webAppId = az webapp show --resource-group $ResourceGroupName --name $WebAppName --query "id" -o tsv
    
    az network private-endpoint create `
        --resource-group $ResourceGroupName `
        --name $PrivateEndpointName `
        --vnet-name $VNetName `
        --subnet $PrivateEndpointSubnet `
        --private-connection-resource-id $webAppId `
        --group-id sites `
        --connection-name "${WebAppName}-connection" `
        --location $Location

    # Create DNS record for private endpoint
    Write-ColorOutput "Creating DNS records..." $Yellow
    $privateEndpointIP = az network private-endpoint show `
        --resource-group $ResourceGroupName `
        --name $PrivateEndpointName `
        --query "customDnsConfigs[0].ipAddresses[0]" -o tsv

    az network private-dns record-set a create `
        --resource-group $ResourceGroupName `
        --zone-name $PrivateDnsZoneName `
        --name $WebAppName

    az network private-dns record-set a add-record `
        --resource-group $ResourceGroupName `
        --zone-name $PrivateDnsZoneName `
        --record-set-name $WebAppName `
        --ipv4-address $privateEndpointIP

    Write-ColorOutput "Private Endpoint Deployment Complete!" $Green
    Write-ColorOutput "=================================" $Green
    Write-ColorOutput "Private App URL: https://${WebAppName}.${PrivateDnsZoneName}" $Blue
    Write-ColorOutput "Private IP: $privateEndpointIP" $Blue
    Write-ColorOutput "" $NC
    Write-ColorOutput "Access Options:" $Yellow
    Write-ColorOutput "1. Connect via Azure Bastion or Jump Box in the same VNet" $Blue
    Write-ColorOutput "2. Set up VPN to connect your corporate network to this VNet" $Blue
    Write-ColorOutput "3. Use Azure ExpressRoute for dedicated connection" $Blue
    Write-ColorOutput "" $NC
    Write-ColorOutput "To create a Jump Box for testing:" $Blue
    Write-ColorOutput "az vm create --resource-group $ResourceGroupName --name 'mdm-jumpbox' --image 'Win2022Datacenter' --vnet-name $VNetName --subnet $SubnetName --admin-username 'azureuser'" $Blue
}

Deploy-PrivateEndpointApp 