#!/bin/bash
# ============================================================
# 运营配置同步检查脚本
# 用途：在修改MARKET-OPS.md后，检查market-config.json是否同步更新
# 使用方法：在Git提交前运行此脚本
# ============================================================

set -e

MARKET_OPS=".trae/rules/MARKET-OPS.md"
MARKET_CONFIG="project/apps/mobile/market-config.json"

echo "=========================================="
echo "=== 运营配置同步检查 ==="
echo "=========================================="

# 检查market-config.json是否存在
if [ ! -f "$MARKET_CONFIG" ]; then
    echo "❌ market-config.json 不存在"
    exit 1
fi

# 检查JSON格式
PYTHON_CMD=$(command -v python3 || command -v python || echo "")
if [ -z "$PYTHON_CMD" ]; then
    echo "❌ 未找到 Python 命令"
    exit 1
fi

if ! $PYTHON_CMD -m json.tool "$MARKET_CONFIG" > /dev/null 2>&1; then
    echo "❌ market-config.json 格式错误"
    exit 1
fi

echo "✅ market-config.json 格式正确"

# 检查关键字段完整性
if ! $PYTHON_CMD -c "
import json
d = json.load(open('$MARKET_CONFIG'))
required = ['version', 'lastUpdated', 'markets']
for field in required:
    if field not in d:
        print('❌ market-config.json 缺少必要字段: ' + field)
        exit(1)
if 'global' not in d['markets'] or 'china' not in d['markets']:
    print('❌ market-config.json 缺少 markets.global 或 markets.china')
    exit(1)
" 2>/dev/null; then
    exit 1
fi

echo "✅ 关键字段完整"

# 检查版本号是否更新
CONFIG_VERSION=$($PYTHON_CMD -c "import json; print(json.load(open('$MARKET_CONFIG'))['version'])")
echo "   当前配置版本: $CONFIG_VERSION"

# 检查最后更新日期
CONFIG_DATE=$($PYTHON_CMD -c "import json; print(json.load(open('$MARKET_CONFIG'))['lastUpdated'])")
echo "   最后更新日期: $CONFIG_DATE"

# 检查Git状态
if git diff --cached --name-only | grep -q "$MARKET_OPS"; then
    if ! git diff --cached --name-only | grep -q "$MARKET_CONFIG"; then
        echo ""
        echo "⚠️  警告: MARKET-OPS.md 已修改，但 market-config.json 未同步更新"
        echo "   根据规则，修改运营配置时必须同步更新 market-config.json"
        echo ""
        echo "   请执行以下操作："
        echo "   1. 更新 market-config.json 中的对应配置"
        echo "   2. 更新版本号和最后更新日期"
        echo "   3. 重新运行此脚本"
        echo ""
        exit 1
    fi
fi

echo ""
echo "✅ 同步检查通过"
echo "=========================================="
