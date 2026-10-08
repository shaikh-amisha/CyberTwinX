#!/bin/bash

TARGET="127.0.0.1"

for USER in cybertwin_test1 cybertwin_test2 cybertwin_test3; do
    for i in $(seq 1 4); do
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
done
