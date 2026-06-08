# -*- coding: utf-8 -*-
# 支付宝沙箱配置 - base64 方式注入
# PowerShell 5 兼容：用 \\n 表示字面 \n（.env 转义需要）

$remoteHost = '43.157.240.68'
$envFile = '/opt/linkchest/api/project/apps/api/.env'

# 4 行沙箱配置（用 \\n 表示字面反斜杠+n 两个字符）
$nl = "`n"
$dq = [char]34
$payload = $nl +
    "# === Alipay Sandbox (added 2026-06-05) ===" + $nl +
    "ALIPAY_SANDBOX=true" + $nl +
    "ALIPAY_SANDBOX_APP_ID=9021000164646437" + $nl +
    "ALIPAY_SANDBOX_PRIVATE_KEY=" + $dq + "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCoWe1mB6v3YQc1KfZXAjf6gHWJap+0Df9Cl2mMzs2CjylaCaDWOgS8thHWawFCHHPss90enMA34Oy3wRcIP9Q3zpUluHH+4XWOexoFI/vNOa/+AjWN+QTaw0p+upgvAOUyFmozsLAvy6Y5++YfukEnax+OH/itgrofZ7DeoRw0dNaNvAKmliqCwLa/unNAG4NvmD4OYFgT1wDKt0d7GCq/I2IXugmNWN2IU51XybConZy+yiPcDxdrjIDxWnsU18EDehjYYZSh330XxXmbyXKeBmVmHN05Q5Y0qJ+Ypo7mpRULnByPp1U2GGTNh4x85Y9uO2tIirFUDsxGX54F2KHInAgMBAAECggEALKmS2Bcf8aSNn3aO8l1V0YDD7d1aGg/+kMGPkHoKvmDRlR/pyfuhZxkcWViRAGOBA6Jh/q2SNyDWXBd/T0JzwAxvuA6bO4W/xLl22TdHJZZw0L/wSkZumcTmngFNv2aK54NX0HfG/h8Wbdqcnf0xLM54FCH6PLnqO8ur+hwe2fFY+LNk7FB8W89+/Sgi8eQ3Z6U95tmcHDNTWkX+jmJ2QM6HIuxDvFTpv+zURVAFoLmD2bc2x26MqOGo9qAmgpmdw40x+2c6dhv+bqoqFdb95oWyazFrS4RO5O0cTlJ1UcRZHkdZWoV81lJ/B1RB19WoQ+shGSbDBLdKTsq5m849GQKBgQDZMmLCOgenz99AxvwumGhGiMndHmeHECwIZg0mUi8bbHixURRZ3On4YGRFtr2TCMXruD4SM8xI8toSNM1u8e7opelmUOZT2oG+a95Ozyh3y+COEbdP5ui6VKppjEE5v8Bc1qbk7567N9H2ARKNn+hTnzKjIp+LWt3mzE2mBojOCQKBgQDGbZB1LWRLSahEpM6NL3fpByj/Sxs8C96/JuY8VbkK6p1wkKXtSTF1MG/Z4EhrRKO6qpvvKfuGpgNSTrjz3CxbZl0Le7TbB86F7/W3vS39yaZCDjwwjOd5mGSBBK11MnWu3I/8ofWeTSO+Ap0ApajKk4AmCzhgNqK43744P61KrwKBgQCEA6YXW+IvU5/k5Y1+XNB0nsvjhIl0hJXe/PhdJHLRflrVm+x8ulPTzfLklLAhYKG8Jp5DvgwbAtEdY87B8nc+HSoCMIXuzc8yiKn0yOFV/yub7pS3Eii+qJtzz/YNPcmUJDwIxsR6EvGhTwGR53H08bx7f53tu+tIT0Ga+jnI0QKBgQCcViix2eCiXNdBtiOzI0ozhFutwMwlZCjMrGZL9TJEwpLm5GCG8tsPvOjzXX1RXpQtd0xCg+5TqSsGx1V7dOZR4PXAHWhiBeWWq3gKmvfIc/8VHkgX7HxX1lShPkE4DFiiO88KOcTeQ2K8yyxOHTc+3DXkQ4TYcVOFm2swwCLVqwKBgQCrNqRNNVpw1n2cKkcsnlZ7fBIIoi08svOutCG2A62ZRNWf/VlKnbzPrvVFyT9ZWhyiooZoxUayhRxVkF6O\nrKlNoTGscBxe5hrq+ExMkhORinDaoQVNN+cpXkEsOX8Me+1t+JXBEFPa1hvPbhIvexSp3DqAvH+rXRcOWfeYQfNWTQ==\n-----END PRIVATE KEY-----\n" + $dq + $nl +
    "ALIPAY_SANDBOX_PUBLIC_KEY=" + $dq + "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqFntZger92EHNSn2VwI3+oB1iWqftA3/QpdpjM7Ngo8pWgmg1joEvLYR1msBQhxz7LPdHpzAN+Dst8EXCD/UN86VJbhx/uF1jnsaBSP7zTmv/gI1jfkE2sNKfrqYLwDlMhZqM7CwL8umOfvmH7pBJ2sfjh/4rYK6H2ew3qEcNHTWjbwCppYqgsC2v7pzQBuDb5g+DmBYE9cAyrdHexgqvyNiF7oJjVjdiFOdV8mwqJ2cvsoj3A8Xa4yA8Vp7FNfBA3oY2GGUod99F8Zm8lyn\ngZlZhzdOUOWNKifmKaO5qUVC5wcj6dVNhhkzYeMfOWPbjtrSIqxVA7MRl+eBdihy\nJwIDAQAB\n-----END PUBLIC KEY-----\n" + $dq + $nl

# 计算 base64
$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
$base64 = [Convert]::ToBase64String($bytes)
Write-Host ("OK payload=" + $payload.Length + " base64=" + $base64.Length)

# 1. base64 -d 追加到 .env
Write-Host "=== Step 1: append ===" -ForegroundColor Yellow
$remoteCmd = "echo " + $dq + $base64 + $dq + " | base64 -d >> " + $envFile + " ; echo APPEND_DONE"
$out1 = ssh ubuntu@$remoteHost $remoteCmd 2>&1
Write-Host $out1

# 2. 验证 ALIPAY 行（带行号）
Write-Host "=== Step 2: verify ===" -ForegroundColor Yellow
$verifyCmd = "grep -n ALIPAY_SANDBOX " + $envFile + " | cut -c1-130"
$out2 = ssh ubuntu@$remoteHost $verifyCmd 2>&1
Write-Host $out2

# 3. 检查双引号 + 行数
Write-Host "=== Step 3: quotes check ===" -ForegroundColor Yellow
$checkCmd = "echo -n 'has-PRIVATE-KEY=:' ; grep -c '^ALIPAY_SANDBOX_PRIVATE_KEY=" + $dq + "' " + $envFile + " ; echo -n 'has-PUBLIC-KEY=:' ; grep -c '^ALIPAY_SANDBOX_PUBLIC_KEY=" + $dq + "' " + $envFile + " ; echo -n 'total-lines:' ; wc -l < " + $envFile
$out3 = ssh ubuntu@$remoteHost $checkCmd 2>&1
Write-Host $out3

Write-Host "=== Done ===" -ForegroundColor Green
