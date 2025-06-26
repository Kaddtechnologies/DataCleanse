#!/bin/bash

# Interactive PostgreSQL with pgvector Azure Container Deployment Wizard
# Compatible with WSL Ubuntu and Azure Container Instances
# Author: Generated for Development Team
#
# INSTRUCTIONS:
# 1. Place this script in your project directory
# 2. Create a database initialization script (e.g., init-db.sql or setup-database.js) 
#    in the SAME DIRECTORY as this script
# 3. The init script should contain your database schema, tables, indexes, and seed data
# 4. Run this wizard script - it will prompt you for the init script filename
# 5. The wizard will validate the init script exists before deployment

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Global variables for PostgreSQL configuration
RESOURCE_GROUP=""
LOCATION=""
CONTAINER_NAME=""
DNS_LABEL=""
POSTGRES_DB=""
POSTGRES_USER=""
POSTGRES_PASSWORD=""
POSTGRES_PORT=5432
CPU=1
MEMORY=2
STORAGE_SIZE=20
ENABLE_PGVECTOR=true
POSTGRES_VERSION="16"
DB_INIT_SCRIPT=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo -e "\n${CYAN}================================================${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${CYAN}================================================${NC}\n"
}

print_success() {
    print_status $GREEN "✅ $1"
}

print_error() {
    print_status $RED "❌ $1"
}

print_warning() {
    print_status $YELLOW "⚠️  $1"
}

print_info() {
    print_status $BLUE "ℹ️  $1"
}

