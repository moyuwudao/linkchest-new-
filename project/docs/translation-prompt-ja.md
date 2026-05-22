# LinkChest 日语翻译任务

## 输入
CSV 文件，每行格式：
```
key,zh
app.name,链藏
app.subtitle,跨平台收藏管理
collection.myCollections,我的收藏
```

## 输出要求
**保持第1列 key 和第2列 zh 完全不变**，在第3列填入日语翻译：
```
key,zh,ja
app.name,链藏,LinkChest
app.subtitle,跨平台收藏管理,クロスプラットフォームブックマーク管理
```

## 翻译规则

### ① 占位符原样保留
`{count}` `{title}` `{name}` `{label}` `{shown}` `{total}` `{error}` `{originalName}` `{newName}` `{date}` `{period}` `{price}` `{current}` `{limit}` `{duplicate}` `{new}` `{code}` `{target}` 这些**不要翻译**。

### ② 固定值不翻译
- `app.name` → `LinkChest`（所有语言）
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
- 使用です・ます调，友好专业
- UI 按钮尽量短（如「保存」「キャンセル」）
- 提示语可以稍长

### ⑤ 核心术语（参考）
| 中文 | 日语 |
|------|------|
| 收藏 | ブックマーク |
| 分组 | グループ |
| 标签 | タグ |
| 分享 | シェア |
| 链接 | リンク |
| 封面 | カバー画像 |
| 备注 | メモ |
| 保存 | 保存 |
| 删除 | 削除 |
| 编辑 | 編集 |
| 取消 | キャンセル |
| 确认 | 確認 |
| 加载中... | 読み込み中... |
| 我的收藏 | マイブックマーク |
| 暂无收藏 | ブックマークはまだありません |
| 账号 | アカウント |
| 登录 | ログイン |
| 注册 | 新規登録 |
| 设置 | 設定 |
| 密码 | パスワード |
| 邮箱 | メールアドレス |

## 输出
只输出 CSV 内容，不要添加任何解释或说明。