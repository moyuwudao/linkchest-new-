$body = '{"email":"test_verify@linkchest.net","lang":"zh"}'
$headers = @{'Content-Type'='application/json'}
try {
  $res = Invoke-WebRequest -Uri 'http://43.136.82.88:3001/auth/send-code' -Method POST -Headers $headers -Body $body -TimeoutSec 20 -UseBasicParsing
  Write-Output "STATUS: $($res.StatusCode)"
  Write-Output "BODY: $($res.Content)"
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output "RESP: $($reader.ReadToEnd())"
  }
}