# Function to get Azure defaults
get_azure_defaults() {
    print_info "Getting current Azure subscription and resource group information..."
    
    # Get current subscription info
    CURRENT_SUBSCRIPTION=$(az account show --query "name" --output tsv 2>/dev/null || echo "")
    CURRENT_SUBSCRIPTION_ID=$(az account show --query "id" --output tsv 2>/dev/null || echo "")
    
    # Get available resource groups
    AVAILABLE_RESOURCE_GROUPS=($(az group list --query "[].name" --output tsv 2>/dev/null || echo ""))
    DEFAULT_LOCATION=$(az group list --query "[0].location" --output tsv 2>/dev/null || echo "westus2")
    
    # Set default resource group (first available)
    if [ ${#AVAILABLE_RESOURCE_GROUPS[@]} -gt 0 ]; then
        DEFAULT_RESOURCE_GROUP="${AVAILABLE_RESOURCE_GROUPS[0]}"
    else
        DEFAULT_RESOURCE_GROUP="RG_DAI_S01"
    fi
    
    echo -e "${CYAN}Current Subscription: ${WHITE}$CURRENT_SUBSCRIPTION${NC}"
    if [ ${#AVAILABLE_RESOURCE_GROUPS[@]} -gt 0 ]; then
        echo -e "${CYAN}Available Resource Groups: ${WHITE}${AVAILABLE_RESOURCE_GROUPS[*]}${NC}"
    fi
    echo -e "${CYAN}Default Location: ${WHITE}$DEFAULT_LOCATION${NC}"
    echo
}

# Function to validate prerequisites
validate_prerequisites() {
    print_header "Validating Prerequisites"
    
    # Check if running in WSL or Linux
    if ! grep -q Microsoft /proc/version 2>/dev/null && ! grep -q Linux /proc/version 2>/dev/null; then
        print_error "This script requires WSL (Windows Subsystem for Linux) or native Linux environment"
        exit 1
    fi
    print_success "Running in compatible Linux environment"
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        print_info "Install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    print_success "Azure CLI is installed"
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure CLI"
        print_info "Run: az login"
        exit 1
    fi
    print_success "Azure CLI is authenticated"
    
    # Get Azure defaults after authentication
    get_azure_defaults
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Installing jq..."
        sudo apt-get update && sudo apt-get install -y jq
    fi
    print_success "JSON processor (jq) is available"
}

# Function to validate database initialization script
validate_db_init_script() {
    print_header "Database Initialization Script Validation"
    
    # List available scripts in current directory
    print_info "Looking for database initialization scripts in: ${SCRIPT_DIR}"
    
    local sql_files=($(find "${SCRIPT_DIR}" -maxdepth 1 -name "*.sql" -type f))
    local js_files=($(find "${SCRIPT_DIR}" -maxdepth 1 -name "*.js" -type f))
    local py_files=($(find "${SCRIPT_DIR}" -maxdepth 1 -name "*.py" -type f))
    
    if [ ${#sql_files[@]} -eq 0 ] && [ ${#js_files[@]} -eq 0 ] && [ ${#py_files[@]} -eq 0 ]; then
        print_error "No database initialization scripts found in current directory!"
        echo
        print_info "Please create a database initialization script in the same directory as this wizard:"
        echo
        echo -e "${YELLOW}Examples:${NC}"
        echo "  • init-db.sql       - SQL script with CREATE TABLE statements"
        echo "  • setup-database.js - Node.js script with database setup"
        echo "  • init-schema.py    - Python script for database initialization"
        echo
        echo -e "${CYAN}Sample SQL script structure:${NC}"
        echo "  -- Enable pgvector extension"
        echo "  CREATE EXTENSION IF NOT EXISTS vector;"
        echo "  "
        echo "  -- Create your tables"
        echo "  CREATE TABLE your_table ("
        echo "    id SERIAL PRIMARY KEY,"
        echo "    name VARCHAR(255),"
        echo "    embedding vector(1536)"
        echo "  );"
        echo
        echo -e "${CYAN}Sample Node.js script structure:${NC}"
        echo "  const { Client } = require('pg');"
        echo "  // Your database setup logic here"
        echo
        print_error "Create your initialization script and run this wizard again."
        exit 1
    fi
    
    # Display available scripts and create selection arrays
    echo -e "${GREEN}Available initialization scripts:${NC}"
    local script_count=0
    local all_scripts=()
    local script_types=()
    
    if [ ${#sql_files[@]} -gt 0 ]; then
        for file in "${sql_files[@]}"; do
            script_count=$((script_count + 1))
            all_scripts+=("$(basename "$file")")
            script_types+=("SQL")
            echo "  ${script_count}. $(basename "$file") (SQL)"
        done
    fi
    
    if [ ${#js_files[@]} -gt 0 ]; then
        for file in "${js_files[@]}"; do
            script_count=$((script_count + 1))
            all_scripts+=("$(basename "$file")")
            script_types+=("JavaScript")
            echo "  ${script_count}. $(basename "$file") (JavaScript)"
        done
    fi
    
    if [ ${#py_files[@]} -gt 0 ]; then
        for file in "${py_files[@]}"; do
            script_count=$((script_count + 1))
            all_scripts+=("$(basename "$file")")
            script_types+=("Python")
            echo "  ${script_count}. $(basename "$file") (Python)"
        done
    fi
    
    echo
    read -p "Enter the number of your database initialization script (1-${script_count}): " script_choice
    
    # Validate the choice
    if ! [[ "$script_choice" =~ ^[0-9]+$ ]] || [ "$script_choice" -lt 1 ] || [ "$script_choice" -gt "$script_count" ]; then
        print_error "Invalid selection. Please enter a number between 1 and ${script_count}"
        exit 1
    fi
    
    # Get the selected script
    local array_index=$((script_choice - 1))
    DB_INIT_SCRIPT="${all_scripts[$array_index]}"
    local script_type="${script_types[$array_index]}"
    
    print_success "Selected: ${DB_INIT_SCRIPT} (${script_type})"
    
    # Validate the script exists
    if [ ! -f "${SCRIPT_DIR}/${DB_INIT_SCRIPT}" ]; then
        print_error "Script '${DB_INIT_SCRIPT}' not found in ${SCRIPT_DIR}"
        print_info "Make sure the script is in the same directory as this wizard"
        exit 1
    fi
    
    print_success "Found initialization script: ${DB_INIT_SCRIPT}"
    
    # Show script preview
    echo
    print_info "Script preview (first 10 lines):"
    echo -e "${CYAN}----------------------------------------${NC}"
    head -10 "${SCRIPT_DIR}/${DB_INIT_SCRIPT}"
    echo -e "${CYAN}----------------------------------------${NC}"
    echo
    
    read -p "Is this the correct initialization script? (y/n): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_error "Script validation cancelled by user"
        exit 1
    fi
    
    print_success "Database initialization script validated"
}

# Function to get user input with validation
get_user_input() {
    print_header "PostgreSQL Configuration Setup"
    
    # Resource Group
    echo -e "${YELLOW}Azure Resource Configuration${NC}"
    if [ ${#AVAILABLE_RESOURCE_GROUPS[@]} -gt 0 ]; then
        echo -e "${CYAN}Available Resource Groups: ${WHITE}${AVAILABLE_RESOURCE_GROUPS[*]}${NC}"
        read -p "Enter Resource Group name [${DEFAULT_RESOURCE_GROUP}]: " RESOURCE_GROUP
        RESOURCE_GROUP=${RESOURCE_GROUP:-$DEFAULT_RESOURCE_GROUP}
    else
        read -p "Enter Resource Group name: " RESOURCE_GROUP
        while [[ -z "$RESOURCE_GROUP" ]]; do
            print_warning "Resource Group cannot be empty"
            read -p "Enter Resource Group name: " RESOURCE_GROUP
        done
    fi
    
    # Location
    echo -e "\n${BLUE}Available locations: eastus, westus2, centralus, westeurope, eastasia${NC}"
    read -p "Enter Azure location [${DEFAULT_LOCATION}]: " LOCATION
    LOCATION=${LOCATION:-$DEFAULT_LOCATION}
    
    # Container Configuration
    echo -e "\n${YELLOW}Container Configuration${NC}"
    # Create intelligent default container name based on resource group
    DEFAULT_CONTAINER_NAME="postgres-pgvector"
    if [[ "$RESOURCE_GROUP" =~ ^RG_.*_S[0-9]+$ ]]; then
        # Extract suffix from resource group (e.g., RG_DAI_S01 -> s01)
        SUFFIX=$(echo "$RESOURCE_GROUP" | sed 's/.*_S\([0-9]\+\)$/s\1/' | tr '[:upper:]' '[:lower:]')
        DEFAULT_CONTAINER_NAME="postgres-pgvector-${SUFFIX}"
    fi
    
    read -p "Enter Container name [${DEFAULT_CONTAINER_NAME}]: " CONTAINER_NAME
    CONTAINER_NAME=${CONTAINER_NAME:-$DEFAULT_CONTAINER_NAME}
    
    read -p "Enter DNS label [${CONTAINER_NAME}]: " DNS_LABEL
    DNS_LABEL=${DNS_LABEL:-$CONTAINER_NAME}
    
    # PostgreSQL Configuration
    echo -e "\n${YELLOW}PostgreSQL Database Configuration${NC}"
    read -p "Enter PostgreSQL version (14/15/16) [16]: " POSTGRES_VERSION
    POSTGRES_VERSION=${POSTGRES_VERSION:-16}
    
    read -p "Enter database name [mdm_dedup]: " POSTGRES_DB
    POSTGRES_DB=${POSTGRES_DB:-mdm_dedup}
    
    read -p "Enter PostgreSQL username [postgres]: " POSTGRES_USER
    POSTGRES_USER=${POSTGRES_USER:-postgres}
    
    while [[ -z "$POSTGRES_PASSWORD" ]]; do
        read -s -p "Enter PostgreSQL password (min 8 chars): " POSTGRES_PASSWORD
        echo
        if [[ ${#POSTGRES_PASSWORD} -lt 8 ]]; then
            print_warning "Password must be at least 8 characters"
            POSTGRES_PASSWORD=""
        fi
    done
    
    # Resource Configuration
    echo -e "\n${YELLOW}Resource Allocation${NC}"
    read -p "Enter CPU cores [1]: " CPU
    CPU=${CPU:-1}
    
    read -p "Enter Memory in GB [2]: " MEMORY
    MEMORY=${MEMORY:-2}
    
    read -p "Enter Storage size in GB [20]: " STORAGE_SIZE
    STORAGE_SIZE=${STORAGE_SIZE:-20}
    
    # pgvector confirmation
    echo -e "\n${YELLOW}Extensions Configuration${NC}"
    read -p "Enable pgvector extension? (y/n) [y]: " enable_pgvector
    if [[ $enable_pgvector =~ ^[Nn]$ ]]; then
        ENABLE_PGVECTOR=false
    fi
}

# Function to display configuration summary
show_configuration_summary() {
    print_header "Deployment Configuration Summary"
    
    echo -e "${CYAN}Azure Configuration:${NC}"
    echo "  Resource Group: $RESOURCE_GROUP"
    echo "  Location: $LOCATION"
    echo
    echo -e "${CYAN}Container Configuration:${NC}"
    echo "  Container Name: $CONTAINER_NAME"
    echo "  DNS Label: $DNS_LABEL"
    echo "  FQDN: ${DNS_LABEL}.${LOCATION}.azurecontainer.io"
    echo
    echo -e "${CYAN}PostgreSQL Configuration:${NC}"
    echo "  Version: PostgreSQL $POSTGRES_VERSION with pgvector"
    echo "  Database: $POSTGRES_DB"
    echo "  Username: $POSTGRES_USER"
    echo "  Password: [HIDDEN]"
    echo "  Port: $POSTGRES_PORT"
    echo "  pgvector Extension: $([ "$ENABLE_PGVECTOR" = true ] && echo "Enabled" || echo "Disabled")"
    echo
    echo -e "${CYAN}Resource Allocation:${NC}"
    echo "  CPU: $CPU cores"
    echo "  Memory: ${MEMORY}GB"
    echo "  Storage: ${STORAGE_SIZE}GB"
    echo
    echo -e "${CYAN}Database Initialization:${NC}"
    echo "  Script: $DB_INIT_SCRIPT"
    echo "  Location: ${SCRIPT_DIR}/${DB_INIT_SCRIPT}"
    echo
    echo -e "${CYAN}Connection Information:${NC}"
    echo "  Host: ${DNS_LABEL}.${LOCATION}.azurecontainer.io"
    echo "  Port: $POSTGRES_PORT"
    echo "  Connection String: postgresql://${POSTGRES_USER}:[PASSWORD]@${DNS_LABEL}.${LOCATION}.azurecontainer.io:${POSTGRES_PORT}/${POSTGRES_DB}"
    echo
}

# Function to create or verify resource group
setup_resource_group() {
    print_header "Setting Up Resource Group"
    
    if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_success "Resource group '$RESOURCE_GROUP' already exists"
    else
        print_info "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'"
        az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
        print_success "Resource group created successfully"
    fi
}

# Function to deploy PostgreSQL container
deploy_postgres_container() {
    print_header "Deploying PostgreSQL Container with pgvector"
    
    local image="pgvector/pgvector:pg${POSTGRES_VERSION}"
    
    print_info "Deploying container with image: $image"
    print_info "This may take 5-10 minutes..."
    
    # Create the container
    az container create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$CONTAINER_NAME" \
        --image "$image" \
        --dns-name-label "$DNS_LABEL" \
        --ports $POSTGRES_PORT \
        --cpu "$CPU" \
        --memory "$MEMORY" \
        --environment-variables \
            POSTGRES_DB="$POSTGRES_DB" \
            POSTGRES_USER="$POSTGRES_USER" \
            POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
            PGDATA="/var/lib/postgresql/data/pgdata" \
        --restart-policy Always \
        --location "$LOCATION"
    
    if [ $? -eq 0 ]; then
        print_success "PostgreSQL container deployed successfully!"
    else
        print_error "Container deployment failed"
        exit 1
    fi
}

# Function to wait for container to be ready
wait_for_container() {
    print_header "Waiting for Container to Start"
    
    local max_attempts=30
    local attempt=1
    
    print_info "Checking container status..."
    
    while [ $attempt -le $max_attempts ]; do
        local state=$(az container show --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_NAME" --query "containers[0].instanceView.currentState.state" -o tsv 2>/dev/null)
        
        if [ "$state" = "Running" ]; then
            print_success "Container is running!"
            break
        elif [ "$state" = "Terminated" ]; then
            print_error "Container terminated unexpectedly"
            print_info "Checking container logs..."
            az container logs --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_NAME"
            exit 1
        else
            print_info "Attempt $attempt/$max_attempts - Container state: $state"
            sleep 10
            attempt=$((attempt + 1))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Container failed to start within expected time"
        exit 1
    fi
    
    # Additional wait for PostgreSQL to be ready
    print_info "Waiting for PostgreSQL to be ready for connections..."
    sleep 30
}

# Function to test database connection
test_database_connection() {
    print_header "Testing Database Connection"
    
    local host="${DNS_LABEL}.${LOCATION}.azurecontainer.io"
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL client (psql) not found. Installing..."
        sudo apt-get update && sudo apt-get install -y postgresql-client
    fi
    
    print_info "Testing connection to: $host:$POSTGRES_PORT"
    
    # Test basic connection
    export PGPASSWORD="$POSTGRES_PASSWORD"
    if psql -h "$host" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();" &> /dev/null; then
        print_success "Database connection successful!"
        
        # Test pgvector extension if enabled
        if [ "$ENABLE_PGVECTOR" = true ]; then
            if psql -h "$host" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS vector;" &> /dev/null; then
                print_success "pgvector extension is available!"
            else
                print_warning "pgvector extension test failed"
            fi
        fi
    else
        print_error "Database connection failed"
        print_info "Please check container logs:"
        print_info "az container logs --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME"
        return 1
    fi
    
    unset PGPASSWORD
}

# Function to run database initialization script
run_database_initialization() {
    print_header "Running Database Initialization Script"
    
    local host="${DNS_LABEL}.${LOCATION}.azurecontainer.io"
    local script_path="${SCRIPT_DIR}/${DB_INIT_SCRIPT}"
    local script_ext="${DB_INIT_SCRIPT##*.}"
    
    print_info "Executing initialization script: $DB_INIT_SCRIPT"
    print_info "Script type: $script_ext"
    
    case $script_ext in
        sql)
            print_info "Running SQL script..."
            export PGPASSWORD="$POSTGRES_PASSWORD"
            if psql -h "$host" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$script_path"; then
                print_success "SQL script executed successfully!"
            else
                print_error "SQL script execution failed"
                return 1
            fi
            unset PGPASSWORD
            ;;
        js)
            print_info "Running Node.js script..."
            if command -v node &> /dev/null; then
                # Set environment variables for Node.js script
                export POSTGRES_HOST="$host"
                export POSTGRES_PORT="$POSTGRES_PORT"
                export POSTGRES_USER="$POSTGRES_USER"
                export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
                export POSTGRES_DB="$POSTGRES_DB"
                
                if node "$script_path"; then
                    print_success "Node.js script executed successfully!"
                else
                    print_error "Node.js script execution failed"
                    return 1
                fi
                
                # Clean up environment variables
                unset POSTGRES_HOST POSTGRES_PORT POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB
            else
                print_error "Node.js not found. Please install Node.js to run JavaScript initialization scripts"
                return 1
            fi
            ;;
        py)
            print_info "Running Python script..."
            if command -v python3 &> /dev/null; then
                # Set environment variables for Python script
                export POSTGRES_HOST="$host"
                export POSTGRES_PORT="$POSTGRES_PORT"
                export POSTGRES_USER="$POSTGRES_USER"
                export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
                export POSTGRES_DB="$POSTGRES_DB"
                
                if python3 "$script_path"; then
                    print_success "Python script executed successfully!"
                else
                    print_error "Python script execution failed"
                    return 1
                fi
                
                # Clean up environment variables
                unset POSTGRES_HOST POSTGRES_PORT POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB
            else
                print_error "Python3 not found. Please install Python3 to run Python initialization scripts"
                return 1
            fi
            ;;
        *)
            print_error "Unsupported script type: $script_ext"
            print_info "Supported types: .sql, .js, .py"
            return 1
            ;;
    esac
}

# Function to display final connection information
show_connection_info() {
    print_header "Deployment Complete - Connection Information"
    
    local host="${DNS_LABEL}.${LOCATION}.azurecontainer.io"
    
    echo -e "${GREEN}🎉 PostgreSQL with pgvector deployed successfully!${NC}"
    echo
    echo -e "${CYAN}Connection Details:${NC}"
    echo "  Host: $host"
    echo "  Port: $POSTGRES_PORT"
    echo "  Database: $POSTGRES_DB"
    echo "  Username: $POSTGRES_USER"
    echo "  Password: [Use the password you provided]"
    echo
    echo -e "${CYAN}Connection String:${NC}"
    echo "  postgresql://${POSTGRES_USER}:[PASSWORD]@${host}:${POSTGRES_PORT}/${POSTGRES_DB}"
    echo
    echo -e "${CYAN}psql Command:${NC}"
    echo "  psql -h $host -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB"
    echo
    echo -e "${CYAN}Azure Management:${NC}"
    echo "  View logs: az container logs --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME"
    echo "  Stop: az container stop --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME"
    echo "  Start: az container start --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME"
    echo "  Delete: az container delete --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME"
    echo
}

# Main execution flow
main() {
    print_header "PostgreSQL with pgvector Azure Deployment Wizard"
    echo -e "${WHITE}This wizard will deploy PostgreSQL with pgvector extension to Azure Container Instances${NC}"
    echo -e "${YELLOW}Make sure your database initialization script is in the same directory as this wizard!${NC}"
    echo
    
    # Step 1: Validate prerequisites
    validate_prerequisites
    
    # Step 2: Validate database initialization script
    validate_db_init_script
    
    # Step 3: Get user configuration
    get_user_input
    
    # Step 4: Show configuration summary
    show_configuration_summary
    
    echo
    read -p "Proceed with deployment? (y/n): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled by user"
        exit 0
    fi
    
    # Step 5: Setup resource group
    setup_resource_group
    
    # Step 6: Deploy container
    deploy_postgres_container
    
    # Step 7: Wait for container to be ready
    wait_for_container
    
    # Step 8: Test database connection
    if ! test_database_connection; then
        print_error "Database connection test failed. Check container status and logs."
        exit 1
    fi
    
    # Step 9: Run database initialization script
    if ! run_database_initialization; then
        print_error "Database initialization failed. Container is running but schema setup failed."
        print_info "You can manually run your initialization script later."
    fi
    
    # Step 10: Show final connection information
    show_connection_info
    
    print_success "PostgreSQL with pgvector deployment completed successfully! 🚀"
}

# Run the main function
main "$@" 