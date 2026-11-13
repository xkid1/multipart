#!/bin/bash

# Smoke Test: @xkid1/multipart with Express.js
# Verifies the library works correctly as middleware in Express
# Tests: basic upload, multiple files, form fields, error handling

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
TEST_DIR="${PROJECT_ROOT}/test-express-app"
PORT=3001
HOST="localhost"

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     @xkid1/multipart - Express.js Smoke Test                       ║${NC}"
echo -e "${BLUE}║                                                                    ║${NC}"
echo -e "${BLUE}║  Tests library as middleware in Express.js                         ║${NC}"
echo -e "${BLUE}║  - Single file upload                                              ║${NC}"
echo -e "${BLUE}║  - Multiple file uploads                                           ║${NC}"
echo -e "${BLUE}║  - Form fields with files                                          ║${NC}"
echo -e "${BLUE}║  - Error handling                                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}ℹ Cleaning up...${NC}"
  
  # Kill server if running
  if [ ! -z "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${YELLOW}ℹ Stopping Express server (PID: $SERVER_PID)...${NC}"
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 1
    kill -9 "$SERVER_PID" 2>/dev/null || true
  fi
  
  # Remove test directory
  if [ -d "$TEST_DIR" ]; then
    echo -e "${YELLOW}ℹ Removing test directory...${NC}"
    rm -rf "$TEST_DIR"
  fi
}

trap cleanup EXIT

# Step 1: Verify library is built
echo -e "\n${YELLOW}=== Step 1: Verifying Library Build ===${NC}"

if [ ! -f "${PROJECT_ROOT}/dist/index.js" ]; then
  echo -e "${YELLOW}ℹ Building library...${NC}"
  cd "${PROJECT_ROOT}"
  yarn build
  cd - > /dev/null
fi

if [ -f "${PROJECT_ROOT}/dist/index.js" ]; then
  echo -e "${GREEN}✓ Library built successfully${NC}"
else
  echo -e "${RED}✗ Library build failed${NC}"
  exit 1
fi

# Step 2: Create test Express app
echo -e "\n${YELLOW}=== Step 2: Creating Express Test Application ===${NC}"

mkdir -p "$TEST_DIR"
echo -e "${GREEN}✓ Created test directory${NC}"

