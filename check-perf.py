import subprocess

script = '''#!/bin/bash
LOG=/home/ubuntu/.pm2/logs/linkchest-api-out.log
echo "=== POST /api/collections (create) recent 10 ==="
grep "request completed" "$LOG" | grep '"path":"/api/collections"' | tail -10
echo ""
echo "=== POST /api/collections/parse-url recent 10 ==="
grep "request completed" "$LOG" | grep '"path":"/api/collections/parse-url"' | tail -10
echo ""
echo "=== enqueue/queue logs recent 15 ==="
grep -E "enqueueMetadataFetch|metadata-queue|metadata]" "$LOG" | tail -15
'''

# Write script locally first
with open(r'd:\trae_projects\linkchest\check-api-perf.sh', 'w', newline='\n') as f:
    f.write(script)

# Upload via scp-like approach: use ssh cat <<'EOF'
cmd = ['ssh', 'ubuntu@43.136.82.88', 'bash -s']
result = subprocess.run(cmd, input=script, capture_output=True, text=True, timeout=30)
print("STDOUT:")
print(result.stdout)
print("STDERR:")
print(result.stderr)
