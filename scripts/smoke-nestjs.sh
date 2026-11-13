#!/bin/bash

# Smoke Test: @xkid1/multipart with NestJS
# Verifies the library works correctly with NestJS-like middleware pattern
# (Uses express since full NestJS decorators need TypeScript compilation)

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
TEST_DIR="${PROJECT_ROOT}/test-nestjs-app"
PORT=3002
HOST="localhost"

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     @xkid1/multipart - NestJS Pattern Smoke Test                  ║${NC}"
echo -e "${BLUE}║                                                                    ║${NC}"
echo -e "${BLUE}║  Tests library with NestJS-like middleware pattern                ║${NC}"
echo -e "${BLUE}║  - File upload controller                                          ║${NC}"
echo -e "${BLUE}║  - Multiple file uploads                                           ║${NC}"
echo -e "${BLUE}║  - Form fields with files                                          ║${NC}"
echo -e "${BLUE}║  - Middleware integration                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}ℹ Cleaning up...${NC}"
  
  # Kill server if running
  if [ ! -z "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${YELLOW}ℹ Stopping NestJS-pattern server (PID: $SERVER_PID)...${NC}"
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

# Step 2: Create test NestJS-pattern app
echo -e "\n${YELLOW}=== Step 2: Creating NestJS-Pattern Application ===${NC}"

mkdir -p "$TEST_DIR"
echo -e "${GREEN}✓ Created test directory${NC}"

# Create package.json
cat > "${TEST_DIR}/package.json" << 'EOF'
{
  "name": "multipart-nestjs-pattern-test",
  "version": "1.0.0",
  "type": "module",
  "description": "Test NestJS-pattern with @xkid1/multipart",
  "main": "src/main.mjs",
  "scripts": {
    "start": "node src/main.mjs"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

echo -e "${GREEN}✓ Created package.json${NC}"

# Create NestJS-pattern application using express
mkdir -p "${TEST_DIR}/src"

cat > "${TEST_DIR}/src/upload.controller.mjs" << 'CONTROLLEREOF'
// NestJS-style controller pattern
export class UploadController {
  async uploadSingle(req, res) {
    try {
      const files = Object.keys(req.files);
      
      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const fileKey = files[0];
      const file = req.files[fileKey];

      res.status(201).json({
        success: true,
        message: 'Single file uploaded successfully',
        file: {
          fieldName: fileKey,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async uploadMultiple(req, res) {
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

      res.status(201).json({
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
  }

  async uploadMixed(req, res) {
    try {
      const textFields = {};
      const uploadedFiles = {};

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

      res.status(201).json({
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
  }
}
CONTROLLEREOF

echo -e "${GREEN}✓ Created upload controller${NC}"

# Create main application file with NestJS-pattern routing
cat > "${TEST_DIR}/src/main.mjs" << 'MAINEOF'
import express from 'express';
import { multipart } from '../../dist/index.js';
import { UploadController } from './upload.controller.mjs';

const app = express();
const controller = new UploadController();

// NestJS-pattern middleware for multipart parsing
const multipartMiddleware = (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return next();
  }

  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  let rawData = Buffer.alloc(0);
  const maxSize = 100 * 1024 * 1024;

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
      const contentType = req.headers['content-type'];
      const boundaryMatch = contentType.match(/boundary=([^;\s]+)/);
      
      if (!boundaryMatch) {
        return res.status(400).json({
          success: false,
          error: 'No boundary found in content-type header'
        });
      }

      const boundary = boundaryMatch[1].replace(/"/g, '');
      const parsedData = multipart(rawData, boundary);

      req.body = {};
      req.files = {};

      Object.entries(parsedData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          req.body[key] = value;
        } else if (typeof value === 'object' && value !== null) {
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
};

// Apply middleware
app.use(multipartMiddleware);

// NestJS-style routes
app.post('/upload/single', (req, res) => controller.uploadSingle(req, res));
app.post('/upload/multiple', (req, res) => controller.uploadMultiple(req, res));
app.post('/upload/mixed', (req, res) => controller.uploadMixed(req, res));

// Start server
const server = app.listen(3002, 'localhost', () => {
  console.log('✓ NestJS-pattern server running at http://localhost:3002');
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
MAINEOF

echo -e "${GREEN}✓ Created main application${NC}"

# Create test script
cat > "${TEST_DIR}/run-tests.mjs" << 'TESTEOF'
import http from 'http';

const HOST = 'localhost';
const PORT = 3002;

let testsPassed = 0;
let testsFailed = 0;

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

async function testSingleFileUpload() {
  console.log('\n✓ Test 1: Single File Upload');
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

    if (response.status === 201 && response.body.success) {
      console.log(`  ✓ File uploaded: ${response.body.file.filename}`);
      console.log(`    - Size: ${response.body.file.size} bytes`);
      console.log(`    - MIME type: ${response.body.file.mimetype}`);
      testsPassed++;
      return true;
    } else {
      console.log(`  ✗ Upload failed (status: ${response.status})`);
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

async function testMultipleFileUpload() {
  console.log('\n✓ Test 2: Multiple File Upload');
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
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const response = await makeRequest(
      'POST',
      '/upload/multiple',
      multipartBody,
      { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    );

    if (response.status === 201 && response.body.success) {
      console.log(`  ✓ Multiple files uploaded: ${response.body.totalFiles} files`);
      response.body.files.forEach(f => {
        console.log(`    - ${f.filename} (${f.size} bytes)`);
      });
      testsPassed++;
      return true;
    } else {
      console.log(`  ✗ Multiple file upload failed (status: ${response.status})`);
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

async function testMixedFormData() {
  console.log('\n✓ Test 3: Mixed Form Data (Fields + Files)');
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

    if (response.status === 201 && response.body.success) {
      console.log('  ✓ Mixed form data processed');
      console.log(`    - Fields: ${Object.keys(response.body.fields).join(', ')}`);
      console.log(`    - Files: ${Object.keys(response.body.files).join(', ')}`);
      testsPassed++;
      return true;
    } else {
      console.log(`  ✗ Mixed form data failed (status: ${response.status})`);
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  NestJS-Pattern Multipart Integration Tests');
  console.log('='.repeat(60));

  console.log('\n⏳ Waiting for server to start...');
  let retries = 0;
  while (retries < 10) {
    try {
      await makeRequest('GET', '');
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

  await testSingleFileUpload();
  await testMultipleFileUpload();
  await testMixedFormData();

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

# Step 4: Start NestJS-pattern server
echo -e "\n${YELLOW}=== Step 4: Starting NestJS-Pattern Server ===${NC}"

cd "$TEST_DIR"
node src/main.mjs > server.log 2>&1 &
SERVER_PID=$!
cd - > /dev/null

echo -e "${GREEN}✓ NestJS-pattern server started (PID: $SERVER_PID)${NC}"

# Wait for server to start
sleep 2

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo -e "${RED}✗ Server failed to start${NC}"
  echo -e "${YELLOW}Server log:${NC}"
  cat "$TEST_DIR/server.log" 2>/dev/null || echo "No log available"
  exit 1
fi

echo -e "${GREEN}✓ Server is running on ${HOST}:${PORT}${NC}"

# Step 5: Run tests
echo -e "\n${YELLOW}=== Step 5: Running Integration Tests ===${NC}"

cd "$TEST_DIR"

if timeout 30 node run-tests.mjs; then
  RESULT=0
else
  RESULT=$?
  if [ $RESULT -eq 124 ]; then
    echo -e "${RED}✗ Tests timed out${NC}"
    RESULT=1
  fi
fi

cd - > /dev/null

# Step 6: Summary
echo -e "\n${YELLOW}=== Summary ===${NC}"

if [ $RESULT -eq 0 ]; then
  echo -e """
${GREEN}✓ NestJS-pattern integration tests passed!${NC}

Verified:
  ${GREEN}✓${NC} Middleware pattern works
  ${GREEN}✓${NC} Single file upload works
  ${GREEN}✓${NC} Multiple file uploads work
  ${GREEN}✓${NC} Form fields with files work
  ${GREEN}✓${NC} Controller pattern works

NestJS-Pattern Status: ${GREEN}READY${NC}
"""
else
  echo -e """
${RED}✗ Some NestJS-pattern tests failed${NC}

Check the test output above for details.
"""
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}\n"

exit $RESULT
