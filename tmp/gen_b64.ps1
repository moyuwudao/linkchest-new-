$content = Get-Content -Path 'D:\trae_projects\linkchest\tmp\inject_alipay_python.py' -Raw -Encoding UTF8
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
[System.IO.File]::WriteAllText('D:\trae_projects\linkchest\tmp\inject_alipay_python.py.b64', $b64, [System.Text.Encoding]::ASCII)
Write-Host ('len=' + $b64.Length)
