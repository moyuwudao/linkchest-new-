$body = Get-Content -Raw 'D:\trae_projects\linkchest\body.json'
ssh ubuntu@43.136.82.88 "cat > /tmp/body.json <<'EOF'
$body
EOF
curl -s -X POST http://localhost:3001/auth/send-code -H 'Content-Type: application/json' -d @/tmp/body.json -w '\nSTATUS: %{http_code}\n'"
