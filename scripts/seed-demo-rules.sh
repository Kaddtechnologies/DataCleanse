#!/bin/bash

# Seed Demo Rules Script
# Populates the database with predefined business rules for the demo

echo "🚀 Seeding predefined business rules for demo..."

# Check if PostgreSQL is running
if ! nc -z localhost 5433 2>/dev/null; then
    echo "❌ PostgreSQL is not running on port 5433"
    echo "Please start the database first"
    exit 1
fi

# Run the seed script
echo "📊 Running seed script..."
PGPASSWORD=mdm_password123 psql -h localhost -p 5433 -U mdm_user -d mdm_dedup -f scripts/seed-predefined-rules.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully seeded predefined business rules!"
    echo ""
    echo "The following rules are now available in the Rule Library:"
    echo "• Joint Venture & Strategic Partnership Detection (94.2%)"
    echo "• Energy Company Division Legitimacy Detection (96.7%)"
    echo "• Freight Forwarder & Intermediate Consignee Exemption (98.1%)"
    echo ""
    echo "🎯 Demo ready! Visit /rules-sandbox/library to see the rules."
else
    echo "❌ Failed to seed database"
    exit 1
fi 