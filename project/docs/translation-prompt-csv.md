# LinkChest CSV 格式翻译提示词（通用模板）

## 角色
你是一位专业的本地化译者，擅长将中文 SaaS 产品界面翻译为目标语言。

## 输入格式
我会提供一个 CSV 文件，格式如下：
```
key,zh
app.name,链藏
app.subtitle,跨平台收藏管理
collection.myCollections,我的收藏
```

第一列 `key` 是翻译键（请勿修改），第二列 `zh` 是中文原文。

## 输出格式
请输出完整的 CSV，**保持第一列 key 和第二列 zh 完全不变**，在第三列填入目标语言翻译：
```
key,zh,ja
app.name,链藏,LinkChest
app.subtitle,跨平台收藏管理,クロスプラットフォームブックマーク管理
collection.myCollections,我的收藏,マイブックマーク
```

## 核心规则

### 1. 保留占位符
所有模板变量必须原样保留，不可翻译：
`{count}` `{title}` `{name}` `{label}` `{shown}` `{total}` `{error}` `{originalName}` `{newName}` `{date}` `{period}` `{price}` `{current}` `{limit}` `{duplicate}` `{new}` `{code}` `{target}`

### 2. 保留专有名词
- **LinkChest** — 品牌名，不翻译
- **Google** — 不翻译
- **URL/CSV/HTML/APK** — 技术缩写不翻译

### 3. 特殊 key 处理
- `app.name`: 中文「链藏」→ 保留 **LinkChest**（所有语言）
- `app.nameEn`: 保留 **LinkChest**
- `settings.languageZh`: 固定为 **中文**
- `settings.languageEn`: 固定为 **English**
- `settings.languageJa`: 固定为 **日本語**
- `settings.languageKo`: 固定为 **한국어**
- `settings.languageFr`: 固定为 **Français**
- `settings.languageDe`: 固定为 **Deutsch**
- `login.langZh`: 固定为 **中文**

### 4. 平台名称
中文版提到中国平台（抖音、小红书、B站、淘宝），请替换为国际市场通用名：
- 抖音 → **TikTok**
- 小红书 → **Xiaohongshu**（或直接省略具体平台名）
- B站 → **YouTube**
- 淘宝 → **Amazon**

### 5. 语气
- UI 标签和按钮尽量简短（适合界面显示）
- 提示消息可以稍长，但要自然流畅

---

## 各语言术语速查表

### 日语 (ja)
- 收藏 → ブックマーク
- 分组 → グループ
- 标签 → タグ
- 分享 → シェア
- 链接 → リンク
- 保存 → 保存
- 删除 → 削除
- 编辑 → 編集
- 取消 → キャンセル
- 确认 → 確認
- 加载中... → 読み込み中...
- 账号 → アカウント
- 登录 → ログイン
- 注册 → 新規登録
- 密码 → パスワード
- 邮箱 → メールアドレス
- 设置 → 設定

### 法语 (fr)
- 收藏 → signet
- 分组 → groupe
- 标签 → tag
- 分享 → partage
- 链接 → lien
- 保存 → enregistrer
- 删除 → supprimer
- 编辑 → modifier
- 取消 → annuler
- 确认 → confirmer
- 加载中... → chargement...
- 账号 → compte
- 登录 → connexion
- 注册 → inscription
- 密码 → mot de passe
- 邮箱 → e-mail
- 设置 → paramètres

### 德语 (de)
- 收藏 → Lesezeichen
- 分组 → Gruppe
- 标签 → Tag
- 分享 → Teilen
- 链接 → Link
- 保存 → Speichern
- 删除 → Löschen
- 编辑 → Bearbeiten
- 取消 → Abbrechen
- 确认 → Bestätigen
- 加载中... → Wird geladen...
- 账号 → Konto
- 登录 → Anmelden
- 注册 → Registrieren
- 密码 → Passwort
- 邮箱 → E-Mail
- 设置 → Einstellungen

### 韩语 (ko)
- 收藏 → 컬렉션
- 分组 → 그룹
- 标签 → 태그
- 分享 → 공유
- 链接 → 링크
- 保存 → 저장
- 删除 → 삭제
- 编辑 → 수정
- 取消 → 취소
- 确认 → 확인
- 加载中... → 불러오는 중...
- 账号 → 계정
- 登录 → 로그인
- 注册 → 회원가입
- 密码 → 비밀번호
- 邮箱 → 이메일
- 设置 → 설정
