#!/bin/bash

# MDM Master Data Cleanse - Database Setup Script
# This script sets up a complete PostgreSQL database with pgvector for local development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="mdm_dedup"
# Use different configurations for local vs production
if [ "${NODE_ENV}" = "production" ]; then
    DB_HOST="mdm-postgres-db.westus2.azurecontainer.io"
    DB_PORT="5432"
    DB_USER="postgres"
    DB_PASSWORD="mdm_password123"
    CONTAINER_NAME="mdm-postgres-cloud"
    REDIS_CONTAINER_NAME="mdm-redis-cloud" 
    COMPOSE_FILE="docker-compose.cloud.yml"
    USE_AZURE=true
else
    DB_HOST="localhost"
    DB_PORT="5433"
    DB_USER="mdm_user"
    DB_PASSWORD="mdm_password123"
    CONTAINER_NAME="mdm-postgres"
    REDIS_CONTAINER_NAME="mdm-redis"
    COMPOSE_FILE="docker-compose.yml"
    USE_AZURE=false
fi

print_header() {
    echo -e "${BLUE}"
    echo "================================================="
    echo "  MDM Master Data Cleanse - Database Setup"
    echo "================================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${YELLOW}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_docker() {
    print_step "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

check_node() {
    print_step "Checking Node.js installation..."

    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

install_dependencies() {
    print_step "Installing PostgreSQL client and dependencies..."
    
    # # Check if pg package is already installed
    # if npm list pg &> /dev/null; then
    #     print_info "PostgreSQL client dependencies already installed"
    # else
    #     print_info "Installing PostgreSQL client dependencies..."
    #     npm install pg @types/pg pgvector
    #     print_success "Dependencies installed"
    # fi
}

stop_existing_containers() {
    print_step "Stopping any existing containers..."
    
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        print_info "Stopping existing PostgreSQL container..."
        docker stop $CONTAINER_NAME || true
    fi
    
    if docker ps -a -q -f name=$CONTAINER_NAME | grep -q .; then
        print_info "Removing existing PostgreSQL container..."
        docker rm $CONTAINER_NAME || true
    fi
    
    if docker ps -q -f name=$REDIS_CONTAINER_NAME | grep -q .; then
        print_info "Stopping existing Redis container..."
        docker stop $REDIS_CONTAINER_NAME || true
    fi
    
    if docker ps -a -q -f name=$REDIS_CONTAINER_NAME | grep -q .; then
        print_info "Removing existing Redis container..."
        docker rm $REDIS_CONTAINER_NAME || true
    fi
    
    print_success "Cleaned up existing containers"
}

start_database() {
    print_step "Starting PostgreSQL database with pgvector..."
    
    # Use docker compose if available, otherwise fall back to docker-compose
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Start the services using the appropriate compose file
    $COMPOSE_CMD -f $COMPOSE_FILE up -d postgres
    
    print_info "Waiting for PostgreSQL to start..."
    sleep 10
    
    # Wait for PostgreSQL to be ready
    for i in {1..30}; do
        if docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME &> /dev/null; then
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "PostgreSQL failed to start within 30 seconds"
            exit 1
        fi
        sleep 1
    done
    
    print_success "PostgreSQL is running on port $DB_PORT"
}

start_redis() {
    print_step "Starting Redis (optional - for caching)..."
    
    # Use docker compose if available, otherwise fall back to docker-compose
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    # Start Redis using the appropriate compose file
    $COMPOSE_CMD -f $COMPOSE_FILE up -d redis
    
    print_success "Redis is running on port 6379"
}

verify_database() {
    print_step "Verifying database setup..."
    
    # Check if we can connect to the database
    if [ "$USE_AZURE" = true ]; then
        # Test connection to Azure PostgreSQL container
        if command -v psql &> /dev/null; then
            print_info "Testing connection to Azure PostgreSQL container..."
            export PGPASSWORD=$DB_PASSWORD
            if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" &> /dev/null; then
                print_success "Azure PostgreSQL connection successful"
            else
                print_error "Failed to connect to Azure PostgreSQL container"
                print_info "Trying to test if container is accessible..."
                if ping -c 1 $DB_HOST &> /dev/null; then
                    print_info "Host is reachable, database may not be ready yet"
                else
                    print_error "Host is not reachable"
                fi
                exit 1
            fi
            unset PGPASSWORD
        else
            print_error "psql client not found. Please install PostgreSQL client tools."
            exit 1
        fi
    else
        # Test local Docker connection
        if docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT version();" &> /dev/null; then
            print_success "Database connection successful"
        else
            print_error "Failed to connect to database"
            exit 1
        fi
    fi
    
    # Check if pgvector extension is available
    if docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM pg_extension WHERE extname = 'vector';" | grep -q vector; then
        print_success "pgvector extension is installed"
    else
        print_error "pgvector extension is not installed"
        exit 1
    fi
    
    # Check if tables exist
    TABLE_COUNT=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    if [ "$TABLE_COUNT" -gt 5 ]; then
        print_success "Database tables created successfully ($TABLE_COUNT tables found)"
    else
        print_error "Database tables were not created properly"
        exit 1
    fi
    
    # Run migration script to ensure all tables exist
    print_info "Running migration to ensure all tables exist..."
    if [ -f "scripts/add-missing-tables.sql" ]; then
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < scripts/add-missing-tables.sql &> /dev/null || true
        print_success "Migration script executed"
    fi
}

seed_database() {
    print_step "Seeding database with comprehensive test data..."
    
    if [ -f "scripts/seed-database.js" ]; then
        print_info "Running database seeder..."
        if node scripts/seed-database.js; then
            print_success "Database seeded with comprehensive test data"
            print_info "Demo session created with realistic duplicate pairs"
        else
            print_error "Database seeding failed"
            print_info "Continuing without seed data..."
        fi
    else
        print_info "No seed script found, skipping database seeding"
    fi
}

create_env_file() {
    print_step "Creating environment configuration..."
    
    if [ "${NODE_ENV}" = "production" ]; then
        ENV_FILE=".env.production"
        DB_HOST="postgres"  # Docker service name for production
        API_BASE_URL="https://datacleanse.sliplane.app"
        NODE_ENVIRONMENT="production"
    else
        ENV_FILE=".env.local"
        DB_HOST="localhost"
        API_BASE_URL="http://localhost:8000"
        NODE_ENVIRONMENT="development"
    fi
    
    if [ -f "$ENV_FILE" ]; then
        print_info "Backing up existing $ENV_FILE"
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    cat > "$ENV_FILE" << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
POSTGRES_HOST=$DB_HOST
POSTGRES_PORT=$DB_PORT
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# Redis Configuration (optional)
REDIS_URL=redis://$DB_HOST:6379

# Application Configuration
NODE_ENV=$NODE_ENVIRONMENT
NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL

# AI Configuration (add your API keys here)
OPENAI_API_KEY=6kEA8jhAvaSiqoIDVUXygVWyLEKsmSUY0zIBOqsNeN2g0O6QWtWuJQQJ99BDACHYHv6XJ3w3AAABACOGTeiK
GOOGLE_API_KEY=AIzaSyAGxugbJDi84dIQeIvx6moBPdCDwJdhJIw

# Feature Flags
NEXT_PUBLIC_FEATURE_AI_RULES=true
NEXT_PUBLIC_FEATURE_ERP_INTEGRATION=true
NEXT_PUBLIC_FEATURE_DATA_QUALITY=true

# Embedding Service Configuration
EMBEDDING_API_URL=http://$DB_HOST:8000/embed
EOF
    
    print_success "Environment file created: $ENV_FILE"
    print_info "Please update the API keys in $ENV_FILE for AI functionality"
}

print_connection_info() {
    print_step "Database connection information:"
    echo ""
    
    if [ "${NODE_ENV}" = "production" ]; then
        DB_HOST_DISPLAY="postgres (Docker service)"
        COMPOSE_DOWN_CMD="docker-compose -f $COMPOSE_FILE down"
        COMPOSE_UP_CMD="docker-compose -f $COMPOSE_FILE up -d"
        echo -e "${BLUE}Production Configuration:${NC}"
        echo "  Environment: Production"
        echo "  API Base URL: https://datacleanse.sliplane.app"
    else
        DB_HOST_DISPLAY="localhost"
        COMPOSE_DOWN_CMD="docker-compose down"
        COMPOSE_UP_CMD="docker-compose up -d"
        echo -e "${BLUE}Development Configuration:${NC}"
        echo "  Environment: Development"
        echo "  API Base URL: http://localhost:8000"
    fi
    
    echo ""
    echo -e "${BLUE}PostgreSQL Database:${NC}"
    echo "  Host: $DB_HOST_DISPLAY"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo "  Username: $DB_USER"
    echo "  Password: $DB_PASSWORD"
    echo "  Connection URL: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST_DISPLAY:$DB_PORT/$DB_NAME"
    echo ""
    echo -e "${BLUE}Redis Cache:${NC}"
    echo "  Host: $DB_HOST_DISPLAY"
    echo "  Port: 6379"
    echo "  URL: redis://$DB_HOST_DISPLAY:6379"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  Connect to database: docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
    echo "  View logs: docker logs $CONTAINER_NAME"
    echo "  Stop containers: $COMPOSE_DOWN_CMD"
    echo "  Start containers: $COMPOSE_UP_CMD"
    echo "  Remove all data: $COMPOSE_DOWN_CMD -v"
    echo ""
}

test_api_health() {
    print_step "Testing API health endpoint (if application is running)..."
    
    if command -v curl &> /dev/null; then
        if curl -s https://datacleanse.sliplane.app/api/health &> /dev/null; then
            print_success "API health endpoint is responding"
            curl -s https://datacleanse.sliplane.app/api/health | jq . 2>/dev/null || echo "API is healthy"
        else
            print_info "API is not running yet. Start it with: npm run dev"
        fi
    else
        print_info "curl not available. Start the application with 'npm run dev' and visit https://datacleanse.sliplane.app/api/health"
    fi
}

main() {
    print_header
    
    if [ "${NODE_ENV}" = "production" ]; then
        print_info "Running in PRODUCTION mode - setting up for Docker deployment at datacleanse.sliplane.app"
        print_info "Using PostgreSQL port 5432 and docker-compose.cloud.yml configuration"
    else
        print_info "Running in DEVELOPMENT mode - setting up for local development"
        print_info "Using PostgreSQL port 5433 and docker-compose.yml configuration"
    fi
    
    print_info "This script will set up a complete PostgreSQL database with pgvector for MDM data cleansing."
    print_info "The database will be created in Docker containers for easy management."
    echo ""
    
    check_docker
    check_node
    install_dependencies
    stop_existing_containers
    start_database
    start_redis
    verify_database
    seed_database
    create_env_file
    
    echo ""
    print_success "Database setup completed successfully!"
    echo ""
    
    print_connection_info
    test_api_health
    
    echo ""
    print_success "You can now start the Next.js application with: npm run dev"
    print_info "The application will be available at: https://datacleanse.sliplane.app"
    print_info "Database admin tools can connect using the credentials above"
    echo ""
}

# Handle script interruption
trap 'echo -e "\n${RED}Setup interrupted by user${NC}"; exit 1' INT

# Run main function
main "$@"