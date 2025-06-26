#!/bin/bash

# Deploy Master Data Cleanse UI to Azure Container Instances
# This script builds and deploys the actual Next.js application

set -e  # Exit on any error

# Configuration
RESOURCE_GROUP="RG_DAI_S01"
LOCATION="westus2"
ACR_NAME="mdmcleansecr"
CONTAINER_NAME="mdm-ui"
IMAGE_NAME="mdm-master-data-cleanse-ui"
IMAGE_TAG="latest"
DNS_LABEL="mdm-ui-app"
PORT=3000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment of Master Data Cleanse UI...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root directory.${NC}"
    exit 1
fi

# Check if Next.js project
cd ..
if ! grep -q "next" package.json; then
    echo -e "${RED}❌ Error: This doesn't appear to be a Next.js project.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "  Resource Group: ${RESOURCE_GROUP}"
echo -e "  Location: ${LOCATION}"
echo -e "  ACR Name: ${ACR_NAME}"
echo -e "  Container Name: ${CONTAINER_NAME}"
echo -e "  Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo -e "  DNS Label: ${DNS_LABEL}"
echo -e "  Port: ${PORT}"
echo ""

# Create build directory
BUILD_DIR="mdm-ui-build"
echo -e "${YELLOW}📁 Creating build directory: ${BUILD_DIR}${NC}"
mkdir -p "${BUILD_DIR}"

# Copy application files
echo -e "${YELLOW}📂 Copying application files...${NC}"
cp -r src "${BUILD_DIR}/"
cp -r public "${BUILD_DIR}/"
cp package.json "${BUILD_DIR}/"
cp package-lock.json "${BUILD_DIR}/" 2>/dev/null || echo "No package-lock.json found"
cp next.config.ts "${BUILD_DIR}/"
cp tailwind.config.ts "${BUILD_DIR}/"
cp postcss.config.mjs "${BUILD_DIR}/"
cp tsconfig.json "${BUILD_DIR}/"
cp components.json "${BUILD_DIR}/" 2>/dev/null || echo "No components.json found"

# Copy environment files if they exist
[ -f ".env" ] && cp .env "${BUILD_DIR}/"
[ -f ".env.local" ] && cp .env.local "${BUILD_DIR}/"
[ -f ".env.production" ] && cp .env.production "${BUILD_DIR}/"

# Create optimized Dockerfile for Next.js
echo -e "${YELLOW}🐳 Creating optimized Dockerfile...${NC}"
cat > "${BUILD_DIR}/Dockerfile" << 'EOF'
# Multi-stage build for Next.js application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --only=production; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
EOF

# Update next.config.ts for standalone output
echo -e "${YELLOW}⚙️ Updating Next.js config for standalone build...${NC}"
cat > "${BUILD_DIR}/next.config.ts" << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Enable experimental features if needed
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Add any other configuration you need
  images: {
    domains: [
      'upload.wikimedia.org',
      'placehold.co'
    ],
  },
};

export default nextConfig;
EOF

# Create .dockerignore
echo -e "${YELLOW}📝 Creating .dockerignore...${NC}"
cat > "${BUILD_DIR}/.dockerignore" << 'EOF'
Dockerfile
.dockerignore
node_modules
npm-debug.log
README.md
.env
.env.local
.env.production.local
.env.staging
.git
.gitignore
.next
.vercel
coverage
.nyc_output
*.log
.DS_Store
.vscode
.idea
EOF

# Create environment file for production
echo -e "${YELLOW}🔧 Creating production environment configuration...${NC}"
cat > "${BUILD_DIR}/.env.production" << 'EOF'
# Production environment for Azure deployment
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Database configuration (using the deployed PostgreSQL)
DATABASE_URL=postgresql://postgres:mdm_password123@mdm-postgres-pgvector.westus2.azurecontainer.io:5432/mdm_dedup

# Application configuration
NEXT_PUBLIC_APP_URL=https://mdm-ui-app.westus2.azurecontainer.io
PORT=3000

# AI Configuration (if needed)
# ANTHROPIC_API_KEY=your_key_here
# OPENAI_API_KEY=your_key_here
EOF

echo -e "${GREEN}✅ Build files prepared successfully${NC}"

# Get ACR login server
echo -e "${YELLOW}🔐 Getting ACR credentials...${NC}"
ACR_LOGIN_SERVER=$(az acr show --name ${ACR_NAME} --query loginServer --output tsv)
if [ -z "$ACR_LOGIN_SERVER" ]; then
    echo -e "${RED}❌ Failed to get ACR login server${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ACR Login Server: ${ACR_LOGIN_SERVER}${NC}"

# Build and push image using az acr build (no Docker required)
echo -e "${YELLOW}🏗️ Building and pushing image to ACR...${NC}"
az acr build \
    --registry ${ACR_NAME} \
    --image ${IMAGE_NAME}:${IMAGE_TAG} \
    --file "${BUILD_DIR}/Dockerfile" \
    "${BUILD_DIR}"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build and push image${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Image built and pushed successfully${NC}"

# Deploy to Azure Container Instances
echo -e "${YELLOW}🚀 Deploying to Azure Container Instances...${NC}"

# Get ACR credentials for container deployment
ACR_USERNAME=$(az acr credential show --name ${ACR_NAME} --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name ${ACR_NAME} --query passwords[0].value --output tsv)

az container create \
    --resource-group ${RESOURCE_GROUP} \
    --name ${CONTAINER_NAME} \
    --image ${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG} \
    --registry-login-server ${ACR_LOGIN_SERVER} \
    --registry-username ${ACR_USERNAME} \
    --registry-password ${ACR_PASSWORD} \
    --dns-name-label ${DNS_LABEL} \
    --ports ${PORT} \
    --os-type Linux \
    --cpu 2 \
    --memory 4 \
    --environment-variables \
        NODE_ENV=production \
        NEXT_TELEMETRY_DISABLED=1 \
        DATABASE_URL="postgresql://postgres:mdm_password123@mdm-postgres-pgvector.westus2.azurecontainer.io:5432/mdm_dedup" \
        PORT=${PORT} \
    --location ${LOCATION}

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Master Data Cleanse UI deployed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Deployment Details:${NC}"
    echo -e "  🌐 Application URL: ${GREEN}https://${DNS_LABEL}.${LOCATION}.azurecontainer.io${NC}"
    echo -e "  🐳 Container Name: ${CONTAINER_NAME}"
    echo -e "  🏷️  Image: ${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"
    echo -e "  📍 Location: ${LOCATION}"
    echo -e "  💾 Database: mdm-postgres-pgvector.westus2.azurecontainer.io:5432"
    echo ""
    echo -e "${YELLOW}⏳ Note: It may take 2-3 minutes for the application to fully start.${NC}"
    echo -e "${YELLOW}🔍 You can check the status with:${NC}"
    echo -e "   az container show --resource-group ${RESOURCE_GROUP} --name ${CONTAINER_NAME} --query instanceView.state"
    echo ""
    echo -e "${BLUE}📊 To view logs:${NC}"
    echo -e "   az container logs --resource-group ${RESOURCE_GROUP} --name ${CONTAINER_NAME}"
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
else
    echo -e "${RED}❌ Failed to deploy container${NC}"
    exit 1
fi

# Clean up build directory
echo -e "${YELLOW}🧹 Cleaning up build directory...${NC}"
rm -rf "${BUILD_DIR}"

echo -e "${GREEN}🎯 All done! Your Master Data Cleanse UI is now running in Azure!${NC}"
EOF 