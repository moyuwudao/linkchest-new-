$src = 'D:\trae_projects\linkchest\tmp\inject_china_privkey.py'
$dst = 'D:\trae_projects\linkchest\tmp\inject_china_privkey.py.b64'
$content = Get-Content -Path $src -Raw -Encoding UTF8
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
[System.IO.File]::WriteAllText($dst, $b64, [System.Text.Encoding]::ASCII)
Write-Host ('len=' + $b64.Length)
