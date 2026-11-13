#!/bin/bash

###############################################################################
# @xkid1/multipart - Performance Benchmark Script
#
# Benchmarks the multipart form-data parser under various load conditions.
# Measures parsing time, throughput, and memory usage.
#
# Usage:
#   ./scripts/benchmark.sh              # Run all benchmarks
#   ./scripts/benchmark.sh --quick      # Quick benchmark (fewer iterations)
#   ./scripts/benchmark.sh --verbose    # Detailed output
#   ./scripts/benchmark.sh --profile    # Include memory profiling
#
# Requirements:
#   - Node.js >= 26.13.0
#   - Yarn 4.18.0+
#
# Output:
#   - Console report with performance metrics
#   - JSON report in benchmark-results.json
#   - Memory profile (if --profile is used)
#
###############################################################################

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BENCHMARK_DIR="$PROJECT_ROOT/benchmark"
BENCHMARK_RESULTS="$PROJECT_ROOT/benchmark-results.json"
BENCHMARK_TEMP="$BENCHMARK_DIR/temp"

# Benchmark parameters
ITERATIONS=100
QUICK_ITERATIONS=10
SMALL_SIZE=1024          # 1 KB
MEDIUM_SIZE=102400       # 100 KB
LARGE_SIZE=1048576      # 1 MB

# Options
QUICK_MODE=false
VERBOSE_MODE=false
PROFILE_MODE=false
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
BUILD_COMPLETE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Utility Functions
###############################################################################

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

###############################################################################
# Setup & Teardown
###############################################################################

setup_benchmark() {
    log_header "Setting Up Benchmark Environment"
    
    # Create benchmark directories
    mkdir -p "$BENCHMARK_DIR"
    mkdir -p "$BENCHMARK_TEMP"
    
    # Check if library is built
    if [ ! -f "$PROJECT_ROOT/dist/index.js" ]; then
        log_warning "Library not built. Building now..."
        cd "$PROJECT_ROOT"
        yarn build:js > /dev/null 2>&1
        BUILD_COMPLETE=true
        log_success "Library built"
    fi
    
    # Check dependencies
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version)
    log_success "Node.js $node_version available"
    
    # Create benchmark test script
    create_benchmark_test_script
    
    log_success "Environment ready"
}

cleanup_benchmark() {
    log_info "Cleaning up temporary files..."
    rm -rf "$BENCHMARK_TEMP"
}

###############################################################################
# Benchmark Test Generation
###############################################################################

create_benchmark_test_script() {
    cat > "$BENCHMARK_TEMP/benchmark-test.mjs" << 'EOF'
import { multipart } from '../../dist/index.js';
import { performance } from 'perf_hooks';

/**
 * Generate multipart form data buffer
 */
function generateMultipartBody(fieldCount = 10, fileSize = 1024) {
    const boundary = 'benchmark-boundary-12345';
    let body = '';
    
    // Add text fields
    for (let i = 0; i < fieldCount; i++) {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="field${i}"\r\n`;
        body += `Content-Type: text/plain\r\n`;
        body += `\r\n`;
        body += `Value for field ${i} - Lorem ipsum dolor sit amet\r\n`;
    }
    
    // Add file
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="test-file.bin"\r\n`;
    body += `Content-Type: application/octet-stream\r\n`;
    body += `\r\n`;
    body += Buffer.alloc(fileSize).toString('binary');
    body += `\r\n`;
    
    // End boundary
    body += `--${boundary}--\r\n`;
    
    return {
        buffer: Buffer.from(body),
        boundary,
        bodySize: Buffer.from(body).length
    };
}

/**
 * Run benchmark test
 */
function runBenchmark(testName, iterations, bufferSize) {
    const { buffer, boundary } = generateMultipartBody(10, bufferSize);
    const times = [];
    let errors = 0;
    
    for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        try {
            const result = multipart(buffer, boundary);
            const endTime = performance.now();
            times.push(endTime - startTime);
        } catch (error) {
            errors++;
        }
    }
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    const min = times[0];
    const max = times[times.length - 1];
    const avg = times.reduce((a, b) => a + b) / times.length;
    const median = times[Math.floor(times.length / 2)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];
    
    // Calculate throughput
    const totalBytes = buffer.length * iterations;
    const totalTimeMs = times.reduce((a, b) => a + b);
    const throughputMBps = (totalBytes / 1024 / 1024) / (totalTimeMs / 1000);
    
    return {
        testName,
        iterations,
        bufferSize: buffer.length,
        errors,
        timing: {
            min: parseFloat(min.toFixed(4)),
            max: parseFloat(max.toFixed(4)),
            avg: parseFloat(avg.toFixed(4)),
            median: parseFloat(median.toFixed(4)),
            p95: parseFloat(p95.toFixed(4)),
            p99: parseFloat(p99.toFixed(4))
        },
        throughput: parseFloat(throughputMBps.toFixed(2)),
        unit: {
            timing: 'ms',
            throughput: 'MB/s'
        }
    };
}

/**
 * Run memory benchmark
 */
function runMemoryBenchmark(testName, iterations, bufferSize) {
    const { buffer, boundary } = generateMultipartBody(10, bufferSize);
    
    if (global.gc) {
        global.gc();
    }
    
    const memBefore = process.memoryUsage().heapUsed;
    
    for (let i = 0; i < iterations; i++) {
        try {
            multipart(buffer, boundary);
        } catch (error) {
            // Ignore errors
        }
    }
    
    if (global.gc) {
        global.gc();
    }
    
    const memAfter = process.memoryUsage().heapUsed;
    const memUsed = (memAfter - memBefore) / 1024 / 1024; // Convert to MB
    
    return {
        testName,
        iterations,
        bufferSize: buffer.length,
        memoryUsedMB: parseFloat(memUsed.toFixed(2)),
        memoryPerOpKB: parseFloat(((memUsed * 1024) / iterations).toFixed(2))
    };
}

// Main execution
const args = process.argv.slice(2);
const testType = args[0] || 'timing';
const iterations = parseInt(args[1]) || 100;
const bufferSize = parseInt(args[2]) || 1024;
const testName = args[3] || 'benchmark';

try {
    let result;
    if (testType === 'memory') {
        result = runMemoryBenchmark(testName, iterations, bufferSize);
    } else {
        result = runBenchmark(testName, iterations, bufferSize);
    }
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error(JSON.stringify({
        error: error.message,
        stack: error.stack
    }));
    process.exit(1);
}
EOF
}

