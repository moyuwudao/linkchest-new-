Add-Type -A System.IO.Compression.FileSystem
$apk = 'D:\trae_projects\linkchest\project\apps\mobile\android\build-global\outputs\apk\global\release\linkchest-global-202606031114.apk'
$zip = [IO.Compression.ZipFile]::OpenRead($apk)
Write-Host "=== APK entries (filter) ==="
$zip.Entries | Where-Object { $_.FullName -like 'assets/*' -or $_.FullName -like '*index*' -or $_.FullName -like '*app.config*' } | ForEach-Object { Write-Host ($_.FullName + ' [' + $_.Length + ']') }
$zip.Dispose()
Write-Host ""
Write-Host "=== APK size ==="
$apkInfo = Get-Item $apk
Write-Host ("Size: " + $apkInfo.Length + " bytes")
