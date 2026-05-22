# LinkChest 韩语翻译任务

## 输入
CSV 文件，每行格式：
```
key,zh
app.name,链藏
app.subtitle,跨平台收藏管理
collection.myCollections,我的收藏
```

## 输出要求
**保持第1列 key 和第2列 zh 完全不变**，在第3列填入韩语翻译：
```
key,zh,ko
app.name,链藏,LinkChest
app.subtitle,跨平台收藏管理,크로스 플랫폼 컬렉션 관리
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
- 使用简洁的日常体（~요 或平体）
- UI 按钮尽量短（如「저장」「취소」）
- 提示语可以稍长

### ⑤ 核心术语（参考）
| 中文 | 韩语 |
|------|------|
| 收藏 | 컬렉션 |
| 分组 | 그룹 |
| 标签 | 태그 |
| 分享 | 공유 |
| 链接 | 링크 |
| 封面 | 커버 이미지 |
| 备注 | 메모 |
| 保存 | 저장 |
| 删除 | 삭제 |
| 编辑 | 수정 |
| 取消 | 취소 |
| 确认 | 확인 |
| 加载中... | 불러오는 중... |
| 我的收藏 | 내 컬렉션 |
| 暂无收藏 | 아직 컬렉션이 없습니다 |
| 账号 | 계정 |
| 登录 | 로그인 |
| 注册 | 회원가입 |
| 设置 | 설정 |
| 密码 | 비밀번호 |
| 邮箱 | 이메일 |

## 输出
只输出 CSV 内容，不要添加任何解释或说明。