# LinkChest 德语翻译任务

## 输入
CSV 文件，每行格式：
```
key,zh
app.name,链藏
app.subtitle,跨平台收藏管理
collection.myCollections,我的收藏
```

## 输出要求
**保持第1列 key 和第2列 zh 完全不变**，在第3列填入德语翻译：
```
key,zh,de
app.name,链藏,LinkChest
app.subtitle,跨平台收藏管理,Plattformübergreifende Lesezeichenverwaltung
```

## 翻译规则

### ① 占位符原样保留
`{count}` `{title}` `{name}` `{label}` `{shown}` `{total}` `{error}` `{originalName}` `{newName}` `{date}` `{period}` `{price}` `{current}` `{limit}` `{duplicate}` `{new}` `{code}` `{target}` 这些**不要翻译**。

### ② 固定值不翻译
- `app.name` → `LinkChest`
- `app.nameEn` → `LinkChest`
- `settings.languageZh` → `中文`
- `settings.languageEn` → `English`
- `settings.languageJa` → `日本語`
- `settings.languageKo` → `한국어`
- `settings.languageFr` → `Français`
- `settings.languageDe` → `Deutsch`

### ③ 平台名替换
中文原文中出现以下中国平台时，换为国际通用名：
- 抖音 → TikTok
- 小红书 → Xiaohongshu（可保留）
- B站 → YouTube
- 淘宝 → Amazon

### ④ 语气与风格
- 使用 Du-Form（非正式但友好）
- UI 按钮尽量短（如「Speichern」「Abbrechen」）
- 提示语可以稍长，德语通常比中文长 30-50%

### ⑤ 核心术语（参考）
| 中文 | 德语 |
|------|------|
| 收藏 | Lesezeichen |
| 分组 | Gruppe |
| 标签 | Tag |
| 分享 | Teilen |
| 链接 | Link |
| 封面 | Titelbild |
| 备注 | Notiz |
| 保存 | Speichern |
| 删除 | Löschen |
| 编辑 | Bearbeiten |
| 取消 | Abbrechen |
| 确认 | Bestätigen |
| 加载中... | Wird geladen... |
| 我的收藏 | Meine Lesezeichen |
| 暂无收藏 | Noch keine Lesezeichen |
| 账号 | Konto |
| 登录 | Anmelden |
| 注册 | Registrieren |
| 设置 | Einstellungen |
| 密码 | Passwort |
| 邮箱 | E-Mail-Adresse |

## 输出
只输出 CSV 内容，不要添加任何解释或说明。