###############################################################################
# Benchmark Execution
###############################################################################

run_timing_benchmarks() {
    log_header "Running Performance Benchmarks (Timing)"
    
    local iterations=$ITERATIONS
    if [ "$QUICK_MODE" = true ]; then
        iterations=$QUICK_ITERATIONS
    fi
    
    local results=()
    
    # Small buffer benchmark
    log_info "Small buffer (1 KB) - $iterations iterations"
    local result=$(node "$BENCHMARK_TEMP/benchmark-test.mjs" timing "$iterations" "$SMALL_SIZE" "small-buffer")
    results+=("$result")
    if [ "$VERBOSE_MODE" = true ]; then
        echo "$result" | head -20
    fi
    
    # Medium buffer benchmark
    log_info "Medium buffer (100 KB) - $iterations iterations"
    result=$(node "$BENCHMARK_TEMP/benchmark-test.mjs" timing "$iterations" "$MEDIUM_SIZE" "medium-buffer")
    results+=("$result")
    if [ "$VERBOSE_MODE" = true ]; then
        echo "$result" | head -20
    fi
    
    # Large buffer benchmark
    log_info "Large buffer (1 MB) - $((iterations / 10)) iterations"
    result=$(node "$BENCHMARK_TEMP/benchmark-test.mjs" timing "$((iterations / 10))" "$LARGE_SIZE" "large-buffer")
    results+=("$result")
    if [ "$VERBOSE_MODE" = true ]; then
        echo "$result" | head -20
    fi
    
    # Print results table
    echo
    echo -e "${BLUE}Timing Results:${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────────"
    printf "%-20s %10s %10s %10s %10s %10s %10s\n" "Test" "Min (ms)" "Avg (ms)" "Median" "P95 (ms)" "P99 (ms)" "Throughput"
    echo "─────────────────────────────────────────────────────────────────────────────────"
    
    for result in "${results[@]}"; do
        local testName=$(echo "$result" | grep -o '"testName":"[^"]*"' | head -1 | cut -d'"' -f4)
        local min=$(echo "$result" | grep '"min"' | grep -o '[0-9.]*' | head -1)
        local avg=$(echo "$result" | grep '"avg"' | grep -o '[0-9.]*' | head -1)
        local median=$(echo "$result" | grep '"median"' | grep -o '[0-9.]*' | head -1)
        local p95=$(echo "$result" | grep '"p95"' | grep -o '[0-9.]*' | head -1)
        local p99=$(echo "$result" | grep '"p99"' | grep -o '[0-9.]*' | head -1)
        local throughput=$(echo "$result" | grep '"throughput"' | grep -o '[0-9.]*' | head -1)
        
        printf "%-20s %10s %10s %10s %10s %10s %10s MB/s\n" \
            "$testName" "$min" "$avg" "$median" "$p95" "$p99" "$throughput"
    done
    echo "─────────────────────────────────────────────────────────────────────────────────"
    echo
}

