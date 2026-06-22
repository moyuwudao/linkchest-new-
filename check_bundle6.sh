#!/bin/bash
echo "=== Bundle file status ==="
ls -la /tmp/apk_check/assets/index.android.bundle 2>&1
echo ""
echo "=== Test grep -c on a known string ==="
grep -c "billingCycle" /tmp/apk_check/assets/index.android.bundle 2>&1
echo ""
echo "=== Test grep -ao (binary mode) ==="
grep -ao "billingCycle" /tmp/apk_check/assets/index.android.bundle 2>/dev/null | wc -l
echo ""
echo "=== Test with LANG=C ==="
LANG=C grep -ao "billingCycle" /tmp/apk_check/assets/index.android.bundle 2>/dev/null | wc -l
echo ""
echo "=== File type ==="
file /tmp/apk_check/assets/index.android.bundle 2>&1
echo ""
echo "=== First 200 bytes hex ==="
head -c 200 /tmp/apk_check/assets/index.android.bundle | xxd | head -10
