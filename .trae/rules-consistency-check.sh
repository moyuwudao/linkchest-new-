#!/bin/bash
# rules-consistency-check.sh — 规则文件一致性检查脚本
# 用法: bash .trae/rules-consistency-check.sh [--verbose] [--json]
# 版本: v1.0 (2026-05-19)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RULES_DIR="$(cd "$SCRIPT_DIR/rules" && pwd)"
INDEX_JSON="$RULES_DIR/../rule-index.json"

VERBOSE=false
JSON_MODE=false

for arg in "$@"; do
    case "$arg" in
        --verbose|-v) VERBOSE=true ;;
        --json|-j) JSON_MODE=true ;;
    esac
done

PASS=0
FAIL=0
WARN=0
ISSUES=()

log_pass() { ((PASS++)) || true; $VERBOSE && echo "  ✅ $1" || true; }
log_fail() { ((FAIL++)) || true; ISSUES+=("❌ $1"); echo "  ❌ $1"; }
log_warn() { ((WARN++)) || true; ISSUES+=("⚠️ $1"); echo "  ⚠️ $1"; }

echo "=========================================="
echo "  LinkChest 规则一致性检查"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# ============================================
# 1. 检查 rule-index.json 是否存在
# ============================================
echo "【1】rule-index.json 检查"
if [ ! -f "$INDEX_JSON" ]; then
    log_fail "rule-index.json 不存在于 $INDEX_JSON"
    exit 1
fi
log_pass "rule-index.json 存在"

# ============================================
# 2. 收集所有 .md 规则文件
# ============================================
echo ""
echo "【2】规则文件发现"

ALL_MD_FILES=$(find "$RULES_DIR" -name "*.md" -type f | sort)
MD_COUNT=$(echo "$ALL_MD_FILES" | grep -c "^" 2>/dev/null || true)

$VERBOSE && echo "  发现 $MD_COUNT 个 .md 文件" || true

ROOT_MD=$(echo "$ALL_MD_FILES" | { grep -v "/cases/" || true; } | { grep -v "/common/" || true; } | { grep -v "/typescript/" || true; })
CASES_MD=$(echo "$ALL_MD_FILES" | { grep "/cases/" || true; })
COMMON_MD=$(echo "$ALL_MD_FILES" | { grep "/common/" || true; })
TYPESCRIPT_MD=$(echo "$ALL_MD_FILES" | { grep "/typescript/" || true; })

log_pass "发现规则文件: $(echo "$ROOT_MD" | wc -l) 个项目规则 + $(echo "$CASES_MD" | wc -l) 个案例 + $(echo "$COMMON_MD" | wc -l) 个通用规则"

# ============================================
# 3. 检查所有 .md 文件是否在 rule-index.json 中注册
# ============================================
echo ""
echo "【3】rule-index.json 注册完整性"

PROJECT_MD=$(echo "$ALL_MD_FILES" | { grep -v "/cases/" || true; } | { grep -v "/common/" || true; } | { grep -v "/typescript/" || true; })

while IFS= read -r f; do
    [ -z "$f" ] && continue
    rel="${f#$RULES_DIR/}"
    # 跳过 README.md（描述性文件，非规则）
    [[ "$rel" == *"README.md" ]] && continue
    
    if grep -q "\"$rel\"" "$INDEX_JSON" 2>/dev/null; then
        $VERBOSE && log_pass "已注册: $rel" || true
    else
        log_warn "未注册: $rel — 建议在 rule-index.json 中添加"
    fi
done <<< "$PROJECT_MD"

# 检查 common/ 文件
while IFS= read -r f; do
    [ -z "$f" ] && continue
    rel="${f#$RULES_DIR/}"
    [[ "$rel" == *"README.md" ]] && continue
    
    if grep -q "\"$rel\"" "$INDEX_JSON" 2>/dev/null; then
        $VERBOSE && log_pass "已注册: $rel" || true
    else
        log_warn "未注册: $rel — 建议在 rule-index.json 中添加"
    fi
done <<< "$COMMON_MD"

# ============================================
# 4. 检查 rule-index.json 中的文件是否存在
# ============================================
echo ""
echo "【4】rule-index.json 条目有效性"

# 提取所有文件路径
REGISTERED_FILES=$(grep -oP '"[^"]+\.md"' "$INDEX_JSON" 2>/dev/null | tr -d '"' | sort -u)

while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    [[ "$rel" == *"README.md" ]] && continue
    full="$RULES_DIR/$rel"
    
    if [ -f "$full" ]; then
        $VERBOSE && log_pass "存在: $rel" || true
    else
        log_fail "注册但不存在: $rel — 请从 rule-index.json 中移除或创建文件"
    fi
done <<< "$REGISTERED_FILES"

# ============================================
# 5. 检查 alwaysApply: true 文件是否在 always/safety 组
# ============================================
echo ""
echo "【5】alwaysApply 优先级检查"

