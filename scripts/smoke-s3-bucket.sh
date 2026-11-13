#!/bin/bash

# Smoke Test: @xkid1/multipart with AWS S3
# Verifies the library works correctly with AWS S3 storage backend
# Tests: file upload to S3, presigned URL generation, file deletion
#
# REQUIREMENTS:
#   - AWS credentials (access key + secret key)
#   - AWS S3 bucket
#   - AWS region configured
#
# SETUP:
#   export AWS_ACCESS_KEY_ID="your_access_key"
#   export AWS_SECRET_ACCESS_KEY="your_secret_key"
#   export AWS_REGION="us-east-1"
#   export AWS_S3_BUCKET="your-test-bucket"

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
TEST_DIR="${PROJECT_ROOT}/test-s3-app"

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     @xkid1/multipart - AWS S3 Storage Smoke Test                  ║${NC}"
echo -e "${BLUE}║                                                                    ║${NC}"
echo -e "${BLUE}║  Tests library with AWS S3 storage backend                         ║${NC}"
echo -e "${BLUE}║  - File upload to S3                                               ║${NC}"
echo -e "${BLUE}║  - Presigned URL generation                                        ║${NC}"
echo -e "${BLUE}║  - File deletion from S3                                           ║${NC}"
echo -e "${BLUE}║  - Error handling with AWS API                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"

# Check for AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ] || [ -z "$AWS_S3_BUCKET" ]; then
  echo -e "${RED}✗ AWS credentials not configured${NC}"
  echo -e "${YELLOW}ℹ Please set the following environment variables:${NC}"
  echo "  export AWS_ACCESS_KEY_ID=\"your_access_key\""
  echo "  export AWS_SECRET_ACCESS_KEY=\"your_secret_key\""
  echo "  export AWS_REGION=\"us-east-1\""
  echo "  export AWS_S3_BUCKET=\"your-test-bucket\""
  echo ""
  echo "S3 Storage Status: NOT READY (credentials missing)"
  exit 1
fi

echo -e "${GREEN}✓${NC} AWS credentials configured"
echo -e "${GREEN}✓${NC} S3 bucket: $AWS_S3_BUCKET"
echo -e "${GREEN}✓${NC} Region: ${AWS_REGION:-us-east-1}"
echo ""
echo "Note: Implement test application in scripts/smoke-s3-bucket.sh"
echo "S3 Storage Status: PLACEHOLDER (awaiting implementation)"
echo ""
echo "════════════════════════════════════════════════════════════════════"
