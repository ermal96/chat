#!/bin/sh
set -e

# Ensure data directory exists and has correct permissions
# This handles the case where a volume is mounted with root ownership
if [ -d "/app/data" ]; then
    # Check if we can write to the directory
    if ! touch /app/data/.write-test 2>/dev/null; then
        echo "Warning: Cannot write to /app/data, attempting to fix permissions..."
        # Only works if running as root
        if [ "$(id -u)" = "0" ]; then
            chown -R nodejs:nodejs /app/data
        fi
    else
        rm -f /app/data/.write-test
    fi
fi

# If running as root, switch to nodejs user
if [ "$(id -u)" = "0" ]; then
    exec su-exec nodejs "$@"
else
    exec "$@"
fi