while IFS= read -r f; do
    [ -z "$f" ] && continue
    rel="${f#$RULES_DIR/}"
    
    # 检查 frontmatter 中的 alwaysApply
    if head -20 "$f" | grep -q "alwaysApply:.*true"; then
        # 检查是否在 always 或 safety 组
        if grep -q "\"$rel\"" "$INDEX_JSON" 2>/dev/null; then
            # 检查所在组的 priority
            in_always=$(python3 -c "
import json
with open('$INDEX_JSON') as f:
    data = json.load(f)
for group, info in data['rules'].items():
    if '$rel' in info.get('files', []):
        print(info.get('priority', 'unknown'))
        break
" 2>/dev/null || echo "unknown")
            
            if [ "$in_always" = "always" ]; then
                $VERBOSE && log_pass "$rel: alwaysApply=true, priority=always ✅" || true
            else
                log_warn "$rel: alwaysApply=true, 但 priority=$in_always — 应移至 always 组"
            fi
        fi
    fi
done <<< "$PROJECT_MD"

# ============================================
# 6. INDEX.md 与磁盘文件一致性
# ============================================
echo ""
echo "【6】INDEX.md 清单一致性"

INDEX_MD="$RULES_DIR/INDEX.md"
if [ -f "$INDEX_MD" ]; then
    # 只检查「规则文件清单」部分（跳过更新日志中的历史引用）
    LISTING_START=$(grep -n "## 规则文件清单" "$INDEX_MD" | head -1 | cut -d: -f1)
    CHANGELOG_START=$(grep -n "## 更新日志" "$INDEX_MD" | head -1 | cut -d: -f1)
    
    if [ -n "$LISTING_START" ] && [ -n "$CHANGELOG_START" ]; then
        LISTING=$(sed -n "${LISTING_START},${CHANGELOG_START}p" "$INDEX_MD")
    else
        LISTING=$(cat "$INDEX_MD")
    fi
    
    for forbidden in "RIVERPOD.md" "linkchest-build-apk.md"; do
        if echo "$LISTING" | grep -q "$forbidden" 2>/dev/null; then
            log_fail "INDEX.md 清单引用了已删除的文件: $forbidden"
        fi
    done
    
    # 检查关键文件是否被列出
    for required in "BUILD_RED_LINES.md" "DEPLOYMENT.md" "CONTEXT.md" "DEBUG.md"; do
        if [ -f "$RULES_DIR/$required" ] && ! echo "$LISTING" | grep -q "$required" 2>/dev/null; then
            log_warn "INDEX.md 缺少: $required"
        fi
    done
    
    log_pass "INDEX.md 引用检查完成（仅检查清单部分）"
else
    log_fail "INDEX.md 不存在"
fi

# ============================================
# 7. 交叉引用检查（检查引用已删除的文件）
# ============================================
echo ""
echo "【7】交叉引用安全性"

DELETED_FILES=("linkchest-build-apk.md" "RIVERPOD.md")

for forbidden in "${DELETED_FILES[@]}"; do
    refs=$(grep -rn "$forbidden" "$RULES_DIR" --include="*.md" 2>/dev/null | grep -v "已删除" | grep -v "禁止引用" | grep -v "合并至" | grep -v "不存在的文件" | grep -v "移除过时引用" | grep -v "删除 linkchest-build-apk" || true)
    if [ -n "$refs" ]; then
        log_warn "发现对已删除文件 '$forbidden' 的引用:"
        echo "$refs" | while IFS= read -r line; do
            echo "       $line"
        done
    fi
done

log_pass "交叉引用安全性检查完成"

# ============================================
# 8. 版本追踪审计
# ============================================
echo ""
echo "【8】版本追踪审计"

VER_CHECK_ERRORS=0
while IFS= read -r f; do
    [ -z "$f" ] && continue
    rel="${f#$RULES_DIR/}"
    
    has_update=$(grep -c "\*最后更新" "$f" 2>/dev/null || echo 0)
    has_version=$(grep -c "\*版本" "$f" 2>/dev/null || echo 0)
    
    if [ "$has_update" -eq 0 ]; then
        log_warn "$rel: 缺少「最后更新」日期"
        ((VER_CHECK_ERRORS++))
    fi
    if [ "$has_version" -eq 0 ]; then
        log_warn "$rel: 缺少「版本」号"
        ((VER_CHECK_ERRORS++))
    fi
    
    $VERBOSE && [ "$has_update" -gt 0 ] && [ "$has_version" -gt 0 ] && log_pass "$rel: 版本追踪完整" || true
done <<< "$PROJECT_MD"

if [ "$VER_CHECK_ERRORS" -eq 0 ]; then
    log_pass "所有项目规则文件版本追踪完整"
fi

# ============================================
# 9. Case 文件存在性检查
# ============================================
echo ""
echo "【9】案例集锦检查"

CASES_INDEX="$RULES_DIR/cases/CASES_INDEX.md"
if [ -f "$CASES_INDEX" ]; then
    log_pass "CASES_INDEX.md 存在"
else
    log_warn "CASES_INDEX.md 不存在"
fi

# ============================================
# 汇总报告
# ============================================
echo ""
echo "=========================================="
echo "  检查汇总"
echo "=========================================="
echo "  ✅ 通过: $PASS"
echo "  ❌ 失败: $FAIL"
echo "  ⚠️ 警告: $WARN"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "🔴 发现 $FAIL 个严重问题，建议立即修复"
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo ""
    echo "🟡 发现 $WARN 个警告，建议尽快处理"
    exit 0
else
    echo ""
    echo "🟢 所有检查通过！规则体系一致性良好"
    exit 0
fi