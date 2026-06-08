Start-Sleep -Seconds 5
Get-Process | Where-Object { $_.ProcessName -like '*wsl*' -or $_.ProcessName -like '*java*' -or $_.ProcessName -like '*gradle*' -or $_.ProcessName -like '*node*' } | Select-Object ProcessName, Id | Format-Table -AutoSize
