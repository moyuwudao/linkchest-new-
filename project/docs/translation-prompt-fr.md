# LinkChest 法语翻译任务

## 输入
CSV 文件，每行格式：
```
key,zh
app.name,链藏
app.subtitle,跨平台收藏管理
collection.myCollections,我的收藏
```

## 输出要求
**保持第1列 key 和第2列 zh 完全不变**，在第3列填入法语翻译：
```
key,zh,fr
app.name,链藏,LinkChest
app.subtitle,跨平台收藏管理,Gestion de signets multiplateforme
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
- 使用现代 SaaS 友好的语气（可用 tu）
- UI 按钮尽量短（如「Enregistrer」「Annuler」）
- 提示语可以稍长，注意法语通常比中文长 20-30%

### ⑤ 核心术语（参考）
| 中文 | 法语 |
|------|------|
| 收藏 | signet |
| 分组 | groupe |
| 标签 | tag |
| 分享 | partage |
| 链接 | lien |
| 封面 | image de couverture |
| 备注 | note |
| 保存 | enregistrer |
| 删除 | supprimer |
| 编辑 | modifier |
| 取消 | annuler |
| 确认 | confirmer |
| 加载中... | chargement... |
| 我的收藏 | mes signets |
| 暂无收藏 | aucun signet pour l'instant |
| 账号 | compte |
| 登录 | connexion |
| 注册 | inscription |
| 设置 | paramètres |
| 密码 | mot de passe |
| 邮箱 | adresse e-mail |

## 输出
只输出 CSV 内容，不要添加任何解释或说明。