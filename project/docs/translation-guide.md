# LinkChest 多语言翻译指南

## 待翻译文件

| 文件 | 内容 | 条目 |
|------|------|------|
| `web-translation-source.csv` | Web 端翻译（key,zh） | 658 条 |
| `mobile-translation-source.csv` | Mobile 端翻译（key,zh） | 601 条 |

打开上述 CSV → 全选复制 → 粘贴到 Gemini → 附上对应语言提示词 → 输出翻译后 CSV。

---

## 各语言提示词文件

| 语言 | 提示词 | 输出文件名（Web） | 输出文件名（Mobile） |
|------|--------|-----------------|-------------------|
| 日语 | `docs/translation-prompt-ja.md` | `web-translation-ja.csv` | `mobile-translation-ja.csv` |
| 法语 | `docs/translation-prompt-fr.md` | `web-translation-fr.csv` | `mobile-translation-fr.csv` |
| 德语 | `docs/translation-prompt-de.md` | `web-translation-de.csv` | `mobile-translation-de.csv` |
| 韩语 | `docs/translation-prompt-ko.md` | `web-translation-ko.csv` | `mobile-translation-ko.csv` |

---

## CSV 翻译流程

### Step 1 — 翻译 Web 端

1. 打开 `web-translation-source.csv`，复制全部内容
2. 打开 Gemini，粘贴内容
3. 附上对应语言的提示词（从 `docs/translation-prompt-xx.md` 复制）
4. Gemini 输出 `key,zh,xx` 格式的 CSV
5. 保存为 `web-translation-xx.csv`

### Step 2 — 翻译 Mobile 端

同上，用 `mobile-translation-source.csv`，输出为 `mobile-translation-xx.csv`

### Step 3 — 一键转 JSON

```bash
# Web 端
node scripts/csv-to-json.js web-translation-xx.csv xx

# Mobile 端
node scripts/csv-to-json.js mobile-translation-xx.csv xx
```

脚本会自动：
- 读取原始 `zh.json` 结构
- 用 CSV 第3列翻译值替换中文
- 未翻译的 key 保留中文原文
- 输出到 `apps/web/src/lib/locales/xx.json` 和 `apps/mobile/src/lib/locales/xx.json`

---

## 提示词格式（对比旧版）

旧版：给 Gemini 一大段 Markdown 说明 + 要求输出嵌套 JSON → **格式容易乱**

新版：给 Gemini 一个简单 CSV 格式说明 + 要求在第3列填翻译 → **格式清晰不易错**

核心区别：
- 输入：扁平 CSV（key 只有一级，用 `.` 分隔）
- 输出：CSV 第3列填翻译，前两列不变
- JSON 结构在转换脚本里恢复，Gemini 不需要理解嵌套结构

---

## 示例

**输入：**
```csv
key,zh
collection.myCollections,我的收藏
collection.noCollectionsInFilter,「{label}」中没有收藏内容
```

**期望输出（给日语）：**
```csv
key,zh,ja
collection.myCollections,我的收藏,マイブックマーク
collection.noCollectionsInFilter,「{label}」中没有收藏内容,「{label}」にブックマークがありません
```

---

## 后续代码修改

JSON 文件生成后，还需要：

### 1. 注册语言选项
- Web: `apps/web/src/lib/locales/index.ts`
- Mobile: `apps/mobile/src/lib/locales/index.ts`

### 2. 管理后台硬编码
`apps/web/src/app/admin/page.tsx` 中的中文硬编码需要单独处理

### 3. API 错误码
`apps/api/src/lib/errorCodes.ts` 当前返回双语言，建议改为前端查表