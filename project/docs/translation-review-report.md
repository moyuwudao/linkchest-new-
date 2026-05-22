# LinkChest 多语言翻译审核报告

**生成时间**：2026-04-30
**翻译语言**：JA（日语）、FR（法语）、DE（德语）、KO（韩语）
**覆盖范围**：Web 端 + Mobile 端

---

## 一、文件清单与校验结果

### 全部通过 ✅

| 端 | 语言 | zh key 数 | 翻译 key 数 | 缺失 | 多余 | 状态 |
|----|------|-----------|-------------|------|------|------|
| Web | JA | 658 | 658 | 0 | 0 | ✅ |
| Web | FR | 658 | 658 | 0 | 0 | ✅ |
| Web | DE | 658 | 658 | 0 | 0 | ✅ |
| Web | KO | 658 | 658 | 0 | 0 | ✅ |
| Mobile | JA | 601 | 601 | 0 | 0 | ✅ |
| Mobile | FR | 601 | 601 | 0 | 0 | ✅ |
| Mobile | DE | 601 | 601 | 0 | 0 | ✅ |
| Mobile | KO | 601 | 601 | 0 | 0 | ✅ |

**总计**：8 个文件，全部 key 数量与中文原文完全匹配，无遗漏。

---

## 二、翻译文件路径

```
apps/web/src/lib/locales/
  ├── zh.json        （原始中文，658 keys）
  ├── ja.json        （日语，658 keys）
  ├── fr.json        （法语，658 keys）
  ├── de.json        （德语，658 keys）
  └── ko.json        （韩语，658 keys）

apps/mobile/src/lib/locales/
  ├── zh.json        （原始中文，601 keys）
  ├── ja.json        （日语，601 keys）
  ├── fr.json        （法语，601 keys）
  ├── de.json        （德语，601 keys）
  └── ko.json        （韩语，601 keys）
```

---

## 三、翻译规范遵循情况

### 1. 品牌名保留（不翻译）
- `LinkChest` → 保持原样
- `Google`、`iOS`、`Android` → 保持原样
- `TikTok`、`YouTube`、`Amazon` → 保持原样

### 2. 平台名本地化
| 中文 | JA | FR | DE | KO |
|------|----|----|----|-----|
| 抖音 | TikTok | TikTok | TikTok | TikTok |
| 小红书 | REDブック | RED | RED | RED |
| B站 | YouTube | YouTube | YouTube | YouTube |
| 淘宝 | Amazon | Amazon | Amazon | Amazon |

### 3. 占位符原样保留
所有 `{count}`、`{title}`、`{name}`、`{label}`、`{date}`、`{price}`、`{period}` 等模板变量在翻译中保持原位，不做改动。

### 4. 中文特色词汇处理
| 中文 | JA | FR | DE | KO |
|------|----|----|----|-----|
| 收藏 | ブックマーク | Favoris | Lesezeichen | 즐겨찾기 |
| 宝库 | 宝庫 / 宝藏 | Trésor / Trésors | Schatz | 보물 |
| 收藏馆 | 收藏館 | Coffre privé | Privater Tresor |私家珍藏 |

---

## 四、各语言文件结构（所有语言一致）

每个 JSON 文件均包含以下 20 个一级 section：

`app` · `nav` · `collection` · `group` · `share` · `edit` · `cover` · `sidebar` · `tier` · `common` · `settings` · `download` · `login` · `terms` · `privacy` · `account` · `add` · `tag` · `errors` · `error`

---

## 五、审阅要点建议

请其他 AI 重点检查以下方面：

1. **UI 语气是否自然**：各语言的称呼是否符合该语言用户的习惯（如德语是否过于生硬、法语是否过于口语）
2. **占位符完整性**：所有 `{placeholder}` 是否原样保留，未被误译
3. **敏感词检查**：是否有不适合在用户界面显示的直译内容
4. **数字/标点格式**：如 `{count}` 旁边的单复数是否自然（部分语言有单复数要求）
5. **特殊字符转义**：引号、换行等是否正确处理

---

## 六、后续步骤（如需修改）

如有某条翻译需要调整，直接编辑对应语言的 JSON 文件即可，无需重新生成全部内容。建议使用支持 JSON 格式的编辑器（如 VS Code）进行批量查找替换。