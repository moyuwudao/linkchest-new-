const { spawnSync } = require('child_process');
const script = `#!/bin/bash
LOG=/home/ubuntu/.pm2/logs/linkchest-api-out.log
ERR=/home/ubuntu/.pm2/logs/linkchest-api-error.log
echo "=== ERROR log (last 30) ==="
tail -30 "$ERR"
echo ""
echo "=== Lines with 2026-06-12 19 (current) - errors and key info ==="
grep "2026-06-12 19:" "$LOG" | grep -E "error|ERROR|添加收藏|moderation|queue" | tail -30
echo ""
echo "=== Lines with 19:24-19:30 (during user actions) ==="
grep "2026-06-12 19:2[4-9]:" "$LOG" | tail -50
`;

const r = spawnSync('ssh', ['ubuntu@43.136.82.88', 'bash -s'], { input: script, encoding: 'utf8', timeout: 30000 });
console.log(r.stdout);
if (r.stderr) console.error(r.stderr);
