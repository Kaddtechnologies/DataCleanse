#!/bin/bash

# Database CRUD Test Runner
# This script starts the Next.js dev server and runs comprehensive database tests

echo "🚀 Starting Database CRUD Test Suite"
echo "======================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in the project root directory. Please run from the MDM Master Data Cleanse directory."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for server to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url/api/health" > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - Server not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Server failed to start within expected time"
    return 1
}

# Check if server is already running on port 3000
if check_port 3000; then
    echo "📍 Port 3000 is available. Starting Next.js server..."
    
    # Start the Next.js development server in background
    echo "🔄 Starting Next.js development server..."
    npm run dev:noopen &
    SERVER_PID=$!
    
    # Give the server time to start
    if wait_for_server "http://localhost:3000"; then
        echo "✅ Next.js server started successfully (PID: $SERVER_PID)"
        SERVER_STARTED_BY_SCRIPT=true
    else
        echo "❌ Failed to start Next.js server"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
else
    echo "📍 Port 3000 is already in use. Assuming server is already running..."
    
    # Test if the server is our Next.js app
    if wait_for_server "http://localhost:3000"; then
        echo "✅ Server on port 3000 is responding"
        SERVER_STARTED_BY_SCRIPT=false
    else
        echo "❌ Server on port 3000 is not responding to health checks"
        echo "   Please ensure the Next.js development server is running on port 3000"
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    if [ "$SERVER_STARTED_BY_SCRIPT" = true ] && [ ! -z "$SERVER_PID" ]; then
        echo ""
        echo "🛑 Stopping Next.js server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if kill -0 $SERVER_PID 2>/dev/null; then
            echo "   Force stopping server..."
            kill -9 $SERVER_PID 2>/dev/null
        fi
        echo "✅ Server stopped"
    fi
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Wait a moment for server to fully initialize
echo "⏱️  Allowing server to fully initialize..."
sleep 3

# Run the comprehensive CRUD tests
echo ""
echo "🧪 Running Database CRUD Tests..."
echo "=================================="

if node scripts/test-database-crud.js; then
    echo ""
    echo "🎉 All tests completed successfully!"
    echo "✅ Database CRUD operations are fully functional"
    
    # Ask if user wants to clean up test data
    echo ""
    read -p "🧹 Would you like to clean up test data from the database? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🧹 Test data cleanup would be implemented here"
        echo "   (Requires implementing DELETE endpoints for sessions)"
    else
        echo "📝 Test data left in database for review"
    fi
    
    exit 0
else
    echo ""
    echo "❌ Some tests failed!"
    echo "🔍 Please review the test output above for details"
    echo "🔧 Database may need fixes before production use"
    exit 1
fi