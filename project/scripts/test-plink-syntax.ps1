$content = [System.IO.File]::ReadAllText('C:\Users\Mayn\CodeBuddy\20260407184558\deploy-plink.ps1')
$errors = $null
[System.Management.Automation.PSParser]::Tokenize($content, [ref]$errors)
if ($errors.Count -gt 0) {
    Write-Host "Parse errors found: $($errors.Count)" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host ("Line " + $_.Token.StartLine + ": " + $_.Message) -ForegroundColor Yellow }
} else {
    Write-Host "No parse errors - syntax OK" -ForegroundColor Green
}
