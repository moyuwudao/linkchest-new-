#!/bin/bash
# 搜索所有可能的 keystore 文件并检查 MD5

echo "=== 搜索所有 keystore 和 jks 文件 ==="
find /mnt/d/trae_projects /mnt/c/Users/Mayn -name '*.keystore' -o -name '*.jks' 2>/dev/null | while read f; do
  echo ""
  echo "文件: $f"
  
  # 获取所有别名
  aliases=$(keytool -list -keystore "$f" -storepass 'LCHu192619!' 2>/dev/null | grep 'PrivateKeyEntry' | awk -F',' '{print $1}')
  
  if [ -z "$aliases" ]; then
    # 尝试其他密码
    aliases=$(keytool -list -keystore "$f" -storepass 'android' 2>/dev/null | grep 'PrivateKeyEntry' | awk -F',' '{print $1}')
  fi
  
  for alias in $aliases; do
    echo "  别名: $alias"
    sha256=$(keytool -list -v -keystore "$f" -alias "$alias" -storepass 'LCHu192619!' 2>/dev/null | grep 'SHA256:' | awk '{print $2}')
    if [ -z "$sha256" ]; then
      sha256=$(keytool -list -v -keystore "$f" -alias "$alias" -storepass 'android' 2>/dev/null | grep 'SHA256:' | awk '{print $2}')
    fi
    
    if [ -n "$sha256" ]; then
      sha256_clean=$(echo "$sha256" | tr -d ':')
      md5=$(python3 -c "import hashlib; print(hashlib.md5(bytes.fromhex('$sha256_clean')).hexdigest().upper())")
      echo "  SHA256: $sha256"
      echo "  MD5: $md5"
      
      if [ "$md5" = "532FD00CDFE8E47071536704767B85FD" ]; then
        echo "  ✅ 找到匹配的 keystore！"
      fi
    fi
  done
done

echo ""
echo "=== 搜索完成 ==="