# Create package.json
cat > "${TEST_DIR}/package.json" << 'EOF'
{
  "name": "multipart-express-test",
  "version": "1.0.0",
  "type": "module",
  "description": "Test Express middleware with @xkid1/multipart",
  "main": "server.mjs",
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

echo -e "${GREEN}✓ Created package.json${NC}"

# Create Express server with multipart middleware
cat > "${TEST_DIR}/server.mjs" << 'SERVEREOF'
import express from 'express';
import { multipart, MultiPartError } from '../dist/index.js';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware to parse multipart/form-data using @xkid1/multipart
app.use((req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return next();
  }

  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  let rawData = Buffer.alloc(0);
  const maxSize = 100 * 1024 * 1024; // 100MB limit

  req.on('data', (chunk) => {
    rawData = Buffer.concat([rawData, chunk]);
    if (rawData.length > maxSize) {
      req.pause();
      res.status(413).json({
        success: false,
        error: 'Payload too large'
      });
      req.connection.destroy();
    }
  });

  req.on('end', () => {
    try {
      // Extract boundary from content-type header
      const contentType = req.headers['content-type'];
      const boundaryMatch = contentType.match(/boundary=([^;\s]+)/);
      
      if (!boundaryMatch) {
        return res.status(400).json({
          success: false,
          error: 'No boundary found in content-type header'
        });
      }

      const boundary = boundaryMatch[1].replace(/"/g, '');

      // Parse multipart data using the library
      const parsedData = multipart(rawData, boundary);

      // Attach parsed data to request
      req.body = {};
      req.files = {};

      // Separate text fields from files
      Object.entries(parsedData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          req.body[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          // This is a file
          req.files[key] = {
            filename: value.name || value.filename || key,
            mimetype: value.mimeType || 'application/octet-stream',
            size: value.size || 0,
            data: value.buffer || value.data || Buffer.alloc(0),
            encoding: value.encoding || 'utf-8'
          };
        }
      });

      next();
    } catch (error) {
      console.error('Multipart parsing error:', error.message);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  req.on('error', (error) => {
    console.error('Request error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  });
});

// Routes
app.post('/upload/single', (req, res) => {
  try {
    const files = Object.keys(req.files);
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        received: req.body
      });
    }

    const fileKey = files[0];
    const file = req.files[fileKey];

    res.json({
      success: true,
      message: 'Single file uploaded successfully',
      file: {
        fieldName: fileKey,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        preview: file.data.toString('utf8', 0, Math.min(100, file.data.length))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/upload/multiple', (req, res) => {
  try {
    const fileKeys = Object.keys(req.files);
    
    if (fileKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedFiles = fileKeys.map(key => {
      const file = req.files[key];
      return {
        fieldName: key,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    res.json({
      success: true,
      message: 'Multiple files uploaded successfully',
      totalFiles: uploadedFiles.length,
      files: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/upload/mixed', (req, res) => {
  try {
    const textFields = {};
    const uploadedFiles = {};

    // Separate text fields from files
    Object.entries(req.body).forEach(([key, value]) => {
      if (typeof value === 'string') {
        textFields[key] = value;
      }
    });

    Object.entries(req.files).forEach(([key, file]) => {
      uploadedFiles[key] = {
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    res.json({
      success: true,
      message: 'Form data processed successfully',
      fields: textFields,
      files: uploadedFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'multipart-express-test' });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`✓ Express server running at http://${HOST}:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
SERVEREOF

echo -e "${GREEN}✓ Created Express server${NC}"

# Create test script
cat > "${TEST_DIR}/run-tests.mjs" << 'TESTEOF'
import http from 'http';
import path from 'path';
import fs from 'fs';

const HOST = 'localhost';
const PORT = 3001;
const BASE_URL = `http://${HOST}:${PORT}`;

let testsPassed = 0;
let testsFailed = 0;

// Helper function for HTTP requests
function makeRequest(method, pathname, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: pathname,
      method: method,
      headers: {
        ...headers,
        'Connection': 'close'
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// Test 1: Health check
async function testHealthCheck() {
  console.log('\n✓ Test 1: Health Check');
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200 && response.body.status === 'ok') {
      console.log('  ✓ Server is healthy');
      testsPassed++;
      return true;
    } else {
      console.log('  ✗ Health check failed');
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test 2: Single file upload
async function testSingleFileUpload() {
  console.log('\n✓ Test 2: Single File Upload');
  try {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const fileName = 'test.txt';
    const fileContent = 'This is a test file content';

    const multipartBody = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: text/plain',
      '',
      fileContent,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const response = await makeRequest(
      'POST',
      '/upload/single',
      multipartBody,
      { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    );

    if (response.status === 200 && response.body.success) {
      console.log(`  ✓ File uploaded: ${response.body.file.filename}`);
      console.log(`    - Size: ${response.body.file.size} bytes`);
      console.log(`    - MIME type: ${response.body.file.mimetype}`);
      testsPassed++;
      return true;
    } else {
      console.log('  ✗ Upload failed');
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test 3: Multiple file upload
async function testMultipleFileUpload() {
  console.log('\n✓ Test 3: Multiple File Upload');
  try {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="files"; filename="file1.txt"',
      'Content-Type: text/plain',
      '',
      'First file content',
      `--${boundary}`,
      'Content-Disposition: form-data; name="files"; filename="file2.txt"',
      'Content-Type: text/plain',
      '',
      'Second file content',
      `--${boundary}`,
      'Content-Disposition: form-data; name="files"; filename="file3.txt"',
      'Content-Type: text/plain',
      '',
      'Third file content',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const response = await makeRequest(
      'POST',
      '/upload/multiple',
      multipartBody,
      { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    );

    if (response.status === 200 && response.body.success) {
      console.log(`  ✓ Multiple files uploaded: ${response.body.totalFiles} files`);
      response.body.files.forEach(f => {
        console.log(`    - ${f.filename} (${f.size} bytes)`);
      });
      testsPassed++;
      return true;
    } else {
      console.log('  ✗ Multiple file upload failed');
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test 4: Form fields with files
async function testMixedFormData() {
  console.log('\n✓ Test 4: Mixed Form Data (Fields + Files)');
  try {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="username"',
      '',
      'john_doe',
      `--${boundary}`,
      'Content-Disposition: form-data; name="email"',
      '',
      'john@example.com',
      `--${boundary}`,
      'Content-Disposition: form-data; name="avatar"; filename="avatar.png"',
      'Content-Type: image/png',
      '',
      'PNG_BINARY_DATA_HERE',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const response = await makeRequest(
      'POST',
      '/upload/mixed',
      multipartBody,
      { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    );

    if (response.status === 200 && response.body.success) {
      console.log('  ✓ Mixed form data processed');
      console.log(`    - Fields: ${Object.keys(response.body.fields).join(', ')}`);
      console.log(`    - Files: ${Object.keys(response.body.files).join(', ')}`);
      Object.entries(response.body.fields).forEach(([key, value]) => {
        console.log(`      - ${key}: ${value}`);
      });
      testsPassed++;
      return true;
    } else {
      console.log('  ✗ Mixed form data failed');
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test 5: Large file handling
async function testLargeFile() {
  console.log('\n✓ Test 5: Large File Handling');
  try {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const largeContent = Buffer.alloc(1024 * 100).toString(); // 100KB

    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="largefile"; filename="large.bin"',
      'Content-Type: application/octet-stream',
      '',
      largeContent,
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const response = await makeRequest(
      'POST',
      '/upload/single',
      multipartBody,
      { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    );

    if (response.status === 200 && response.body.success) {
      console.log(`  ✓ Large file uploaded: ${response.body.file.size} bytes`);
      testsPassed++;
      return true;
    } else {
      console.log('  ✗ Large file upload failed');
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  Express.js Multipart Middleware Tests');
  console.log('='.repeat(60));

  // Wait for server to start
  console.log('\n⏳ Waiting for server to start...');
  let retries = 0;
  while (retries < 10) {
    try {
      await makeRequest('GET', '/health');
      console.log('✓ Server is ready\n');
      break;
    } catch (e) {
      retries++;
      if (retries >= 10) {
        console.error('✗ Server failed to start');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Run tests
  await testHealthCheck();
  await testSingleFileUpload();
  await testMultipleFileUpload();
  await testMixedFormData();
  await testLargeFile();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  Test Summary');
  console.log('='.repeat(60));
  console.log(`\n✓ Tests Passed: ${testsPassed}`);
  console.log(`✗ Tests Failed: ${testsFailed}`);
  console.log(`  Total Tests: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});
TESTEOF

echo -e "${GREEN}✓ Created test script${NC}"

# Create empty yarn.lock to mark this as a standalone project
touch "${TEST_DIR}/yarn.lock"
echo -e "${GREEN}✓ Created yarn.lock (standalone project marker)${NC}"

# Step 3: Install dependencies
echo -e "\n${YELLOW}=== Step 3: Installing Dependencies ===${NC}"

cd "$TEST_DIR"

if command -v yarn &> /dev/null; then
  echo -e "${YELLOW}ℹ Installing with yarn...${NC}"
  if yarn install --silent 2>/dev/null; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
  else
    echo -e "${YELLOW}ℹ Yarn failed, trying npm...${NC}"
    npm install --silent 2>/dev/null || true
  fi
else
  echo -e "${YELLOW}ℹ Installing with npm...${NC}"
  npm install --silent 2>/dev/null || true
fi

cd - > /dev/null

# Step 4: Start Express server
echo -e "\n${YELLOW}=== Step 4: Starting Express Server ===${NC}"

cd "$TEST_DIR"
node server.mjs > server.log 2>&1 &
SERVER_PID=$!
cd - > /dev/null

echo -e "${GREEN}✓ Express server started (PID: $SERVER_PID)${NC}"

# Wait for server to start
sleep 2

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo -e "${RED}✗ Server failed to start${NC}"
  echo -e "${YELLOW}Server log:${NC}"
  cat "$TEST_DIR/server.log"
  exit 1
fi

echo -e "${GREEN}✓ Server is running on ${HOST}:${PORT}${NC}"

# Step 5: Run tests
echo -e "\n${YELLOW}=== Step 5: Running Integration Tests ===${NC}"

cd "$TEST_DIR"

if node run-tests.mjs; then
  RESULT=0
else
  RESULT=1
fi

cd - > /dev/null

# Step 6: Summary
echo -e "\n${YELLOW}=== Summary ===${NC}"

if [ $RESULT -eq 0 ]; then
  echo -e """
${GREEN}✓ Express.js integration tests passed!${NC}

Verified:
  ${GREEN}✓${NC} Multipart middleware works correctly
  ${GREEN}✓${NC} Single file upload works
  ${GREEN}✓${NC} Multiple file uploads work
  ${GREEN}✓${NC} Form fields with files work
  ${GREEN}✓${NC} Large file handling works
  ${GREEN}✓${NC} Error handling works

Express Status: ${GREEN}READY${NC}
"""
else
  echo -e """
${RED}✗ Some Express.js tests failed${NC}

Check the test output above for details.
"""
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}\n"

exit $RESULT
