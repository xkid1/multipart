#!/bin/bash

# Smoke Test: @xkid1/multipart with Azure Blob Storage
# Verifies the library works correctly with Azure Blob Storage backend
# Tests: file upload to Azure, SAS URL generation, file deletion
#
# REQUIREMENTS:
#   - Azure Storage Account
#   - Azure Storage Connection String or credentials
#   - Azure Blob Container
#
# SETUP:
#   export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
#   export AZURE_STORAGE_CONTAINER="test-uploads"

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DIR="${PROJECT_ROOT}/test-azure-app"

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  @xkid1/multipart - Azure Blob Storage Smoke Test                 ║${NC}"
echo -e "${BLUE}║                                                                    ║${NC}"
echo -e "${BLUE}║  Tests library with Azure Blob Storage backend                    ║${NC}"
echo -e "${BLUE}║  - File upload to Azure Blob Storage                               ║${NC}"
echo -e "${BLUE}║  - SAS URL generation                                              ║${NC}"
echo -e "${BLUE}║  - File deletion from Azure                                        ║${NC}"
echo -e "${BLUE}║  - Error handling with Azure API                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"

# Check for Azure credentials
if [ -z "$AZURE_STORAGE_CONNECTION_STRING" ] && [ -z "$AZURE_STORAGE_ACCOUNT_NAME" ]; then
  echo -e "${RED}✗ Azure credentials not configured${NC}"
  echo -e "${YELLOW}ℹ Please set one of the following:${NC}"
  echo ""
  echo "Option 1: Connection String (recommended)"
  echo "  export AZURE_STORAGE_CONNECTION_STRING=\"DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net\""
  echo ""
  echo "Option 2: Account Name + Key"
  echo "  export AZURE_STORAGE_ACCOUNT_NAME=\"your-storage-account\""
  echo "  export AZURE_STORAGE_ACCOUNT_KEY=\"your-account-key\""
  echo ""
  echo "And set container name:"
  echo "  export AZURE_STORAGE_CONTAINER=\"test-uploads\""
  echo ""
  echo "Azure Blob Storage Status: NOT READY (credentials missing)"
  exit 1
fi

echo -e "${GREEN}✓${NC} Azure credentials configured"
if [ ! -z "$AZURE_STORAGE_CONNECTION_STRING" ]; then
  echo -e "${GREEN}✓${NC} Using connection string"
fi
if [ ! -z "$AZURE_STORAGE_ACCOUNT_NAME" ]; then
  echo -e "${GREEN}✓${NC} Storage account: $AZURE_STORAGE_ACCOUNT_NAME"
fi
echo -e "${GREEN}✓${NC} Container: ${AZURE_STORAGE_CONTAINER:-uploads}"
echo ""
echo "Note: Implement test application in scripts/smoke-azure-blob.sh"
echo "Azure Blob Storage Status: PLACEHOLDER (awaiting implementation)"
echo ""
echo "════════════════════════════════════════════════════════════════════"
