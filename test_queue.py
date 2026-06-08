import json
import subprocess

data = json.dumps({
    "collectionId": "test-cov-001",
    "url": "https://github.com/moyuwudao/linkchest-new-",
    "userId": "test-user",
    "retryCount": 0
})

r = subprocess.run(
    ["redis-cli", "lpush", "lc:metadata:queue", data],
    capture_output=True, text=True
)
print("Queued:", data)
print("Redis reply:", r.stdout.strip())
