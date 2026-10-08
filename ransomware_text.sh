#!/bin/bash

set -e

TEST_DIR="/tmp/cybertwin-monitor"

echo "=========================================="
echo " CyberTwinX Ransomware Detection Test"
echo "=========================================="
echo ""

mkdir -p "$TEST_DIR"

echo "[1/4] Creating test files..."

for i in $(seq 1 30); do
    echo "CyberTwinX ransomware simulation $i" \
        > "$TEST_DIR/document_$i.txt"
done

echo "Created 30 files."
echo "Waiting for agent telemetry..."
sleep 12

echo ""
echo "[2/4] Simulating mass file modification..."

for file in "$TEST_DIR"/*.txt; do
    echo "SIMULATED_ENCRYPTION_MARKER" >> "$file"
done

echo "Modified 30 files."
echo "Waiting for agent telemetry..."
sleep 12

echo ""
echo "[3/4] Simulating mass file rename..."

for file in "$TEST_DIR"/*.txt; do
    mv "$file" "${file%.txt}.locked"
done

echo "Renamed 30 files to .locked."
echo "Waiting for agent telemetry..."
sleep 12

echo ""
echo "[4/4] Creating additional renamed files..."

for i in $(seq 31 50); do
    echo "CyberTwinX additional test $i" \
        > "$TEST_DIR/document_$i.tmp"

    mv "$TEST_DIR/document_$i.tmp" \
       "$TEST_DIR/document_$i.locked"
done

echo "Created and renamed another 20 files."

echo ""
echo "=========================================="
echo " TEST COMPLETE"
echo "=========================================="
echo ""
echo "Test directory:"
echo "$TEST_DIR"
echo ""
echo "50 files were simulated."
echo "No real encryption was performed."
echo "No system files were touched."
echo ""
echo "Check CyberTwinX now."
