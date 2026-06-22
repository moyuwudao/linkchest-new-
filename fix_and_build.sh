#!/bin/bash
# 修复构建问题并重新构建APK

cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 1. 设置 Android SDK 环境
export ANDROID_HOME=/opt/android-sdk
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"

# 2. 检查 SDK 是否存在
if [ ! -d "$ANDROID_HOME" ]; then
    echo "错误: Android SDK 不存在于 $ANDROID_HOME"
    exit 1
fi

# 3. 创建 local.properties
echo "sdk.dir=/opt/android-sdk" > local.properties

# 4. 检查 keystore 文件
keystore_file="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
if [ ! -f "$keystore_file" ]; then
    echo "错误: keystore 文件不存在"
    exit 1
fi

echo "=== keystore 信息 ==="
keytool -list -v -keystore "$keystore_file" -alias linkchest -storepass 'LCHu192619!' | grep -E '(SHA1|SHA256)'

echo ""
echo "=== 开始构建 ==="
./gradlew assembleChinaRelease --no-daemon

# 5. 检查构建结果
apk_file="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-china/outputs/apk/china/release/linkchest-china-release.apk"
if [ -f "$apk_file" ]; then
    echo ""
    echo "=== 构建成功 ==="
    echo "APK: $apk_file"
    ls -lh "$apk_file"
    
    # 验证签名
    echo ""
    echo "=== APK 签名验证 ==="
    unzip -p "$apk_file" META-INF/CERT.RSA > /tmp/apk_cert.rsa 2>/dev/null
    if [ -f /tmp/apk_cert.rsa ]; then
        keytool -printcert -file /tmp/apk_cert.rsa | grep -E '(SHA1|SHA256|MD5)'
        echo ""
        echo "APK 证书 MD5:"
        md5sum /tmp/apk_cert.rsa
        
        # 对比 keystore
        echo ""
        echo "=== 对比 keystore ==="
        keytool -exportcert -keystore "$keystore_file" -alias linkchest -storepass 'LCHu192619!' -file /tmp/keystore_cert.der 2>/dev/null
        echo "keystore 证书 MD5:"
        md5sum /tmp/keystore_cert.der
        
        rm -f /tmp/apk_cert.rsa /tmp/keystore_cert.der
    fi
else
    echo ""
    echo "=== 构建失败 ==="
    echo "未找到 APK 文件"
fi
