#!/bin/bash
LOG=/home/ubuntu/.pm2/logs/linkchest-api-out.log
echo "=== POST /api/collections (create) recent 10 ==="
grep "request completed" "$LOG" | grep '"path":"/api/collections"' | tail -10
echo ""
echo "=== POST /api/collections/parse-url recent 10 ==="
grep "request completed" "$LOG" | grep '"path":"/api/collections/parse-url"' | tail -10
echo ""
echo "=== enqueue/queue logs recent 15 ==="
grep -E "enqueueMetadataFetch|metadata-queue|metadata]" "$LOG" | tail -15
