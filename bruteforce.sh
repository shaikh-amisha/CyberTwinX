#!/bin/bash

echo "=== CyberTwinX Brute Force Simulation ==="

TARGET="127.0.0.1"
USER="cybertwin_test"

echo "[*] Generating failed SSH authentication attempts..."

for i in $(seq 1 15); do
    echo "Attempt $i/15"

    sshpass -p "WrongPassword123!" \
        ssh \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o PreferredAuthentications=password \
        -o PubkeyAuthentication=no \
        -o ConnectTimeout=2 \
        "$USER@$TARGET" \
        "exit" 2>/dev/null || true

    sleep 1
done

echo ""
echo "=== Simulation Complete ==="
echo "15 failed authentication attempts generated."
echo "Check CyberTwinX Dashboard for the live alert."