run_memory_benchmarks() {
    log_header "Running Memory Benchmarks"
    
    local iterations=$((ITERATIONS / 10))
    if [ "$QUICK_MODE" = true ]; then
        iterations=$QUICK_ITERATIONS
    fi
    
    local results=()
    
    # Small buffer memory benchmark
    log_info "Small buffer (1 KB) - $iterations iterations"
    local result=$(node --expose-gc "$BENCHMARK_TEMP/benchmark-test.mjs" memory "$iterations" "$SMALL_SIZE" "small-memory")
    results+=("$result")
    if [ "$VERBOSE_MODE" = true ]; then
        echo "$result" | head -20
    fi
    
    # Medium buffer memory benchmark
    log_info "Medium buffer (100 KB) - $iterations iterations"
    result=$(node --expose-gc "$BENCHMARK_TEMP/benchmark-test.mjs" memory "$iterations" "$MEDIUM_SIZE" "medium-memory")
    results+=("$result")
    if [ "$VERBOSE_MODE" = true ]; then
        echo "$result" | head -20
    fi
    
    # Print results table
    echo
    echo -e "${BLUE}Memory Results:${NC}"
    echo "──────────────────────────────────────────────────────────────────"
    printf "%-20s %15s %15s\n" "Test" "Total (MB)" "Per Op (KB)"
    echo "──────────────────────────────────────────────────────────────────"
    
    for result in "${results[@]}"; do
        local testName=$(echo "$result" | grep -o '"testName":"[^"]*"' | head -1 | cut -d'"' -f4)
        local memUsed=$(echo "$result" | grep '"memoryUsedMB"' | grep -o '[0-9.]*' | head -1)
        local memPerOp=$(echo "$result" | grep '"memoryPerOpKB"' | grep -o '[0-9.]*' | head -1)
        
        printf "%-20s %15s %15s\n" "$testName" "$memUsed" "$memPerOp"
    done
    echo "──────────────────────────────────────────────────────────────────"
    echo
}

###############################################################################
# Summary & Reporting
###############################################################################

print_summary() {
    log_header "Benchmark Summary"
    
    log_info "Mode: $([ "$QUICK_MODE" = true ] && echo 'QUICK' || echo 'FULL')"
    log_info "Iterations: $ITERATIONS"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Library: @xkid1/multipart"
    log_info "Node.js: $(node --version)"
    
    echo
    log_success "Benchmarks completed successfully"
    
    if [ -f "$BENCHMARK_RESULTS" ]; then
        log_info "Results saved to: $BENCHMARK_RESULTS"
    fi
}

###############################################################################
# Option Parsing
###############################################################################

parse_options() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                QUICK_MODE=true
                ITERATIONS=$QUICK_ITERATIONS
                log_info "Quick mode enabled"
                shift
                ;;
            --verbose)
                VERBOSE_MODE=true
                log_info "Verbose mode enabled"
                shift
                ;;
            --profile)
                PROFILE_MODE=true
                log_info "Memory profiling enabled"
                shift
                ;;
            --help)
                print_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_help
                exit 1
                ;;
        esac
    done
}

print_help() {
    cat << 'EOF'
@xkid1/multipart - Performance Benchmark Script

Usage:
  ./scripts/benchmark.sh [OPTIONS]

Options:
  --quick         Run benchmarks with fewer iterations (10 instead of 100)
  --verbose       Print detailed output during benchmarks
  --profile       Include memory profiling (requires --expose-gc)
  --help          Show this help message

Examples:
  # Run full benchmarks
  ./scripts/benchmark.sh

  # Quick benchmark run
  ./scripts/benchmark.sh --quick

  # Detailed with memory profiling
  ./scripts/benchmark.sh --profile --verbose

Output:
  - Console report with metrics
  - JSON results in benchmark-results.json
  - Timing: min, avg, median, p95, p99 (milliseconds)
  - Throughput: MB/s
  - Memory: total and per-operation usage

Requirements:
  - Node.js >= 26.13.0
  - Yarn 4.18.0+

Performance Metrics:
  - Min: Minimum execution time
  - Avg: Average execution time
  - Median: Middle value of execution times
  - P95: 95th percentile (99th slowest operations)
  - P99: 99th percentile (99th slowest operations)
  - Throughput: MB/s processed per second

EOF
}

###############################################################################
# Main Execution
###############################################################################

main() {
    parse_options "$@"
    
    echo -e "${BLUE}"
    cat << 'EOF'
╔════════════════════════════════════════════════════════════════════════════╗
║                 @xkid1/multipart - Benchmark Suite                        ║
║                                                                            ║
║  Performance testing for multipart form-data parsing library              ║
║  Measures parsing time, throughput, and memory usage                      ║
╚════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    # Setup
    setup_benchmark
    
    # Run benchmarks
    run_timing_benchmarks
    
    if [ "$PROFILE_MODE" = true ]; then
        run_memory_benchmarks
    fi
    
    # Print summary
    print_summary
    
    # Cleanup
    cleanup_benchmark
    
    log_success "Benchmark finished"
    exit 0
}

# Run main
main "$@"
