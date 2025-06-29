# Configure VPN Connection Between Azure and Corporate Network
# Run this after the private container app deployment completes

param(
    [Parameter(Mandatory=$true)]
    [string]$YourPublicIP,  # Your corporate public IP
    
    [Parameter(Mandatory=$true)]
    [string]$YourNetworkCIDR,  # Your corporate network CIDR (e.g., "192.168.0.0/16")
    
    [Parameter(Mandatory=$true)]
    [string]$SharedKey,  # Pre-shared key for VPN
    
    [string]$SubscriptionId = "f91c0687-6c71-4a3b-ab6c-6bb9b65b42c8",
    [string]$ResourceGroupName = "RG_DAI_S01",
    [string]$VpnGatewayName = "mdm-vpn-gateway",
    [string]$LocalGatewayName = "mdm-local-gateway",
    [string]$ConnectionName = "mdm-vpn-connection"
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

Write-ColorOutput "Configuring VPN Connection..." $Blue
Write-ColorOutput "=================================" $Blue

# Check if VPN Gateway is ready
Write-ColorOutput "Checking VPN Gateway status..." $Yellow
$gatewayStatus = az network vnet-gateway show --name $VpnGatewayName --resource-group $ResourceGroupName --query 'provisioningState' -o tsv

if ($gatewayStatus -ne "Succeeded") {
    Write-ColorOutput "VPN Gateway is not ready yet. Current status: $gatewayStatus" $Red
    Write-ColorOutput "Please wait for the gateway to be fully provisioned before running this script." $Red
    Write-ColorOutput "This typically takes 20-45 minutes from the initial deployment." $Yellow
    exit 1
}

Write-ColorOutput "VPN Gateway is ready!" $Green

# Create Local Network Gateway (represents your corporate network)
Write-ColorOutput "Creating Local Network Gateway..." $Yellow
az network local-gateway create `
    --resource-group $ResourceGroupName `
    --name $LocalGatewayName `
    --gateway-ip-address $YourPublicIP `
    --local-address-prefixes $YourNetworkCIDR

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Failed to create Local Network Gateway" $Red
    exit 1
}

# Create VPN Connection
Write-ColorOutput "Creating VPN Connection..." $Yellow
az network vpn-connection create `
    --resource-group $ResourceGroupName `
    --name $ConnectionName `
    --vnet-gateway1 $VpnGatewayName `
    --local-gateway2 $LocalGatewayName `
    --shared-key $SharedKey `
    --connection-type IPSec

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Failed to create VPN Connection" $Red
    exit 1
}

# Get Azure Gateway Public IP for corporate firewall configuration
$azureGatewayIP = az network public-ip show --resource-group $ResourceGroupName --name "${VpnGatewayName}-ip" --query 'ipAddress' -o tsv

Write-ColorOutput "VPN Connection Configuration Complete!" $Green
Write-ColorOutput "=================================" $Green
Write-ColorOutput "" $NC
Write-ColorOutput "Corporate Network Configuration Required:" $Yellow
Write-ColorOutput "1. Configure your corporate firewall/router with these settings:" $Blue
Write-ColorOutput "   - Remote Gateway IP: $azureGatewayIP" $Blue
Write-ColorOutput "   - Local Network: $YourNetworkCIDR" $Blue
Write-ColorOutput "   - Remote Network: 10.1.0.0/16" $Blue
Write-ColorOutput "   - Pre-shared Key: $SharedKey" $Blue
Write-ColorOutput "   - Protocol: IKEv2 or IKEv1" $Blue
Write-ColorOutput "" $NC
Write-ColorOutput "2. Open these ports on your corporate firewall:" $Blue
Write-ColorOutput "   - UDP 500 (IKE)" $Blue
Write-ColorOutput "   - UDP 4500 (IPSec)" $Blue
Write-ColorOutput "   - Protocol 50 (ESP)" $Blue
Write-ColorOutput "" $NC
Write-ColorOutput "3. Add DNS resolution for the private app:" $Blue
Write-ColorOutput "   - Add to your corporate DNS: mdm-ui.mdm.internal" $Blue
Write-ColorOutput "   - Or add to local hosts file for testing" $Blue
Write-ColorOutput "" $NC
Write-ColorOutput "Check connection status with:" $Blue
Write-ColorOutput "az network vpn-connection show --name $ConnectionName --resource-group $ResourceGroupName --query 'connectionStatus'" $Blue 