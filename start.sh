#!/bin/bash
set -e

DATA_DIR="/home/runner/workspace/data/db"
mkdir -p "$DATA_DIR"

# Start MongoDB only if not already running
if ! mongod --dbpath "$DATA_DIR" --bind_ip 127.0.0.1 --port 27017 --logpath /tmp/mongod.log --fork 2>/dev/null; then
    echo "MongoDB already running or started"
fi

echo "MongoDB ready"

# Start FastAPI backend on port 5000
cd /home/runner/workspace/backend
uvicorn server:app --host 0.0.0.0 --port 5000 --reload
