#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
热修 dist/services/contentModeration.js 中的 moderateCollectionUrl 函数
关闭 URL 内容审核,只做格式校验（路由层已处理）
"""
import re
import sys

DIST_FILE = '/opt/linkchest/api/project/apps/api/dist/services/contentModeration.js'

with open(DIST_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 匹配整个 moderateCollectionUrl 异步函数（包括其前后的 JSDoc 注释）
# 起始：JSDoc 注释 "/*" 后跟 "审核收藏 URL"
# 结束：函数体最后一个 "}" 之后到 "/**" 之前

# 使用更精确的匹配：从 "/**\n * 审核收藏 URL" 开始，到下一个 "/**" 之前
new_function = '''/**
 * 审核收藏 URL（链接本身,检查是否含恶意域或违规内容）
 *
 * 当前策略：仅做格式校验（必填、是URL），不做内容审核
 * - 格式校验由 routes 层 body('url').custom() 处理
 * - 不调用 isMaliciousUrl（避免误判）
 * - 不送审腾讯云 TMS（节省费用）
 * - 不查 Redis 缓存
 *
 * 关闭时间：2026-06-08
 */
async function moderateCollectionUrl(url, collectionId) {
    return { safe: true, reason: 'url_check_disabled' };
}'''

# 用正则匹配并替换
# 模式：从 "审核收藏 URL" 的 JSDoc 注释开始,到 moderateCollectionTag 函数前
pattern = re.compile(
    r'/\*\*\s*\n\s*\*\s*审核收藏 URL.*?async function moderateCollectionUrl\(url, collectionId\)\s*\{.*?^\}',
    re.MULTILINE | re.DOTALL
)

new_content, count = pattern.subn(new_function, content)

if count == 0:
    print("ERROR: 没有匹配到 moderateCollectionUrl 函数")
    sys.exit(1)

print(f"匹配并替换 {count} 处")

with open(DIST_FILE, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("热修完成")
