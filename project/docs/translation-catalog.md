# LinkChest 完整翻译目录

本文档梳理了 LinkChest 项目所有需要翻译的内容，包含中文原文与英文原文对照。请在 `新语言` 列填入目标语言的翻译结果。

---

## 一、概览统计

| 类别 | 条目数 |
|------|--------|
| Web 端 UI 翻译 | 652 |
| Mobile 端 UI 翻译 | 595 |
| API 错误码消息 | ~88 |
| 硬编码 Web 文本 | ~60 |
| 硬编码 Mobile 文本 | ~12 |
| 邮件模板文本 | ~8 |
| **总计** | **1415** |

---

## 二、Web 端 UI 翻译

来源：`apps/web/src/lib/locales/zh.json` / `en.json`

模板占位符（如 `{title}`、`{count}`）请保留不变。

### account

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| account.accountInfo | 账号信息 | Account Info | |
| account.advancedSetting | 高级设置，修改后可能无法连接 | Advanced setting. Incorrect configuration may cause connection issues. | |
| account.avatar | 头像 | Avatar | |
| account.avatarDeleteFailed | 头像删除失败 | Failed to delete avatar | |
| account.avatarHint | 建议上传正方形图片，将自动裁剪为 200x200 | Square images recommended, will be cropped to 200x200 | |
| account.avatarUploadFailed | 头像上传失败 | Avatar upload failed | |
| account.bindEmail | 绑定邮箱 | Bind Email | |
| account.changeAvatar | 更换头像 | Change Avatar | |
| account.changeEmail | 修改邮箱 | Change Email | |
| account.changePassword | 修改密码 | Change Password | |
| account.checking | 检查中... | Checking... | |
| account.codeSent | 验证码已发送 | Verification code sent | |
| account.confirmChange | 确认换绑 | Confirm Change | |
| account.confirmNewPassword | 确认新密码 | Confirm New Password | |
| account.dangerZone | 危险操作 | Danger Zone | |
| account.dataWillBeDeleted | 你的所有收藏、标签、分组和分享数据将被永久删除。 | All your collections, tags, groups and share data will be permanently deleted. | |
| account.deleteAccount | 删除账号 | Delete Account | |
| account.deleteAccountConfirmPhrase | 删除我的账号 | Delete my account | |
| account.deleteAccountDesc | 永久删除你的账号和所有数据，此操作不可恢复 | Permanently delete your account and all data. This cannot be undone. | |
| account.deleteAccountFailed | 删除账号失败 | Failed to delete account | |
| account.deleteAvatarBtn | 删除头像 | Delete Avatar | |
| account.deleting | 删除中... | Deleting... | |
| account.email | 邮箱 | Email | |
| account.emailBindSuccess | 邮箱绑定成功 | Email bound successfully | |
| account.enterToConfirm | 请输入  | Enter  | |
| account.getCode | 获取验证码 | Get Code | |
| account.googleEmailLocked | Google 登录邮箱不可修改 | Google login email cannot be changed | |
| account.irreversibleWarning | ⚠️ 此操作不可恢复！ | ⚠️ This action is irreversible! | |
| account.localUpload | 从电脑导入 | Upload from Computer | |
| account.newPassword | 新密码 | New Password | |
| account.newPhone | 新手机号 | New Phone Number | |
| account.nicknameFallback | Google 用户 | Google User | |
| account.notBound | 未绑定 | Not bound | |
| account.notSet | 未设置 | Not set | |
| account.oldPassword | 旧密码 | Current Password | |
| account.pageDesc | 管理你的账号信息 | Manage your account information | |
| account.pageTitle | 账号与安全 | Account & Security | |
| account.password | 密码 | Password | |
| account.passwordChangeFailed | 修改密码失败 | Failed to change password | |
| account.passwordChangeSuccess | 密码修改成功 | Password changed successfully | |
| account.passwordHint | 至少8位，包含英文大小写和数字 | At least 8 chars with uppercase, lowercase, and numbers | |
| account.passwordMinLength | 密码至少8位，且包含英文大小写和数字 | Password must be at least 8 characters with uppercase, lowercase, and numbers | |
| account.passwordMismatch | 两次密码不一致 | Passwords do not match | |
| account.passwordSetFailed | 设置密码失败 | Failed to set password | |
| account.passwordSetSuccess | 密码设置成功 | Password set successfully | |
| account.permanentlyDelete | 永久删除 | Permanently Delete | |
| account.phoneChangeFailed | 换绑失败 | Failed to change phone | |
| account.phoneChangeSuccess | 手机号换绑成功 | Phone number changed successfully | |
| account.pleaseEnterEmail | 请输入邮箱 | Please enter email | |
| account.pleaseEnterEmailAddr | 请输入邮箱地址 | Please enter email address | |
| account.pleaseEnterServer | 请输入服务器地址 | Please enter server address | |
| account.pleaseEnterUsername | 请输入用户名 | Please enter username | |
| account.pleaseFillComplete | 请填写完整 | Please fill in completely | |
| account.resetDefault | 恢复默认 | Reset to Default | |
| account.saveFailed | 保存失败 | Save failed | |
| account.saveSuccess | 保存成功 | Saved successfully | |
| account.selectFromCover | 从封面库选择 | Select from Cover Library | |
| account.sendCodeFailed | 发送验证码失败 | Failed to send verification code | |
| account.serverAddress | 服务器地址 | Server Address | |
| account.serverHint | 输入服务器地址（不含 /api 后缀） | Enter server address (without /api suffix) | |
| account.serverPlaceholder | 例如：http://192.168.0.104:3001 | e.g. http://192.168.0.104:3001 | |
| account.serverResetFailed | 重置失败 | Failed to reset | |
| account.serverResetSuccess | 已恢复默认服务器地址 | Default server address restored | |
| account.serverSetFailed | 设置失败 | Failed to set | |
| account.serverUpdateSuccess | 服务器地址已更新，请重新登录 | Server address updated. Please log in again. | |
| account.serverWarning | ⚠️ 仅在开发调试时修改，错误配置将导致无法连接服务器 | ⚠️ Only modify for development/debugging. Incorrect configuration will prevent server connection. | |
| account.set | 已设置 | Set | |
| account.setPassword | 设置密码 | Set Password | |
| account.setUsername | 设置用户名 | Set Username | |
| account.title | 账号设置 | Account Settings | |
| account.toConfirmDelete |  以确认删除： |  to confirm deletion: | |
| account.username | 用户名 | Username | |
| account.usernameAvailable | 用户名可用 | Username available | |
| account.usernamePlaceholder | 2-20位字母、数字、下划线或中文 | 2-20 characters: letters, numbers, underscores, or Chinese | |
| account.usernameTaken | 用户名已被占用 | Username already taken | |
| account.verifyCode | 验证码 | Verification Code | |
| account.yourCodeIs | 您的验证码是：{code}<br>（当前无短信服务，验证码直接显示） | Your code: {code}<br>(SMS not configured, code shown here) | |

### add

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| add.addNote | 添加备注... | Add a note... | |
| add.addToGroup | 添加到分组 * | Add to Group * | |
| add.autoDetectedAs | 已自动识别为：{platform} | Auto-detected as: {platform} | |
| add.collapseMorePlatforms | 收起更多平台 | Collapse More Platforms | |
| add.coverImage | 封面图片 | Cover Image | |
| add.coverImagePlaceholder | 封面图片URL（自动获取或手动填写） | Cover image URL (auto-fetched or manual) | |
| add.createGroup | 创建分组 | Create Group | |
| add.createTag | 创建标签 | Create Tag | |
| add.duplicateWarning | 该链接已收藏过：{title} | This link has been bookmarked: {title} | |
| add.enterTitle | 输入标题 | Enter title | |
| add.fetchingPageInfo | 正在获取页面信息... | Fetching page info... | |
| add.groupNamePlaceholder | 输入分组名称 | Enter group name | |
| add.levelPlatforms | 级平台 | -Tier Platforms | |
| add.linkOrShareText | 链接或分享文本 * | Link or share text * | |
| add.noTitle | 无标题 | No title | |
| add.noteField | 备注（可选，最多100字） | Note (optional, max 100 chars) | |
| add.parseFailed | 解析失败 | Parse failed | |
| add.parsingLink | 正在解析链接... | Parsing link... | |
| add.parsingShareText | 正在解析分享文本... | Parsing share text... | |
| add.pasteLinkPlaceholder | 粘贴链接或APP分享文本（支持抖音、小红书、淘宝等） | Paste link or app share text (supports X, YouTube, TikTok, etc.) | |
| add.platformField | 平台 | Platform | |
| add.pleaseEnterValidLink | 请输入有效的链接或分享文本 | Please enter a valid link or share text | |
| add.pleaseSelectGroup | 请选择一个分组 | Please select a group | |
| add.quickSelectPlatform | 快速选择平台 | Quick Select Platform | |
| add.resolvingShortLink | 正在还原短链... | Resolving short link... | |
| add.saveCollection | 保存收藏 | Save Bookmark | |
| add.saveFailed | 保存失败 | Save failed | |
| add.selectGroup | 选择分组 | Select group | |
| add.selectTags | 选择标签 | Select tags | |
| add.selectedTags | 已选 | Selected | |
| add.shortLinkResolved | （短链已还原） | (Short link resolved) | |
| add.supportShareText | 支持直接粘贴抖音、小红书、淘宝等APP的分享文本 | Supports pasting share text from X, YouTube, TikTok, etc. | |
| add.tagNamePlaceholder | 输入标签名称 | Enter tag name | |
| add.tags | 标签 | Tags | |
| add.title | 添加收藏 | Add Bookmark | |
| add.titleDuplicateWarning | 已存在同名收藏：{title}（仍可继续保存） | Bookmark with same title exists: {title} (you can still save) | |
| add.titleField | 标题 * | Title * | |
| add.viewMorePlatforms | 查看更多平台 | View More Platforms | |

### app

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| app.name | 链藏 | LinkChest | |
| app.nameEn | LinkChest | LinkChest | |
| app.subtitle | 跨平台收藏管理 | Cross-platform Bookmark Manager | |

### collection

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| collection.addFirst | 添加第一条收藏 | Add your first bookmark | |
| collection.addTag | 加标签 | Add Tag | |
| collection.addTagTitle | 添加标签 | Add Tag | |
| collection.batchAddTags | 批量添加标签 | Batch Add Tags | |
| collection.batchManage | 批量管理 | Batch Manage | |
| collection.batchMoveToGroup | 批量移动到分组 | Batch Move to Group | |
| collection.cancel | 取消 | Cancel | |
| collection.clearFilter | 清除筛选 | Clear Filters | |
| collection.default | 默认 | Default | |
| collection.delete | 删除 | Delete | |
| collection.deleteConfirm | 确定删除此收藏？ | Delete this bookmark? | |
| collection.deleted | 已删除「{title}」 | Deleted "{title}" | |
| collection.deselectAll | 全不选 | Deselect All | |
| collection.detail.delete | 删除 | Delete | |
| collection.detail.edit | 编辑 | Edit | |
| collection.detail.groups | 分组 | Groups | |
| collection.detail.note | 备注 | Note | |
| collection.detail.openLink | 打开链接 | Open Link | |
| collection.detail.tags | 标签 | Tags | |
| collection.filter.allGroups | 全部分组 | All Groups | |
| collection.filter.allTags | 全部标签 | All Tags | |
| collection.filter.clear | 清除 | Clear | |
| collection.filter.group | 分组 | Group | |
| collection.filter.platform | 平台 | Platform | |
| collection.filter.tag | 标签 | Tag | |
| collection.filterTitle | 筛选 | Filter | |
| collection.gridView | 网格视图 | Grid View | |
| collection.listView | 列表视图 | List View | |
| collection.loadMore | 加载全部收藏 | Load all bookmarks | |
| collection.moveToGroup | 移到分组 | Move to Group | |
| collection.moveToGroupTitle | 移动到分组 | Move to Group | |
| collection.myCollections | 我的收藏 | My Collections | |
| collection.noCollections | 暂无收藏 | No collections yet | |
| collection.noCollectionsHint | 快去收集你的第一个内容吧！ | Start saving your favorite content! | |
| collection.noCollectionsInFilter | 「{label}」中没有收藏内容 | No collections in "{label}" | |
| collection.noGroupFilter | 当前未按分组筛选 | Not filtering by group | |
| collection.removeFromGroupConfirm | 确定将 {count} 个收藏从当前分组移除？ | Remove {count} bookmarks from current group? | |
| collection.removeGroup | 移出分组 | Remove from Group | |
| collection.removeTag | 移除标签 | Remove Tag | |
| collection.searchPlaceholder | 搜索标题、备注、标签... | Search titles, notes, tags... | |
| collection.selectAll | 全选 | Select All | |
| collection.selectTagsToAdd | 选择要添加的标签： | Select tags to add: | |
| collection.selectTargetGroup | 选择目标分组： | Select target group: | |
| collection.selected | 已选 {count} | {count} selected | |
| collection.selectedItems | 已选 {count} 项 | {count} items selected | |
| collection.selectedItemsTarget | 已选 {count} 个收藏 → 选择{target} | {count} selected → Select {target} | |
| collection.showCount | 已显示 {shown} / {total} 条收藏 | Showing {shown} / {total} bookmarks | |
| collection.table.actions | 操作 | Actions | |
| collection.table.groups | 分组 | Groups | |
| collection.table.platform | 平台 | Platform | |
| collection.table.tags | 标签 | Tags | |
| collection.table.title | 标题 | Title | |
| collection.undoFailed | 撤销失败，请手动重新添加 | Undo failed, please add manually | |

### common

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| common.cancel | 取消 | Cancel | |
| common.close | 关闭 | Close | |
| common.collapseAll | 全部折叠 | Collapse All | |
| common.confirm | 确认 | Confirm | |
| common.createSuccess | 创建成功 | Created successfully | |
| common.delete | 删除 | Delete | |
| common.deleteSuccess | 删除成功 | Deleted successfully | |
| common.edit | 编辑 | Edit | |
| common.error | 错误 | Error | |
| common.expandAll | 全部展开 | Expand All | |
| common.hint | 提示 | Hint | |
| common.listRenamed | 分组名「{originalName}」已存在，已自动重命名为「{name}」 | List name "{originalName}" already exists, auto-renamed to "{name}" | |
| common.loadFailed | 加载失败：{error} | Load failed: {error} | |
| common.loading | 加载中... | Loading... | |
| common.noData | 暂无数据 | No data | |
| common.operationFailed | 操作失败 | Operation failed | |
| common.quotaExceeded | 配额超限，请稍后重试或升级套餐。 | Quota exceeded. Please try again later or upgrade your plan. | |
| common.rateLimited | 请求过于频繁，请稍后再试 | Too many requests. Please try again later. | |
| common.retry | 重试 | Retry | |
| common.save | 保存 | Save | |
| common.success | 成功 | Success | |
| common.tagRenamed | 标签名「{originalName}」已存在，已自动重命名为「{name}」 | Tag name "{originalName}" already exists, auto-renamed to "{name}" | |
| common.undo | 撤销 | Undo | |
| common.updateSuccess | 更新成功 | Updated successfully | |

### cover

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| cover.aiComingSoon | AI 封面生成功能即将上线，敬请期待 | AI cover generation is coming soon | |
| cover.comingSoon | 即将上线 | Coming Soon | |
| cover.currentPreview | 封面预览 | Cover Preview | |
| cover.dragOrClick | 拖拽图片到此处，或点击选择文件 | Drag image here, or click to select | |
| cover.gradientHint | 使用 {platform} 品牌色渐变作为封面 | Use {platform} brand color gradient as cover | |
| cover.modeAi | AI封面 | AI Generate | |
| cover.modeAiDesc | 从系统封面选择 | Smart cover generation | |
| cover.modeGradient | 平台渐变色 | Platform Gradient | |
| cover.modeGradientDesc | 品牌色渐变 | Brand color gradient | |
| cover.modeLibrary | 我的封面 | My Covers | |
| cover.modeLibraryDesc | 从封面库选择 | Choose from library | |
| cover.modeSystem | 系统封面 | System Covers | |
| cover.modeSystemDesc | 从系统封面选择 | Choose from system covers | |
| cover.modeUpload | 本地上传 | Local Upload | |
| cover.modeUploadDesc | 拖拽或选择图片 | Drag or select image | |
| cover.modeUrl | 图片链接 | Image URL | |
| cover.modeUrlDesc | 粘贴图片地址 | Paste image address | |
| cover.noCoversInLibrary | 暂无封面 | No covers yet | |
| cover.quotaExceeded | 封面存储配额已用完，请清理后重试 | Cover storage quota exceeded, please free up space | |
| cover.randomCover | 随机封面 |  | |
| cover.refreshLibrary | 刷新封面库 | Refresh library | |
| cover.tapToUpload | 点击上传 |  | |
| cover.upgradeToUpload | 升级高级版即可上传自定义封面 | Upgrade to Pro to upload custom covers | |
| cover.uploadFailed | 封面上传失败 | Cover upload failed | |
| cover.uploadHint | 建议 2MB 以内，服务端将自动压缩至 80KB 以下 | Recommend under 2MB, server will auto-compress to under 80KB | |
| cover.uploadInvalid | 请选择有效的图片文件 | Please select a valid image file | |
| cover.uploadProOnly | 高级用户专享 | Pro Feature | |
| cover.uploadToSeeHere | 上传封面后将显示在这里 | Uploaded covers will appear here | |
| cover.uploadTooLarge | 图片大小超过 5MB 限制 | Image exceeds 5MB limit | |
| cover.uploading | 正在上传... | Uploading... | |
| cover.uploadingPreview | 上传中... | Uploading... | |
| cover.urlPlaceholder | 粘贴图片 URL | Paste image URL | |

### download

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| download.backToHome | 返回首页 | Back to Home | |
| download.backToLogin | 返回登录 | Back to Login | |
| download.copyright | © 2026 链藏 LinkChest. 保留所有权利。 | © 2026 LinkChest. All rights reserved. | |
| download.downloadApk | 立即下载 APK | Download APK Now | |
| download.feature1Desc | 不限平台均可支持，一键保存好内容 | Unlimited platform support, save great content with one click | |
| download.feature1Title | 全平台收藏 | All-Platform Collection | |
| download.feature2Desc | 自动识别平台来源，支持标签管理，OG元数据智能提取封面 | Auto-detects platform source, supports tags and OG metadata smart cover extraction | |
| download.feature2Title | 智能整理 | Smart Organization | |
| download.feature3Desc | 将收藏分组生成分享页，支持密码保护和有效期设置，宝藏随时分享给好友 | Generate share pages from your collections, with password protection and expiry settings | |
| download.feature3Title | 精美分享 | Beautiful Sharing | |
| download.feature4Desc | 云端实时同步，多端数据保持一致 | Real-time cloud sync keeps data consistent across devices | |
| download.feature4Title | 安全同步 | Secure Sync | |
| download.installGuide | 安装指南 | Installation Guide | |
| download.iosWarning | 检测到您使用的是 iOS 设备。链藏目前仅提供 Android 版本，iOS 版本正在开发中。您可以通过浏览器访问网页版使用全部功能。 | You are using an iOS device. LinkChest currently only supports Android. iOS version is under development. Please use the web version via browser. | |
| download.req1 | Android 8.0 (API 26) 或更高版本 | Android 8.0 (API 26) or higher | |
| download.req2 | 建议预留 50MB 以上存储空间 | Recommend 50MB+ free storage | |
| download.req3 | 需要网络连接用于数据同步 | Network connection required for sync | |
| download.step1 | 点击上方「立即下载 APK」按钮下载安装包 | Click the 'Download APK Now' button above | |
| download.step2 | 下载完成后，点击通知栏中的下载完成提示 | After download completes, tap the notification | |
| download.step3 | 如系统提示「禁止安装未知来源应用」，请前往设置中允许此来源 | If prompted, allow installation from this source in settings | |
| download.step4 | 按提示完成安装，打开 APP 即可开始使用 | Follow the prompts to complete installation | |
| download.subtitle | 收藏并分享你的宝藏 — 跨平台内容聚合管理工具 | Collect and share your treasures — Cross-platform content aggregation tool | |
| download.systemRequirements | 系统要求 | System Requirements | |
| download.title | 下载 链藏 APP | Download LinkChest APP | |

### edit

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| edit.add | 添加 | Add | |
| edit.addNote | 添加备注... | Add a note... | |
| edit.autoDetected | 自动识别 | Auto-detected | |
| edit.coverImage | 封面图片 | Cover Image | |
| edit.coverImagePlaceholder | 封面图片URL（自动获取或手动填写） | Cover image URL (auto-fetched or manual) | |
| edit.delete | 删除 | Delete | |
| edit.deleteConfirm | 确定要删除这个收藏吗？ | Delete this bookmark? | |
| edit.enterTitle | 输入标题 | Enter title | |
| edit.group | 分组 | Group | |
| edit.groupExists | 分组"{name}"已存在，是否继续创建？（将自动重命名） | Group "{name}" already exists. Create anyway? (will auto-rename) | |
| edit.groupNameExists | 分组名"{originalName}"已存在，已自动重命名为"{newName}" | Group "{originalName}" already exists, auto-renamed to "{newName}" | |
| edit.groupRequired | 分组 * | Group * | |
| edit.linkAddress | 链接地址 | Link URL | |
| edit.newGroup | 新建分组 | New Group | |
| edit.newTag | 新建标签 | New Tag | |
| edit.note | 备注 | Note | |
| edit.parseFailed | 解析失败 | Parse failed | |
| edit.pasteLinkOrShareText | 粘贴链接或APP分享文本 | Paste URL or app share text | |
| edit.platformField | 平台 | Platform | |
| edit.pleaseSelectGroup | 请选择一个分组 | Please select a group | |
| edit.reParse | 重新解析 | Re-parse | |
| edit.save | 保存 | Save | |
| edit.saveFailed | 保存失败 | Save failed | |
| edit.saveSuccess | 保存成功 | Saved successfully | |
| edit.saving | 保存中... | Saving... | |
| edit.supportShareText | 支持粘贴抖音、小红书、淘宝等APP的分享文本 | Supports pasting share text from X, YouTube, TikTok, etc. | |
| edit.syncCover | 同步封面 | Sync Cover | |
| edit.syncCoverFailed | 同步封面失败 | Failed to sync cover | |
| edit.syncCoverSame | 当前封面与源相同 | Already the same as source | |
| edit.syncCoverSuccess | 封面已同步 | Cover synced | |
| edit.syncingCover | 正在同步... | Syncing... | |
| edit.tagExists | 标签"{name}"已存在，是否继续创建？（将自动重命名） | Tag "{name}" already exists. Create anyway? (will auto-rename) | |
| edit.tags | 标签 | Tags | |
| edit.title | 编辑收藏 | Edit Bookmark | |
| edit.titleField | 标题 | Title | |
| edit.unrecognizedPlatform | 未识别平台，请确认链接来源 | Unrecognized platform. Please verify the link source. | |

### error

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| error.accountGoogleNoPassword | 该账户通过 Google 登录，请使用 Google 登录后设置密码 | This account uses Google login. Please log in with Google and set a password afterwards | |
| error.accountNotFound | 该账号未注册，请先注册 | Account not found, please register first | |
| error.accountNotSetPassword | 该账号未设置密码 | Password not set for this account | |
| error.appError | 应用发生异常 | Application Error | |
| error.backHome | 返回首页 | Back to Home | |
| error.emailAlreadyRegistered | 该邮箱已被注册 | This email is already registered | |
| error.googleEmailCannotChange | Google 登录用户的邮箱不可修改 | Google login users cannot change their email | |
| error.invalidEmailFormat | 请输入有效的邮箱地址 | Please enter a valid email address | |
| error.invalidPasswordFormat | 密码至少8位，且包含英文大小写和数字 | Password must be at least 8 characters with uppercase, lowercase, and numbers | |
| error.pageDesc | 抱歉，应用遇到了意外错误。请尝试刷新页面或返回首页。 | Sorry, an unexpected error occurred. Try refreshing the page or go back to home. | |
| error.pageTitle | 页面出错了 | Something went wrong | |
| error.passwordIncorrect | 密码错误 | Incorrect password | |
| error.passwordMismatch | 两次密码不一致 | Passwords do not match | |
| error.refresh | 刷新页面 | Refresh Page | |
| error.retry | 重试 | Retry | |
| error.server | 服务器错误，请稍后重试 | Server error, please try again later | |
| error.tokenExpired | 登录已过期，请重新登录 | Session expired, please login again | |
| error.tokenInvalid | 登录已过期，请重新登录 | Session expired, please login again | |
| error.unauthorized | 未授权，请重新登录 | Unauthorized, please login again | |
| error.unknown | 发生了未知错误 | An unknown error occurred | |
| error.userNotFound | 用户不存在 | User not found | |
| error.usernameAlreadyExists | 用户名已被使用 | Username already taken | |
| error.usernameContainsBannedWords | 用户名包含违禁词 | Username contains prohibited words | |
| error.usernameInvalidFormat | 用户名格式不正确 | Invalid username format | |
| error.verificationAttemptsExceeded | 验证码错误次数过多，请重新获取 | Too many failed attempts, please get a new code | |
| error.verificationExpired | 验证码已过期，请重新获取 | Verification code expired, please get a new one | |
| error.verificationInvalid | 验证码错误 | Invalid verification code | |
| error.verificationSendTooFrequent | 发送太频繁，请60秒后重试 | Sent too frequently, please retry after 60 seconds | |

### errors

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| errors.SHARE_COLLECTION_IDS_REQUIRED | 请至少选择一个收藏 | Please select at least one bookmark | |
| errors.SHARE_CREATE_FAILED | 创建分享失败 | Failed to create share | |
| errors.SHARE_DELETE_FAILED | 删除分享失败 | Failed to delete share | |
| errors.SHARE_DELETE_SUCCESS | 分享已删除 | Share deleted successfully | |
| errors.SHARE_FETCH_FAILED | 获取分享列表失败 | Failed to load shares | |
| errors.SHARE_LIST_IDS_REQUIRED | 请至少选择一个分组 | Please select at least one group | |
| errors.SHARE_NOT_FOUND | 分享不存在 | Share not found | |
| errors.SHARE_NO_COLLECTIONS | 没有可分享的收藏 | No collections available to share | |
| errors.SHARE_TAG_IDS_REQUIRED | 请至少选择一个标签 | Please select at least one tag | |
| errors.SHARE_TOGGLE_FAILED | 更新分享状态失败 | Failed to update share status | |

### group

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| group.cannotMoveToDescendant | 不能将分组拖到自己的子分组下 | Cannot move a group into its own subgroup | |
| group.collectionCount | {count} 个收藏 | {count} bookmarks | |
| group.createFailed | 创建分组失败 | Failed to create group | |
| group.defaultGroupNoDelete | 默认分组不可删除 | Default group cannot be deleted | |
| group.defaultName | 我的收藏 | My Collections | |
| group.deleteConfirm | 删除分组"{name}"？其中的收藏将转移到默认分组。 | Delete group "{name}"? Bookmarks in this group will be moved to the default group. | |
| group.deleteConfirmWithChildren | 删除分组"{name}"？其中的收藏将转移到默认分组，子分组将提升到父级。 | Delete group "{name}"? Bookmarks will be moved to the default group, and subgroups will be promoted to parent level. | |
| group.deleteFailed | 删除分组失败 | Failed to delete group | |
| group.deleteSuccessWithChildren | 删除成功，{count} 个子分组已提升到父级。 | Deleted successfully, {count} subgroups moved to parent level. | |
| group.description | 描述（可选） | Description (optional) | |
| group.editGroup | 编辑分组 | Edit Group | |
| group.fetchFailed | 获取分组失败 | Failed to fetch groups | |
| group.groupName | 分组名称 | Group Name | |
| group.groupNotFound | 分组不存在 | Group not found | |
| group.includeSubGroups | 包含子分组 | Include Subgroups | |
| group.management | 分组管理 | Group Management | |
| group.nameExists | 分组"{name}"已存在，是否继续创建？（将自动重命名） | Group "{name}" already exists. Create anyway? (will auto-rename) | |
| group.nameExistsAuto | 分组名"{originalName}"已存在，已自动重命名为"{newName}" | Group "{originalName}" already exists, auto-renamed to "{newName}" | |
| group.nameExistsShort | 分组名已存在 | Group name already exists | |
| group.nameLength | 分组名1-30字符 | Group name must be 1-30 characters | |
| group.nameRequired | 请输入分组名称 | Please enter a group name | |
| group.newGroup | 新建分组 | New Group | |
| group.newSubGroup | 新建子分组 | New Subgroup | |
| group.noGroups | 暂无分组 | No groups yet | |
| group.noGroupsHint | 创建分组来更好地整理你的收藏内容 | Create groups to organize your collections | |
| group.onlyCurrentGroup | 只看当前分组 | Current Group Only | |
| group.save | 保存 | Save | |
| group.subGroupOf | 隶属于 | Subgroup of | |
| group.updateFailed | 更新分组失败 | Failed to update group | |
| group.viewInCollections | 在收藏页查看 | View in Collections | |

### login

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| login.accountPlaceholder | 邮箱 | Email | |
| login.badge | 91 个平台 · 私人藏馆 · 一键收藏 | 91 Platforms · Private Vault · One-click Save | |
| login.codeSent | 验证码已发送 | Verification code sent | |
| login.confirmPassword | 确认密码 | Confirm Password | |
| login.confirmPasswordPlaceholder | 再次输入密码 | Enter password again | |
| login.createAccount | 创建账号 | Create Account | |
| login.email | 邮箱 | Email | |
| login.emailRegister | 邮箱注册 | Email Register | |
| login.enterAccountAndPassword | 请输入账号和密码 | Please enter account and password | |
| login.enterCode | 请输入验证码 | Enter verification code | |
| login.enterEmail | 请输入邮箱 | Enter email | |
| login.enterPassword | 请输入密码 | Enter password | |
| login.feature1Desc | 粘贴即保存 | Paste to Save | |
| login.feature1Label | 一键收录 | One-click Save | |
| login.feature2Desc | 全网内容聚合 | All-in-one Content | |
| login.feature2Label | 91+平台 | 91+ Platforms | |
| login.feature3Desc | 一键分享好内容 | Share with Ease | |
| login.feature3Label | 链接分享 | Share Links | |
| login.fillAllFields | 请填写所有字段 | Please fill in all fields | |
| login.forgotPassword | 忘记密码？ | Forgot Password? | |
| login.forgotPasswordHint | 功能开发中，请通过邮箱客服找回密码 | Feature under development. Please contact support via email to reset password. | |
| login.getCode | 获取验证码 | Get Code | |
| login.goLogin | 去登录 | Login | |
| login.goRegister | 去注册 | Register | |
| login.googleLoginFailed | Google 登录失败，请重试 | Google login failed, please try again | |
| login.googleSetPasswordPrompt | 检测到您通过 Google 登录，建议设置独立密码，以便日后使用邮箱+密码直接登录 | You logged in via Google. Setting a separate password lets you log in with email + password directly. | |
| login.googleSetPasswordWarning | 为了账户安全，建议不要与您的 Google 账户密码一致 | For security, we recommend using a different password from your Google account. | |
| login.hasAccount | 已有账号？ | Already have an account? | |
| login.headline | 解锁你的宝库 | Unlock Your Collection | |
| login.invalidAccountFormat | 请输入有效的邮箱地址 | Please enter a valid email address | |
| login.invalidEmailFormat | 请输入有效的邮箱地址 | Please enter a valid email address | |
| login.langZh | 中文 | 中文 | |
| login.loggingIn | 登录中... | Logging in... | |
| login.login | 登录 | Login | |
| login.loginFailed | 登录失败 | Login failed | |
| login.noAccount | 没有账号？ | No account? | |
| login.otherLoginMethods | 其他登录方式 | Other Login Methods | |
| login.password | 密码 | Password | |
| login.passwordHint | 至少8位，包含英文大小写和数字 | At least 8 chars with uppercase, lowercase, and numbers | |
| login.passwordMinLength | 密码至少8位，且包含英文大小写和数字 | Password must be at least 8 characters with uppercase, lowercase, and numbers | |
| login.passwordMismatch | 两次密码不一致 | Passwords do not match | |
| login.passwordPlaceholder | 输入密码 | Enter password | |
| login.privacyLink | 《隐私政策》 | Privacy Policy | |
| login.register | 注册 | Register | |
| login.registerFailed | 注册失败 | Registration failed | |
| login.registerSuccess | 注册成功 | Registration successful | |
| login.registerTitle | 注册 | Register | |
| login.registering | 注册中... | Registering... | |
| login.sendCodeFailed | 发送验证码失败 | Failed to send verification code | |
| login.subHeadline | 把来自抖音、小红书、B站、淘宝等平台的内容，整理成属于你自己的私人收藏馆。 | Save content from X, TikTok, YouTube, Amazon and more into your personal collection. | |
| login.termsAnd | 和 |  and  | |
| login.termsLink | 《服务条款》 | Terms of Service | |
| login.termsNotice | 登录即表示同意《服务条款》和《隐私政策》 | By logging in, you agree to the Terms of Service and Privacy Policy | |
| login.termsPrefix | 登录即表示同意 | By logging in, you agree to the  | |
| login.termsSuffix |  |  | |
| login.title | 登录 | Login | |
| login.username | 用户名 | Username | |
| login.usernamePlaceholder | 输入用户名 | Enter username | |
| login.welcomeBack | 欢迎回来 | Welcome back | |
| login.yourCodeIs | 您的验证码是：{code} | Your verification code is: {code} | |

### nav

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| nav.addCollection | 添加收藏 | Add Bookmark | |
| nav.collections | 收藏 | Collections | |
| nav.groups | 分组 | Groups | |
| nav.settings | 设置 | Settings | |
| nav.shares | 分享 | Shares | |

### privacy

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| privacy.title | 隐私政策 | Privacy Policy | |

### settings

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| settings.appDownload | APP 下载 | APP Download | |
| settings.appDownloadDesc | 下载 链藏 APP，收藏并分享你的宝藏 | Download LinkChest APP — Collect and share your treasures | |
| settings.collectionCount | {count} 个收藏 | {count} bookmarks | |
| settings.collections | 收藏 | Collections | |
| settings.createTag | 新建标签 | New Tag | |
| settings.csvEmptyOrInvalid | CSV 文件为空或格式不正确 | CSV file is empty or incorrectly formatted | |
| settings.csvMissingUrl | CSV 文件缺少"链接"列 | CSV file missing "URL" column | |
| settings.deleteTagConfirm | 确定删除此标签？ | Delete this tag? | |
| settings.description | 管理你的收藏数据 | Manage your bookmark data | |
| settings.downloadApk | 下载 APK | Download APK | |
| settings.ecommerce | 电商 | E-commerce | |
| settings.editTag | 编辑标签 | Edit Tag | |
| settings.exportCsv | 导出 CSV | Export CSV | |
| settings.exportFailed | 导出失败 | Export failed | |
| settings.exportHtml | 导出 HTML 书签 | Export HTML Bookmarks | |
| settings.groups | 分组 | Groups | |
| settings.htmlEmptyOrInvalid | HTML 文件为空或格式不正确 | HTML file is empty or incorrectly formatted | |
| settings.importComplete | 导入完成：成功 {success}，跳过 {skipped}，失败 {error} | Import complete: {success} succeeded, {skipped} skipped, {error} failed | |
| settings.importConfirm | 将导入 {count} 条收藏，重复URL将跳过。继续？ | Will import {count} bookmarks. Duplicate URLs will be skipped. Continue? | |
| settings.importCsv | 导入 CSV | Import CSV | |
| settings.importExport | 导入 / 导出 | Import / Export | |
| settings.importFailed | 导入失败 | Import failed | |
| settings.importFormatCsv | CSV 格式 | CSV Format | |
| settings.importFormatHtml | HTML 书签格式 | HTML Bookmark Format | |
| settings.importHtml | 导入 HTML 书签 | Import HTML Bookmarks | |
| settings.importNetworkError | 导入失败：无法连接到服务器，请检查网络连接或服务器状态。 | Import failed: Cannot connect to server. Please check network or server status. | |
| settings.importProgress | 导入进度 | Import Progress | |
| settings.importSelectFile | 选择文件 | Select File | |
| settings.language | 语言 | Language | |
| settings.languageEn | English | English | |
| settings.languageZh | 中文 | 中文 | |
| settings.legal | 法律信息 | Legal | |
| settings.newTag | 新建 | New | |
| settings.noStatsHint | 暂无平台统计数据 | No platform statistics yet | |
| settings.noTags | 暂无标签 | No tags yet | |
| settings.noTagsHint | 用标签给你的收藏打上关键词吧 | Add tags to label your bookmarks | |
| settings.noValidData | 未找到有效的收藏数据 | No valid bookmark data found | |
| settings.platformStats | 平台统计 | Platform Stats | |
| settings.shareViews | 分享浏览 | Share Views | |
| settings.shares | 分享 | Shares | |
| settings.stats | 数据统计 | Statistics | |
| settings.tagExists | 标签"{name}"已存在，是否继续创建？（将自动重命名） | Tag "{name}" already exists. Create anyway? (will auto-rename) | |
| settings.tagManagement | 标签管理 | Tag Management | |
| settings.tagName | 标签名称 | Tag Name | |
| settings.tagNameExistsAuto | 标签名"{originalName}"已存在，已自动重命名为"{newName}" | Tag "{originalName}" already exists, auto-renamed to "{newName}" | |
| settings.tags | 标签 | Tags | |
| settings.title | 收藏设置 | Settings | |

### share

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| share.copy | 复制 | Copy | |
| share.copyFailed | 复制失败 | Copy failed | |
| share.copyLink | 复制链接 | Copy Link | |
| share.create.1day | 1天 | 1 Day | |
| share.create.1hour | 1小时 | 1 Hour | |
| share.create.1week | 1周 | 1 Week | |
| share.create.accessPassword | 访问密码（可选） | Access Password (optional) | |
| share.create.allCollections | 全部收藏 | All Collections | |
| share.create.cancel | 取消 | Cancel | |
| share.create.collection | 收藏 | Bookmark | |
| share.create.collectionShare | {count}个收藏分享 | {count} Bookmarks Share | |
| share.create.copyFailed | 复制失败，请手动复制链接 | Copy failed, please copy manually | |
| share.create.copyLink | 复制链接 | Copy Link | |
| share.create.copyToShare | 复制下方链接分享给朋友 | Copy the link below to share | |
| share.create.createFailed | 创建分享失败 | Failed to create share | |
| share.create.done | 完成 | Done | |
| share.create.forever | 永久 | Forever | |
| share.create.generateLink | 生成分享链接 | Generate Share Link | |
| share.create.group | 分组 | Group | |
| share.create.groupShare | 分组分享 | Group Share | |
| share.create.groupsShare | {count}个分组分享 | {count} Groups Share | |
| share.create.linkCopied | 链接已复制 | Link copied | |
| share.create.linkGenerated | 分享链接已生成 | Share link generated | |
| share.create.multiSelectCollections | 多选收藏 | Multi-select | |
| share.create.multiSelectGroups | 多选分组 | Multi-select | |
| share.create.multiSelectTags | 多选标签 | Multi-select | |
| share.create.noCollections | 暂无收藏 | No bookmarks yet | |
| share.create.noGroups | 暂无分组 | No groups yet | |
| share.create.noMatchCollections | 未找到匹配的收藏 | No matching bookmarks | |
| share.create.noPasswordPublic | 不设密码则公开访问 | No password = public access | |
| share.create.noTags | 暂无标签 | No tags yet | |
| share.create.passwordMinLength | 密码至少4个字符 | Password must be at least 4 characters | |
| share.create.pleaseSelectCollection | 请至少选择一个收藏 | Please select at least one bookmark | |
| share.create.pleaseSelectGroup | 请至少选择一个分组 | Please select at least one group | |
| share.create.pleaseSelectTag | 请至少选择一个标签 | Please select at least one tag | |
| share.create.remark | 备注（可选） | Note (optional) | |
| share.create.remarkPlaceholder | 给分享添加说明... | Add a note to this share... | |
| share.create.searchCollections | 搜索收藏... | Search bookmarks... | |
| share.create.selectCollections | 选择收藏 | Select Bookmarks | |
| share.create.selectGroups | 选择分组 | Select Groups | |
| share.create.selectRange | 选择分享范围 | Select Share Scope | |
| share.create.selectTags | 选择标签 | Select Tags | |
| share.create.selectedCount | 已选 {count} 个 | {count} selected | |
| share.create.settings | 分享设置 | Share Settings | |
| share.create.shareAll | 分享所有 | Share all | |
| share.create.shareTitle | 分享标题（留空自动生成） | Share Title (auto-generated if empty) | |
| share.create.shareTitlePlaceholder | 如：我的抖音收藏精选 | e.g. My TikTok Favorites | |
| share.create.tag | 标签 | Tag | |
| share.create.tagShare | 标签分享 | Tag Share | |
| share.create.tagsShare | {count}个标签分享 | {count} Tags Share | |
| share.create.title | 创建分享 | Create Share | |
| share.create.validity | 有效期 | Validity | |
| share.createFirst | 创建第一个分享 | Create your first share | |
| share.createFirstHint | 创建第一个分享链接，将内容分享给其他人 | Create your first share link to share content with others | |
| share.createShare | 创建分享 | Create Share | |
| share.deleteCollection | 删除合集 | Delete Collection | |
| share.deleteCollectionConfirm | 删除合集"{name}"及其中的所有收藏？此操作不可撤销。 | Delete collection "{name}" and all its bookmarks? This cannot be undone. | |
| share.deleteShareConfirm | 确定删除此分享？ | Delete this share? | |
| share.disable | 停用 | Disable | |
| share.disabled | 已停用 | Disabled | |
| share.enable | 启用 | Enable | |
| share.encrypted | 已加密 | Encrypted | |
| share.enterShareCode | 粘贴 LinkChest 分享链接，如：http://xxx/s/xxx | Paste a LinkChest share link, e.g. http://xxx/s/xxx | |
| share.fromShare | 来自分享 | From Share | |
| share.iCreated | 我创建的 | Created | |
| share.iReceived | 获取的分享 | Received | |
| share.itemCount | {count} 个收藏 | {count} bookmarks | |
| share.linkCopied | 链接已复制到剪贴板 | Link copied to clipboard | |
| share.newWindow | 新窗口打开 | Open in new window | |
| share.noReceived | 暂无获取的分享 | No received shares yet | |
| share.noShares | 暂无分享链接 | No share links yet | |
| share.openShare | 打开分享 | Open Share | |
| share.openShareHint | 点击右上角"打开分享"按钮，输入分享码或链接来获取 | Click "Open Share" in the top right to enter a share code or link | |
| share.openShareLink | 打开 | Open | |
| share.password | 访问密码： | Password:  | |
| share.passwordCopied | 密码已复制到剪贴板 | Password copied | |
| share.pasteShareLink | 粘贴分享链接 | Paste share link | |
| share.shareLinks | 分享链接 | Share Links | |
| share.typeAll | 全部收藏 | All Collections | |
| share.typeCollection | 收藏 | Bookmark | |
| share.typeCollections | 收藏 | Bookmarks | |
| share.typeCustom | 自定义收藏 | Custom | |
| share.typeGroup | 分组 | Group | |
| share.typeGroups | 分组 | Groups | |
| share.typeMultiGroup | 多分组 | Multi-Group | |
| share.typeMultiTag | 多标签 | Multi-Tag | |
| share.typeTag | 标签 | Tag | |
| share.typeTags | 标签 | Tags | |
| share.unrecognizedShare | 无法识别的分享链接 | Unrecognized share link | |
| share.view.checkFailed | 检查失败，请稍后重试 | Check failed, please try again | |
| share.view.clickToOpen | 点击打开 | Tap to open | |
| share.view.confirmSave | 确认保存 | Confirm Save | |
| share.view.contentLocked | 内容已加密 | Content Locked | |
| share.view.enterPassword | 输入访问密码 | Enter access password | |
| share.view.generatedBy | 由 LinkChest 生成 · 跨平台收藏聚合工具 | Generated by LinkChest · Cross-platform Bookmark Manager | |
| share.view.importAlreadyImported | 已导入过此分享 | Already Imported | |
| share.view.importAlreadyImportedDesc | 该分享已保存到「{name}」，不可重复导入。 | This share was already saved to "{name}" and cannot be imported again. | |
| share.view.importBtn | 确认导入 | Confirm Import | |
| share.view.importCollectionLimitReached | 收藏数量已达上限 | Bookmark Limit Reached | |
| share.view.importCollectionLimitReachedDesc | 继续导入将超过收藏上限（{current}/{limit}）。 | Importing would exceed your bookmark limit ({current}/{limit}). | |
| share.view.importConfirmDesc | 分享共 {total} 个收藏，其中 {duplicate} 个已存在，{new} 个新增。重复收藏将关联到新分组。 | This share has {total} bookmarks. {duplicate} already exist, {new} will be added. Duplicates will be linked to the new group. | |
| share.view.importConfirmTitle | 确认导入收藏 | Confirm Import | |
| share.view.importListLimitReached | 分组数量已达上限 | Group Limit Reached | |
| share.view.importListLimitReachedDesc | 当前已有 {current}/{limit} 个分组，请先整理后再导入。 | You have {current}/{limit} groups. Please organize before importing. | |
| share.view.loading | 加载中... | Loading... | |
| share.view.loginToSave | 登录后保存到我的收藏 | Log in to save to My Collections | |
| share.view.needPassword | 需要密码才能保存 | Password Required | |
| share.view.needPasswordDesc | 该分享已设置密码，请输入密码后保存 | This share is password-protected. Enter the password to save. | |
| share.view.noContent | 暂无收藏内容 | No bookmarks yet | |
| share.view.noCover | 无封面 | No cover | |
| share.view.passwordRequired | 此分享需要密码 | Password Required | |
| share.view.passwordRequiredDesc | 请输入密码查看完整内容 | Please enter the password to view full content | |
| share.view.passwordSet | 已设置访问密码 | Password set | |
| share.view.passwordUsed | 已保存过，无需密码 | Already saved | |
| share.view.passwordWrong | 密码错误，请重新输入 | Wrong password, please try again | |
| share.view.pleaseEnterPassword | 请输入密码 | Please enter the password | |
| share.view.saveFailed | 保存失败 | Save failed | |
| share.view.saveResultEmpty | 没有可保存的收藏 | Nothing to save | |
| share.view.saveResultSaved | 保存成功，新增 {count} 个收藏 | Saved — {count} new bookmark(s) added | |
| share.view.saveResultSkipped | 所有收藏已存在（{count} 个），已关联到分组 | All {count} already in your library, linked to group | |
| share.view.saveToMyCollections | 一键保存到我的收藏 | Save to My Collections | |
| share.view.savedToGroup | 已保存到分组：{name} | Saved to group: {name} | |
| share.view.savedToMyCollections | 已保存到我的收藏 | Saved to My Collections | |
| share.view.shareExpired | 该分享链接已过期 | This share link has expired | |
| share.view.shareNotFound | 分享链接不存在或已失效 | Share link not found or expired | |
| share.view.validUntil | 有效期至 {date} | Valid until {date} | |
| share.view.verifyPassword | 验证密码 | Verify Password | |
| share.viewCount | {count} 次浏览 | {count} views | |
| share.viewShare | 查看分享 | View Share | |

### sidebar

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| sidebar.account | 用户 | User | |
| sidebar.accountCenter | 个人中心 | Account Center | |
| sidebar.addCollection | 添加收藏 | Add Bookmark | |
| sidebar.appName | 链藏 | LinkChest | |
| sidebar.collapse | 收起侧边栏 | Collapse | |
| sidebar.collections | 收藏 | Collections | |
| sidebar.darkMode | 深色模式 | Dark Mode | |
| sidebar.expand | 展开侧边栏 | Expand | |
| sidebar.groups | 分组 | Groups | |
| sidebar.lightMode | 浅色模式 | Light Mode | |
| sidebar.logout | 退出登录 | Log Out | |
| sidebar.settings | 设置 | Settings | |
| sidebar.shares | 分享 | Shares | |
| sidebar.subtitle | 跨平台收藏管理 | Cross-platform Bookmark Manager | |
| sidebar.tags | 标签 | Tags | |
| sidebar.tier | 等级 | Tier | |
| sidebar.tierManagement | 等级管理 | Tier Management | |

### tag

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| tag.add | 添加 | Add | |
| tag.allTags | 全部标签 | All Tags | |
| tag.collectionCount | {count} 个收藏 | {count} bookmarks | |
| tag.coverPreview | 封面预览 | Cover Preview | |
| tag.defaultCover | 默认封面 | Default Cover | |
| tag.deleteConfirm | 确定删除此标签？ | Delete this tag? | |
| tag.editTag | 编辑标签 | Edit Tag | |
| tag.management | 标签管理 | Tag Management | |
| tag.newTag | 新建标签 | New Tag | |
| tag.noTags | 暂无标签 | No tags yet | |
| tag.save | 保存 | Save | |
| tag.tagExists | 标签"{name}"已存在，是否继续创建？（将自动重命名） | Tag "{name}" already exists. Create anyway? (will auto-rename) | |
| tag.tagName | 标签名称 | Tag Name | |
| tag.tagNameExistsAuto | 标签名"{originalName}"已存在，已自动重命名为"{newName}" | Tag "{originalName}" already exists, auto-renamed to "{newName}" | |
| tag.viewInCollections | 在收藏页查看 | View in Collections | |

### terms

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| terms.title | 服务条款 | Terms of Service | |

### tier

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| tier.backToTier | 返回等级详情 | Back to Tier | |
| tier.benefits | 权益说明 | Benefits | |
| tier.collections | 收藏 | Collections | |
| tier.comparePlans | 套餐对比 | Compare Plans | |
| tier.coverImages | 封面 | Covers | |
| tier.current | 当前使用 | Current | |
| tier.currentPlan | 当前套餐 | Current Plan | |
| tier.free | 免费 | Free | |
| tier.limits | 配额详情 | Quota Details | |
| tier.lists | 分组 | Groups | |
| tier.monthly | 月付 | Monthly | |
| tier.perMonth | {price}/月 | {price}/mo | |
| tier.perYear | {price}/年 | {price}/yr | |
| tier.pricing | 价格 | Pricing | |
| tier.recommended | 推荐 | Recommended | |
| tier.shareItems | 分享项 | Share Items | |
| tier.shares | 分享 | Shares | |
| tier.tags | 标签 | Tags | |
| tier.title | 我的等级 | My Tier | |
| tier.upgrade | 升级套餐 | Upgrade Plan | |
| tier.upgradeHint | 升级以解锁更多功能 | Upgrade to unlock more features | |
| tier.yearly | 年付 | Yearly | |

## 三、Mobile 端 UI 翻译

来源：`apps/mobile/src/lib/locales/zh.json` / `en.json`

模板占位符（如 `{title}`、`{count}`）请保留不变。

### account

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| account.avatarDeleteFailed | 头像删除失败 | Failed to delete avatar | |
| account.avatarDeleted | 头像已删除 | Avatar deleted | |
| account.avatarUpdated | 头像更新成功 | Avatar updated | |
| account.avatarUploadFailed | 头像上传失败 | Avatar upload failed | |
| account.bindEmail | 绑定邮箱 | Bind Email | |
| account.changeAvatar | 更换头像 | Change Avatar | |
| account.changeEmail | 修改邮箱 | Change Email | |
| account.changePassword | 修改密码 | Change Password | |
| account.changePasswordFailed | 修改密码失败 | Failed to change password | |
| account.changePhone | 换绑手机号 | Change Phone | |
| account.changePhoneBtn | 换绑 | Change | |
| account.chooseFromAlbum | 从相册选择 | Choose from Album | |
| account.codeSent | 验证码已发送 | Verification code sent | |
| account.confirmNewPassword | 确认新密码 | Confirm New Password | |
| account.deleteAvatar | 删除头像 | Delete Avatar | |
| account.deleteAvatarBtn | 删除头像 | Delete Avatar | |
| account.deleteAvatarConfirm | 确定要删除头像吗？将恢复默认头像。 | Are you sure you want to delete your avatar? It will be reset to default. | |
| account.email | 邮箱 | Email | |
| account.emailBound | 邮箱绑定成功 | Email bound successfully | |
| account.enterCode | 验证码 | Verification Code | |
| account.enterEmail | 请输入邮箱地址 | Enter email address | |
| account.enterEmailHint | 请输入邮箱 | Please enter an email | |
| account.enterServerAddress | 请输入服务器地址 | Please enter server address | |
| account.enterUsername | 请输入用户名 | Please enter a username | |
| account.fillComplete | 请填写完整 | Please fill in all fields | |
| account.googleEmailLocked | Google 登录邮箱不可修改 | Google login email cannot be changed | |
| account.needPhotoPermission | 需要相册权限才能选择头像 | Photo library permission is required to select an avatar | |
| account.newPassword | 新密码 | New Password | |
| account.newPhone | 新手机号 | New Phone Number | |
| account.nicknameFallback | Google 用户 | Google User | |
| account.notBound | 未绑定 | Not bound | |
| account.notSet | 未设置 | Not set | |
| account.oldPassword | 旧密码 | Old Password | |
| account.password | 密码 | Password | |
| account.passwordChangedSuccess | 密码修改成功 | Password changed successfully | |
| account.passwordHint | 至少8位，包含英文大小写和数字 | At least 8 chars with uppercase, lowercase, and numbers | |
| account.passwordMismatch | 两次密码不一致 | Passwords do not match | |
| account.passwordSetSuccess | 密码设置成功 | Password set successfully | |
| account.resetDefault | 恢复默认 | Reset Default | |
| account.selectFromCover | 从封面选择 | Select from Cover | |
| account.sendCodeFailed | 发送验证码失败 | Failed to send verification code | |
| account.serverAddress | 服务器地址 | Server Address | |
| account.serverExample | 例如：http://192.168.0.104:3001 | e.g. http://192.168.0.104:3001 | |
| account.serverHint | 输入服务器地址（不含 /api 后缀） | Enter server address (without /api suffix) | |
| account.serverReset | 已恢复默认服务器地址 | Server address reset to default | |
| account.serverResetFailed | 重置失败 | Failed to reset | |
| account.serverSetFailed | 设置失败 | Failed to set | |
| account.serverUpdated | 服务器地址已更新，请重新登录 | Server address updated, please log in again | |
| account.serverWarning | 高级设置，修改后可能无法连接 | Advanced: incorrect settings may break connectivity | |
| account.serverWarningDetail | ⚠️ 仅在开发调试时修改，错误配置将导致无法连接服务器 | ⚠️ Only modify for development. Incorrect config will prevent server connection | |
| account.set | 已设置 | Set | |
| account.setPassword | 设置密码 | Set Password | |
| account.setPasswordFailed | 设置密码失败 | Failed to set password | |
| account.setUsername | 设置用户名 | Set Username | |
| account.takePhoto | 拍照 | Take Photo | |
| account.tapToChangeAvatar | 点击更换头像 | Tap to change avatar | |
| account.username | 用户名 | Username | |
| account.usernameChanged | 用户名修改成功 | Username changed successfully | |
| account.usernamePlaceholder | 2-20位字母、数字、下划线或中文 | 2-20 letters, numbers, underscores or Chinese | |
| account.verificationCode | 验证码 | Code | |
| account.yourCodeIs | 您的验证码是：{code}<br>（当前无短信服务，验证码直接显示） | Your code: {code}<br>(SMS not configured, code shown here) | |

### add

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| add.addFailed | 添加失败 | Failed to add | |
| add.addedSuccess | 收藏已添加 | Collection added | |
| add.autoDetectedAs | 已识别：{platform} | Identified: {platform} | |
| add.canStillSave | （仍可保存） |  (can still save) | |
| add.collapseMorePlatforms | 收起更多平台 | Collapse More Platforms | |
| add.coverImagePlaceholder | 封面URL（可选） | Cover URL (optional) | |
| add.createGroup | 创建分组 | Create Group | |
| add.createTag | 创建标签 | Create Tag | |
| add.detected | 已检测到平台信息 | Platform info detected | |
| add.duplicateWarning | 该链接已收藏过：{title} | This link has been saved before: {title} | |
| add.enterTitle | 输入标题 | Enter title | |
| add.groupNamePlaceholder | 输入分组名 | Enter group name | |
| add.levelPlatforms | 级平台 | -Tier Platforms | |
| add.linkOrShareText | 内容链接 * | Content Link * | |
| add.noTitle | 无标题 | No title | |
| add.noteField | 备注（可选） | Note (optional) | |
| add.parseFailed | 链接解析失败 | Link parsing failed | |
| add.parseResultEmpty | 解析结果为空 | Parse result is empty | |
| add.pasteLinkPlaceholder | 粘贴链接或APP分享文本 | Paste link or app share text | |
| add.platformCount | 等{count}个平台 | {count} more platforms | |
| add.pleaseEnterLinkAndTitle | 请填写链接和标题 | Please fill in the link and title | |
| add.quickSelectPlatform | 快速选择平台 | Quick Select Platform | |
| add.saveCollection | 保存收藏 | Save Collection | |
| add.selectGroup | 选择分组 | Select Group | |
| add.selectTags | 选择标签 | Select Tags | |
| add.selectedTags | 已选 | Selected | |
| add.supportedPlatforms | 支持的平台 | Supported Platforms | |
| add.tagNamePlaceholder | 输入标签名 | Enter tag name | |
| add.tags | 标签 | Tags | |
| add.titleDuplicateWarning | 已存在同名收藏：{title} | A collection with this name already exists: {title} | |
| add.titleField | 标题 * | Title * | |
| add.viewMorePlatforms | 查看更多平台 | View More Platforms | |

### app

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| app.name | 链藏 | LinkChest | |
| app.nameEn | LinkChest | LinkChest | |
| app.subtitle | 收藏并分享你的宝藏 | Collect and share your treasures | |
| app.subtitleEn | Collect and share your treasures | Collect and share your treasures | |

### collection

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| collection.add | 添加收藏 | Add Bookmark | |
| collection.addFailed | 添加失败 | Add failed | |
| collection.addFirst | 点击右下角添加 | Tap the button below to add | |
| collection.addTag | 加标签 | Add Tag | |
| collection.addTagFailed | 添加失败 | Failed to add | |
| collection.addTagTitle | 添加标签 | Add Tag | |
| collection.addToTag | 添加收藏到 #{name} | Add collections to #{name} | |
| collection.addToTagBtn | 添加到标签 | Add to Tag | |
| collection.added | 收藏已添加 | Collection added | |
| collection.addedTag | 已添加标签 #{name} | Added tag #{name} | |
| collection.addedTime | 添加时间 | Added Time | |
| collection.applyFilter | 应用筛选 | Apply Filter | |
| collection.batchAddTags | 批量添加标签 | Batch Add Tags | |
| collection.batchDeleteConfirm | 确定要删除选中的 {count} 个收藏吗？ | Are you sure you want to delete {count} selected collections? | |
| collection.batchManage | 批量管理 | Batch Manage | |
| collection.batchMoveToGroup | 批量移动到分组 | Batch Move to Group | |
| collection.cancel | 取消 | Cancel | |
| collection.cannotOpenLink | 无法打开此链接，请尝试手动复制打开 | Cannot open this link. Please try copying it manually | |
| collection.clear | 清除 | Clear | |
| collection.clearFilter | 清除筛选 | Clear Filter | |
| collection.collapse | 收起 | Collapse | |
| collection.confirm | 确认 | Confirm | |
| collection.confirmDelete | 确认删除 | Confirm Delete | |
| collection.contentLink | 内容链接 * | Content Link * | |
| collection.coverUrlOptional | 封面URL（可选） | Cover URL (optional) | |
| collection.default | 默认 | Default | |
| collection.delete | 删除 | Delete | |
| collection.deleteConfirm | 确定要删除"{title}"吗？ | Are you sure you want to delete "{title}"? | |
| collection.deleteWithNoRecover | 确定要删除"{title}"吗？此操作不可恢复。 | Are you sure you want to delete "{title}"? This cannot be undone. | |
| collection.deleted | 收藏已删除 | Collection deleted | |
| collection.deselectAll | 全不选 | Deselect All | |
| collection.detail.delete | 删除 | Delete | |
| collection.detail.edit | 编辑 | Edit | |
| collection.detail.groups | 分组 | Groups | |
| collection.detail.note | 备注 | Note | |
| collection.detail.openLink | 打开链接 | Open Link | |
| collection.detail.tags | 标签 | Tags | |
| collection.duplicateWarning | 该链接已收藏过：{title} | This link has been saved before: {title} | |
| collection.ecommerce | 电商 | E-commerce | |
| collection.enterTitle | 输入标题 | Enter title | |
| collection.error | 错误 | Error | |
| collection.filter | 筛选 | Filter | |
| collection.filterGroupLabel | 分组: {name} | Group: {name} | |
| collection.filterLabel | 筛选: {label} | Filter: {label} | |
| collection.filterTitle | 筛选 | Filter | |
| collection.goBack | 返回 | Go Back | |
| collection.gridView | 网格视图 | Grid View | |
| collection.group | 分组 | Group | |
| collection.identified | 已识别：{name} | Detected: {name} | |
| collection.loadFailed | 加载失败，请返回重试 | Load failed, please go back and retry | |
| collection.loadMore | 加载更多... | Load more... | |
| collection.loadMoreText | 加载更多... | Load more... | |
| collection.morePlatforms | 等{count}个平台 | {count} more platforms | |
| collection.moveFailed | 移动失败 | Failed to move | |
| collection.moveToGroup | 移到分组 | Move to Group | |
| collection.moveToGroupBtn | 移入分组 | Move to Group | |
| collection.moveToGroupName | 移动收藏到「{name}」 | Move collections to "{name}" | |
| collection.moveToGroupTitle | 移动到分组 | Move to Group | |
| collection.movedToGroup | 已移动到「{name}」 | Moved to "{name}" | |
| collection.myCollections | 我的收藏 | My Collections | |
| collection.noCollections | 暂无收藏 | No collections yet | |
| collection.noCollectionsHint | 点击右下角添加 | Tap the button below to add | |
| collection.noItemsToAdd | 没有可添加的收藏 | No items to add | |
| collection.noItemsToAddHint | 没有可添加的收藏 | No items to add | |
| collection.noTitle | 无标题 | No title | |
| collection.notExist | 收藏不存在 | Collection does not exist | |
| collection.originalLink | 原链接 | Original Link | |
| collection.parseFailed | 链接解析失败 | Couldn't recognize this link | |
| collection.parseResultEmpty | 解析结果为空 | Nothing found to parse | |
| collection.parsing | 解析中... | Parsing... | |
| collection.pasteLinkPlaceholder | 粘贴链接或APP分享文本 | Paste link or app share text | |
| collection.platformMultiSelect | 平台（多选） | Platform (Multi-select) | |
| collection.pleaseFillLinkTitle | 请填写链接和标题 | Please fill in the link and title | |
| collection.removeFromGroup | 移出分组 | Remove from Group | |
| collection.removeFromGroupConfirm | 确定将选中的 {count} 个收藏从该分组移除吗？将移至"我的收藏"。 | Are you sure you want to remove {count} selected collections from this group? They will be moved to "My Collections". | |
| collection.removeFromTagConfirm | 确定将选中的 {count} 个收藏从该标签移除吗？ | Are you sure you want to remove {count} selected collections from this tag? | |
| collection.removeTag | 移除标签 | Remove Tag | |
| collection.reset | 重置 | Reset | |
| collection.resetFilter | 重置 | Reset | |
| collection.saveCollection | 保存收藏 | Save Collection | |
| collection.searchPlaceholder | 搜索标题、备注、标签... | Search title, notes, tags... | |
| collection.selectAll | 全选 | Select All | |
| collection.selectAllItems | 全选 | Select All | |
| collection.selectSourceGroup | 请选择来源分组 | Please select a source group | |
| collection.selectSourceGroupHint | 请选择来源分组 | Please select a source group | |
| collection.selectTagsToAdd | 选择要添加的标签 | Choose tags to add | |
| collection.selectTargetGroup | 选择目标分组 | Select a group | |
| collection.selected | 已选 {count} | {count} selected | |
| collection.selectedCount | 已选 {count} | {count} selected | |
| collection.selectedItemsCount | 已选 {count} 项 | {count} selected | |
| collection.selectedItemsTarget | 已选 {count} 个收藏 → 选择{target} | {count} selected → Select {target} | |
| collection.sourceGroup | 选择来源分组： | Select source group: | |
| collection.supportedPlatforms | 支持的平台 | Supported Platforms | |
| collection.table.actions | 操作 | Actions | |
| collection.table.groups | 分组 | Groups | |
| collection.table.platform | 平台 | Platform | |
| collection.table.tags | 标签 | Tags | |
| collection.table.title | 标题 | Title | |
| collection.tableView | 表格视图 | Table View | |
| collection.tag | 标签 | Tag | |
| collection.titleDuplicateWarning | 已存在同名收藏：{title}（仍可保存） | A collection with this name already exists: {title} (can still save) | |
| collection.titleStar | 标题 * | Title * | |
| collection.viewAll | 查看全部 ({count}) | View All ({count}) | |

### common

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| common.cancel | 取消 | Cancel | |
| common.checkNetwork | 请检查网络设置 | Please check your network settings | |
| common.close | 关闭 | Close | |
| common.collapse | 收起 | Collapse | |
| common.collapseAll | 全部折叠 | Collapse All | |
| common.confirm | 确认 | Confirm | |
| common.createSuccess | 创建成功 | Created successfully | |
| common.delete | 删除 | Delete | |
| common.deleteSuccess | 删除成功 | Deleted successfully | |
| common.edit | 编辑 | Edit | |
| common.error | 错误 | Error | |
| common.errorOccurred | 应用出错了 | App Error | |
| common.expandAll | 全部展开 | Expand All | |
| common.hint | 提示 | Hint | |
| common.loadMore | 加载更多... | Load more... | |
| common.loading | 加载中... | Loading... | |
| common.networkError | 网络连接失败 | Network Error | |
| common.noAccess | 无权访问 | Access Denied | |
| common.operationFailed | 操作失败 | Operation failed | |
| common.rateLimited | 请求过于频繁，请稍后再试 | Too many requests. Please try again later. | |
| common.requestTimeout | 请求超时 | Request Timeout | |
| common.retry | 重试 | Retry | |
| common.save | 保存 | Save | |
| common.search | 搜索 | Search | |
| common.serverBusy | 服务器繁忙 | Server Busy | |
| common.success | 成功 | Success | |
| common.tryLater | 请稍后再试 | Please try again later | |
| common.undo | 撤销 | Undo | |
| common.unknownError | 发生了未知错误 | An unknown error occurred | |
| common.updateSuccess | 更新成功 | Updated successfully | |
| common.viewAll | 查看全部 | View All | |

### cover

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| cover.modeAi | AI 封面 | AI Covers | |
| cover.modeLibrary | 我的封面 | My Covers | |

### edit

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| edit.addNote | 添加备注... | Add a note... | |
| edit.aiComingSoon | 智能封面功能即将上线 | Smart cover feature coming soon | |
| edit.coverAiTab | AI封面 | Smart | |
| edit.coverGradientTab | 渐变色 | Gradient | |
| edit.coverImageLink | 封面图片链接 | Cover Image Link | |
| edit.coverImageUrl | 输入封面图片URL | Enter cover image URL | |
| edit.coverLibraryTab | 我的 | My Covers | |
| edit.coverSizeLimit | 图片大小不能超过 5MB | Image size cannot exceed 5MB | |
| edit.coverUploadHint | 建议 2MB 以内，服务端将压缩至 80KB 以下 | Recommended under 2MB, will be compressed to under 80KB | |
| edit.coverUploadTab | 上传 | Upload | |
| edit.coverUrlTab | 链接 | URL | |
| edit.enterTitle | 请输入标题 | Please enter a title | |
| edit.enterVideoTitle | 输入视频标题 | Enter video title | |
| edit.groupField | 所属分组 * | Group * | |
| edit.groupRequired | 所属分组 * | Group * | |
| edit.noCoversInLibrary | 暂无封面 | No covers yet | |
| edit.note | 备注（最多100字） | Note (max 100 chars) | |
| edit.originalLink | 原链接 | Original Link | |
| edit.platform | 平台 | Platform | |
| edit.pleaseSelectGroup | 请选择一个分组 | Please select a group | |
| edit.preview | 预览 | Preview | |
| edit.randomCover | 随机 |  | |
| edit.refreshCover | 刷新封面 | Refresh Cover | |
| edit.refreshCoverFailed | 刷新封面失败 | Failed to refresh cover | |
| edit.refreshCoverSuccess | 封面已刷新 | Cover refreshed | |
| edit.refreshingCover | 正在刷新... | Refreshing... | |
| edit.saveChanges | 保存修改 | Save Changes | |
| edit.saveSuccess | 收藏已更新 | Collection updated | |
| edit.syncCover | 同步封面 | Sync Cover | |
| edit.syncCoverFailed | 同步封面失败 | Failed to sync cover | |
| edit.syncCoverSame | 封面与源相同，无需同步 | Already same as source | |
| edit.syncCoverSuccess | 封面已同步 | Cover synced | |
| edit.syncingCover | 正在同步... | Syncing... | |
| edit.systemCoverTab | 系统 | System | |
| edit.tags | 标签 | Tags | |
| edit.tapToSelectGradient | 点击选择此渐变色 | Tap to select this gradient | |
| edit.tapToUpload | 点击上传 | Tap to upload | |
| edit.title | 编辑收藏 | Edit Collection | |
| edit.titleField | 标题 * | Title * | |
| edit.updateFailed | 更新失败 | Failed to update | |
| edit.uploadFailed | 上传失败 | Upload failed | |
| edit.uploadToSeeHere | 上传封面后将显示在这里 | Uploaded covers will appear here | |

### error

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| error.accountGoogleNoPassword | 该账户通过 Google 登录，请使用 Google 登录后设置密码 | This account uses Google login. Please log in with Google and set a password afterwards | |
| error.accountNotFound | 该账号未注册，请先注册 | Account not found, please register first | |
| error.accountNotSetPassword | 该账号未设置密码 | Password not set for this account | |
| error.emailAlreadyRegistered | 该邮箱已被注册 | This email is already registered | |
| error.emailSendFailed | 验证码邮件发送失败，请稍后重试 | Failed to send verification email, please try again later | |
| error.googleEmailCannotChange | Google 登录用户的邮箱不可修改 | Google login users cannot change their email | |
| error.invalidEmailFormat | 请输入有效的邮箱地址 | Please enter a valid email address | |
| error.invalidGoogleToken | Google 令牌无效 | Invalid Google token | |
| error.invalidPasswordFormat | 密码至少8位，且包含英文大小写和数字 | Password must be at least 8 characters with uppercase, lowercase, and numbers | |
| error.passwordIncorrect | 密码错误 | Incorrect password | |
| error.passwordMismatch | 两次密码不一致 | Passwords do not match | |
| error.quotaExceeded | 资源配额已超出限制，请升级账户或删除部分数据 | Resource quota exceeded. Please upgrade your account or delete some data | |
| error.server | 服务器错误，请稍后重试 | Server error, please try again later | |
| error.tokenExpired | 登录已过期，请重新登录 | Session expired, please login again | |
| error.tokenInvalid | 登录已过期，请重新登录 | Session expired, please login again | |
| error.unauthorized | 未授权，请重新登录 | Unauthorized, please login again | |
| error.unknown | 发生了未知错误 | An unknown error occurred | |
| error.userNotFound | 用户不存在 | User not found | |
| error.usernameAlreadyExists | 用户名已被使用 | Username already taken | |
| error.usernameContainsBannedWords | 用户名包含违禁词 | Username contains prohibited words | |
| error.usernameInvalidFormat | 用户名2-20位字母、数字、下划线或中文 | Username must be 2-20 characters (letters, numbers, underscores or Chinese) | |
| error.verificationAttemptsExceeded | 验证码错误次数过多，请重新获取 | Too many failed attempts, please get a new code | |
| error.verificationExpired | 验证码已过期，请重新获取 | Verification code expired, please get a new one | |
| error.verificationInvalid | 验证码错误 | Invalid verification code | |
| error.verificationSendTooFrequent | 发送太频繁，请60秒后重试 | Sent too frequently, please retry after 60 seconds | |

### group

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| group.collectionCount | {count} 个收藏 | {count} collections | |
| group.continueCreate | 继续创建 | Continue | |
| group.createFailed | 创建失败 | Failed to create | |
| group.createFailedShort | 创建失败 | Failed to create | |
| group.defaultGroupNoDelete | 默认分组不可删除 | Default group cannot be deleted | |
| group.defaultName | 我的收藏 | My Collections | |
| group.deleteConfirm | 删除分组"{name}"？其中的收藏将转移到默认分组。 | Delete group "{name}"? Bookmarks in this group will be moved to the default group. | |
| group.deleteConfirmWithChildren | 删除分组"{name}"？其中的收藏将转移到默认分组，子分组将提升到父级。 | Delete group "{name}"? Bookmarks will be moved to the default group, and subgroups will be promoted to parent level. | |
| group.deleteFailed | 删除分组失败 | Failed to delete group | |
| group.deleteSuccessWithChildren | 删除成功，{count} 个子分组已提升到父级。 | Deleted successfully, {count} subgroups moved to parent level. | |
| group.description | 描述（可选） | Description (optional) | |
| group.directCount | {count} 个直接 | {count} direct | |
| group.editGroup | 编辑分组 | Edit Group | |
| group.fetchFailed | 获取分组失败 | Failed to fetch groups | |
| group.groupName | 分组名称 | Group Name | |
| group.groupNotFound | 分组不存在 | Group not found | |
| group.loading | 加载中... | Loading... | |
| group.management | 分组管理 | Group Management | |
| group.nameExists | 分组"{name}"已存在，是否继续创建？（将自动重命名） | Group "{name}" already exists. Continue creating? (Will be auto-renamed) | |
| group.nameExistsAuto | 分组名"{originalName}"已存在，已自动重命名为"{newName}" | Group name "{originalName}" already exists, auto-renamed to "{newName}" | |
| group.nameExistsShort | 分组名已存在 | Group name already exists | |
| group.nameLength | 分组名1-30字符 | Group name must be 1-30 characters | |
| group.nameRequired | 请输入分组名称 | Please enter a group name | |
| group.newGroup | 新建分组 | New Group | |
| group.newSubGroup | 新建子分组 | New Subgroup | |
| group.noCollectionsInGroup | 暂无收藏 | No collections yet | |
| group.noGroups | 暂无分组 | No groups yet | |
| group.noGroupsHint | 点击右下角创建分组 | Tap the button below to create | |
| group.save | 保存 | Save | |
| group.subGroupOf | 隶属于 | Subgroup of | |
| group.updateFailed | 更新失败 | Failed to update | |
| group.viewInCollections | 在收藏页查看 | View in Collections | |

### login

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| login.accountPlaceholder | 邮箱 | Email | |
| login.codeHint | 验证码将直接显示在弹窗中（当前无短信服务） | Code will pop up (SMS not available) | |
| login.codeSent | 验证码已发送 | Verification code sent | |
| login.confirmNewPassword | 确认新密码 | Confirm New Password | |
| login.confirmPassword | 确认密码 | Confirm Password | |
| login.emailLogin | 邮箱登录 | Sign in with Email | |
| login.emailRegister | 邮箱注册 | Email Register | |
| login.enterAccountAndPassword | 请输入邮箱和密码 | Please enter email and password | |
| login.enterCode | 请输入验证码 | Enter verification code | |
| login.enterEmail | 请输入邮箱 | Enter email | |
| login.enterEmailAndPassword | 请输入邮箱和密码 | Please enter email and password | |
| login.enterPassword | 请输入密码 | Enter password | |
| login.fillAllFields | 请填写所有字段 | Please fill in all fields | |
| login.forgotPassword | 忘记密码？ | Forgot Password? | |
| login.forgotPasswordHint | 请输入验证码设置新密码 | Enter the verification code to set a new password | |
| login.getCode | 获取验证码 | Get Code | |
| login.googleLoginFailed | Google 登录失败，请重试 | Google login failed, please try again | |
| login.googleSetPasswordPrompt | 检测到您通过 Google 登录，建议设置独立密码，以便日后使用邮箱+密码直接登录 | You logged in via Google. Setting a separate password lets you log in with email + password directly. | |
| login.googleSetPasswordWarning | 为了账户安全，建议不要与您的 Google 账户密码一致 | For security, we recommend using a different password from your Google account. | |
| login.hasAccount | 已有账号？去登录 | Already have an account? Login | |
| login.invalidAccountFormat | 请输入有效的邮箱地址 | Please enter a valid email address | |
| login.invalidEmailFormat | 请输入有效的邮箱地址 | Please enter a valid email address | |
| login.login | 登录 | Login | |
| login.loginFailed | 登录失败 | Login failed | |
| login.loginRegister | 登录 / 注册 | Sign In / Sign Up | |
| login.newPassword | 新密码 | New Password | |
| login.noAccount | 没有账号？去注册 | Don't have an account? Register | |
| login.otherLoginMethods | 其他登录方式 | More ways to sign in | |
| login.password | 密码 | Password | |
| login.passwordMinLength | 密码至少8位，且包含英文大小写和数字 | Password must be at least 8 characters with uppercase, lowercase, and numbers | |
| login.passwordMismatch | 两次密码不一致 | Passwords do not match | |
| login.privacyLink | 《隐私政策》 | Privacy Policy | |
| login.register | 注册 | Register | |
| login.resetPassword | 重置密码 | Reset Password | |
| login.sendCodeFailed | 发送验证码失败 | Failed to send verification code | |
| login.termsAnd | 和 |  and  | |
| login.termsLink | 《服务条款》 | Terms of Service | |
| login.termsNotice | 登录即表示同意《服务条款》和《隐私政策》 | By logging in, you agree to the Terms of Service and Privacy Policy | |
| login.termsPrefix | 登录即表示同意 | By logging in, you agree to the  | |
| login.termsSuffix |  |  | |
| login.yourCodeIs | 您的验证码是：{code}<br>（当前无短信服务，验证码直接显示） | Your code: {code}<br>(SMS not configured, code shown here) | |

### nav

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| nav.addCollection | 添加收藏 | Add Bookmark | |
| nav.collectionDetail | 收藏详情 | Collection Detail | |
| nav.collections | 收藏 | Collections | |
| nav.groups | 分组 | Groups | |
| nav.lists | 分组 | Groups | |
| nav.profile | 我的 | Me | |
| nav.settings | 设置 | Settings | |
| nav.shareDetail | 分享详情 | Share Detail | |
| nav.shares | 分享 | Shares | |
| nav.tags | 标签 | Tags | |

### platform

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| platform.distribution | 平台分布 | Platform Distribution | |
| platform.ecommerce | 电商 | E-commerce | |
| platform.loading | 加载中... | Loading... | |
| platform.noData | 暂无收藏数据 | No collection data yet | |
| platform.supported | 支持的平台 | Supported Platforms | |

### privacy

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| privacy.title | 隐私政策 | Privacy Policy | |

### profile

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| profile.accountSettings | 账号设置 | Account Settings | |
| profile.checkUpdate | 检查更新 | Check for Update | |
| profile.collections | 收藏 | Collections | |
| profile.dark | 深色 | Dark | |
| profile.darkMode | 深色模式 | Dark Mode | |
| profile.dataManagement | 数据管理 | Data Management | |
| profile.downloadApk | 下载更新 | Download Update | |
| profile.feedback | 意见反馈 | Feedback | |
| profile.feedbackDev | 如无法打开邮件客户端，请手动发送反馈至 support@linkchest.net | If email client fails to open, please send feedback to support@linkchest.net manually | |
| profile.followSystem | 跟随系统 | Follow System | |
| profile.groups | 分组 | Groups | |
| profile.language | 语言 | Language | |
| profile.languageEn | English | English | |
| profile.languageZh | 中文 | 中文 | |
| profile.light | 浅色 | Light | |
| profile.lightMode | 浅色模式 | Light Mode | |
| profile.logout | 退出登录 | Log Out | |
| profile.logoutBtn | 退出 | Log Out | |
| profile.logoutConfirm | 确定要退出登录吗？ | Are you sure you want to log out? | |
| profile.openDownloadFailed | 无法打开下载页面，请访问 https://linkchest.net/download?lang=zh | Cannot open the download page. Please visit https://linkchest.net/download?lang=en | |
| profile.openStoreFailed | 无法打开应用商店，请手动前往 Google Play 搜索 LinkChest | Cannot open the store. Please manually search for LinkChest on Google Play. | |
| profile.other | 其他 | Other | |
| profile.platformStats | 平台统计 | Platform Stats | |
| profile.shareViews | 分享浏览 | Share Views | |
| profile.shares | 分享 | Shares | |
| profile.tagManagement | 标签管理 | Tag Management | |
| profile.tags | 标签 | Tags | |
| profile.updateDesc | 请选择更新方式 | Please choose an update method | |
| profile.user | 用户 | User | |

### settings

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| settings.collapse | 收起 | Collapse | |
| settings.ecommerce | 电商 | E-commerce | |
| settings.viewAll | 查看全部 | View All | |

### share

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| share.author | 作者 | Author | |
| share.clipboardDetected | 检测到分享链接 | Share Link Detected | |
| share.clipboardDetectedDesc | 剪贴板中包含 LinkChest 分享，是否立即查看？ | A LinkChest share link was found in your clipboard. Would you like to open it? | |
| share.collectionDeleted | 合集已删除 | Collection deleted | |
| share.copy | 复制 | Copy | |
| share.copyFailed | 复制失败 | Copy failed | |
| share.copyPassword | 复制 | Copy | |
| share.create.1hour | 1小时 | 1 Hour | |
| share.create.24hours | 24小时 | 24 Hours | |
| share.create.7days | 7天 | 7 Days | |
| share.create.accessPassword | 访问密码（可选） | Password protection (optional) | |
| share.create.accessPasswordLabel | 访问密码 | Access Password | |
| share.create.advancedSettings | 高级设置 | Advanced Settings | |
| share.create.allCollections | 全部收藏 | All Collections | |
| share.create.collection | 收藏 | Collection | |
| share.create.collectionShare | {count}个收藏分享 | {count} Collections Share | |
| share.create.copyLink | 复制链接 | Copy Link | |
| share.create.createFailed | 创建失败 | Failed to create | |
| share.create.done | 完成 | Done | |
| share.create.forever | 永久 | Forever | |
| share.create.generateLink | 生成分享链接 | Generate Share Link | |
| share.create.group | 分组 | Group | |
| share.create.groupShare | 分组分享 | Group Share | |
| share.create.groupsShare | {count}个分组分享 | {count} Groups Share | |
| share.create.linkGenerated | 分享链接已生成 | Share link generated | |
| share.create.multiSelectCollections | 多选收藏 | Multi-select Collections | |
| share.create.multiSelectGroups | 多选分组 | Multi-select Groups | |
| share.create.multiSelectTags | 多选标签 | Multi-select Tags | |
| share.create.noCollections | 暂无收藏 | No collections yet | |
| share.create.noMatchCollections | 未找到匹配的收藏 | No matching collections found | |
| share.create.passwordPlaceholder | 4-20位密码 | 4-20 character password | |
| share.create.passwordSet | 已设置访问密码 | Access password set | |
| share.create.pleaseSelectCollection | 请至少选择一个收藏 | Please select at least one collection | |
| share.create.pleaseSelectGroup | 请至少选择一个分组 | Please select at least one group | |
| share.create.pleaseSelectTag | 请至少选择一个标签 | Please select at least one tag | |
| share.create.remark | 备注说明（可选） | Note (optional) | |
| share.create.remarkPlaceholder | 给分享添加备注... | Add a note to this share... | |
| share.create.searchCollections | 搜索收藏... | Search collections... | |
| share.create.selectCollections | 选择收藏 | Select Collections | |
| share.create.selectGroups | 选择分组 | Select Groups | |
| share.create.selectRange | 选择分享范围 | Select Share Range | |
| share.create.selectTags | 选择标签 | Select Tags | |
| share.create.selectedCount | 已选 {count} 个 | {count} selected | |
| share.create.shareAll | 分享所有 | Share All | |
| share.create.shareName | 分享名称 | Share Name | |
| share.create.shareNamePlaceholder | 给分享取个名字（可选） | Give your share a name (optional) | |
| share.create.tag | 标签 | Tag | |
| share.create.tagShare | 标签分享 | Tag Share | |
| share.create.tagsShare | {count}个标签分享 | {count} Tags Share | |
| share.create.title | 创建分享 | Create Share | |
| share.create.validity | 有效期 | Expires | |
| share.create.validityPeriod | 有效期：{period} | Validity: {period} | |
| share.create.viewPasswordAnytime | 您可随时在分享管理中查看密码 | You can view this password anytime in Share Management | |
| share.createFirstHint | 点击右下角创建分享 | Tap the button below to create a share | |
| share.createShare | 创建分享 | Create Share | |
| share.deleteCollectionConfirm | 删除合集"{name}"及其中的所有收藏？此操作不可撤销。 | Delete collection "{name}" and all its collections? This cannot be undone. | |
| share.deleteShareConfirm | 删除后分享链接将失效，确定要删除"{title}"吗？ | The share link will be invalid after deletion. Are you sure you want to delete "{title}"? | |
| share.disable | 停用 | Disable | |
| share.disabled | 已停用 | Disabled | |
| share.enable | 启用 | Enable | |
| share.enterShareCode | 粘贴 LinkChest 分享链接，即可查看内容 | Paste a LinkChest share link to view content | |
| share.fromShare | 来自分享 | From Share | |
| share.fromShareLabel | 来自分享 | From Share | |
| share.iCreated | 我创建的 | My Shares | |
| share.iReceived | 获取的分享 | Received Shares | |
| share.importShare | 一键导入 | Import | |
| share.itemCount | {count} 个收藏 | {count} collections | |
| share.linkCopied | 分享链接已生成 | Share link generated | |
| share.management.deleteFailed | 删除失败 | Failed to delete | |
| share.management.passwordAccess | 密码：{password} | Password: {password} | |
| share.management.shareLinkDeleted | 分享链接已删除 | Share link deleted | |
| share.noReceived | 暂无获取的分享 | No received shares | |
| share.noShares | 暂无分享链接 | No share links yet | |
| share.openBtn | 打开 | Open | |
| share.openShare | 打开分享 | Open Share | |
| share.openShareLink | 打开分享链接 | Open Share Link | |
| share.password | 密码：{password} | Password: {password} | |
| share.passwordCopied | 密码已复制 | Password copied | |
| share.pasteShareLink | 粘贴分享链接 | Paste share link | |
| share.pleaseInputLink | 请输入链接 | Please enter a link | |
| share.receivedFromOthers | 从其他用户的分享中保存 | Saved from other users' shares | |
| share.selfShareHint | 这是您自己创建的分享，无需在此打开 | This is your own share, no need to open it here | |
| share.shareLinkDeleted | 分享链接已删除 | Share link deleted | |
| share.shareLinks | 分享链接 | Share Links | |
| share.shareNotExist | 该分享不存在或已失效 | This share does not exist or has expired | |
| share.typeAll | 全部收藏 | All Collections | |
| share.typeCollection | 收藏 | Collection | |
| share.typeCollections | 多收藏 | Multi-Collection | |
| share.typeCustom | 自定义 | Custom | |
| share.typeGroup | 分组 | Group | |
| share.typeGroups | 分组 | Groups | |
| share.typeMultiGroup | 多分组 | Multi-Group | |
| share.typeMultiTag | 多标签 | Multi-Tag | |
| share.typeTag | 标签 | Tag | |
| share.typeTags | 标签 | Tags | |
| share.unrecognizedShare | 未检测到 LinkChest 分享链接，请输入正确的分享链接 | No LinkChest share link detected. Please enter a valid share link | |
| share.unrecognizedTitle | 无法识别 | Unrecognized | |
| share.uvCount | {count} 次浏览 | {count} views | |
| share.view.checkFailed | 检查失败，请稍后重试 | Check failed, please try again | |
| share.view.clickToOpen | 点击打开 | Tap to open | |
| share.view.confirmSave | 确认保存 | Confirm Save | |
| share.view.contentLocked | 内容已加密 | Locked | |
| share.view.enterPassword | 输入访问密码 | Enter access password | |
| share.view.generatedBy | 由 LinkChest 生成 | Generated by LinkChest | |
| share.view.importAlreadyImported | 已导入过此分享 | Already Imported | |
| share.view.importAlreadyImportedDesc | 该分享已保存到「{name}」，不可重复导入。 | This share was already saved to "{name}" and cannot be imported again. | |
| share.view.importBtn | 确认导入 | Confirm Import | |
| share.view.importCollectionLimitReached | 收藏数量已达上限 | Bookmark Limit Reached | |
| share.view.importCollectionLimitReachedDesc | 继续导入将超过收藏上限（{current}/{limit}）。 | Importing would exceed your bookmark limit ({current}/{limit}). | |
| share.view.importConfirmDesc | 分享共 {total} 个收藏，其中 {duplicate} 个已存在，{new} 个新增。重复收藏将关联到新分组。 | This share has {total} bookmarks. {duplicate} already exist, {new} will be added. Duplicates will be linked to the new group. | |
| share.view.importConfirmTitle | 确认导入收藏 | Confirm Import | |
| share.view.importListLimitReached | 分组数量已达上限 | Group Limit Reached | |
| share.view.importListLimitReachedDesc | 当前已有 {current}/{limit} 个分组，请先整理后再导入。 | You have {current}/{limit} groups. Please organize before importing. | |
| share.view.loadFailed | 加载失败 | Load failed | |
| share.view.loading | 加载中... | Loading... | |
| share.view.needPassword | 需要密码才能保存 | Password Required | |
| share.view.needPasswordDesc | 该分享已设置密码，请输入密码后保存 | Enter the password to save this share. | |
| share.view.noContent | 暂无收藏内容 | No collections yet | |
| share.view.noContentHint | 此分享暂无收藏内容 | This share has no bookmark content | |
| share.view.openFailed | 无法打开此链接，请尝试手动复制打开 | Cannot open this link. Please try copying it manually | |
| share.view.passwordRequired | 此分享需要密码 | Password Required | |
| share.view.passwordRequiredDesc | 请输入密码查看完整内容 | Please enter the password to view full content | |
| share.view.passwordSet | 已设置密码 | Password set | |
| share.view.passwordWrong | 密码错误，请重新输入 | Wrong password, please try again | |
| share.view.pleaseEnterPassword | 请输入密码 | Please enter the password | |
| share.view.saveFailed | 保存失败 | Failed to save | |
| share.view.saveToMyCollections | 一键保存到我的收藏 | Save to My Collections | |
| share.view.savedToNewGroup | 已保存到新分组 | Saved to new group | |
| share.view.shareExpired | 分享已过期 | Share Expired | |
| share.view.shareExpiredDesc | 该分享链接已超过有效期 | This share link has expired | |
| share.view.shareNotFound | 分享链接不存在或已失效 | Share link does not exist or has expired | |
| share.view.shareThisLink | 分享此链接 | Share This Link | |
| share.view.undo | 撤销 | Undo | |
| share.view.validUntil | 有效期至 {date} | Valid until {date} | |
| share.view.verifyPassword | 验证密码 | Verify Password | |
| share.viewCount | {count} 次浏览 | {count} views | |
| share.viewShare | 查看 | View | |

### tag

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| tag.collectionCount | {count} 个收藏 | {count} collections | |
| tag.confirmDeleteTag | 删除标签"{name}"？该标签将从所有收藏中移除。 | Delete tag "{name}"? It will be removed from all collections. | |
| tag.continueCreate | 继续创建 | Continue | |
| tag.createFailed | 创建失败 | Failed to create | |
| tag.editTag | 编辑标签 | Edit Tag | |
| tag.enterTagName | 请输入标签名称 | Please enter a tag name | |
| tag.nameDuplicate | 名称重复 | Name Duplicate | |
| tag.nameExists | 标签"{name}"已存在，是否继续创建？（将自动重命名） | Tag "{name}" already exists. Continue creating? (Will be auto-renamed) | |
| tag.newTag | 新建标签 | New Tag | |
| tag.noTags | 暂无标签 | No tags yet | |
| tag.noTagsHint | 用标签给你的收藏打上关键词 | Use tags to add keywords to your collections | |
| tag.tagName | 标签名称 | Tag Name | |
| tag.tagNameExistsAuto | 标签名"{originalName}"已存在，已自动重命名为"{name}" | Tag name "{originalName}" already exists, auto-renamed to "{name}" | |
| tag.updateFailed | 更新失败 | Failed to update | |

### terms

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| terms.title | 服务条款 | Terms of Service | |
| terms.titleAndPrivacy | 服务条款&隐私政策 | Terms & Privacy | |

### tier

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| tier.benefits | 权益说明 | Benefits | |
| tier.collections | 收藏数量 | Collections | |
| tier.comparePlans | 套餐对比 | Compare Plans | |
| tier.coverImages | 封面数量 | Covers | |
| tier.current | 当前 | Current | |
| tier.currentPlan | 当前套餐 | Current Plan | |
| tier.expires | 到期 | Expires | |
| tier.free | 免费 | Free | |
| tier.limits | 配额详情 | Quota Limits | |
| tier.lists | 分组数量 | Groups | |
| tier.monthly | 月付 | Monthly | |
| tier.perMonth | /月 | /mo | |
| tier.perYear | /年 | /yr | |
| tier.shareItems | 分享项数量 | Share Items | |
| tier.shares | 分享数量 | Shares | |
| tier.tags | 标签数量 | Tags | |
| tier.tierManagement | 等级管理 | Plan Management | |
| tier.title | 等级与套餐 | Plan & Tier | |
| tier.upgrade | 升级套餐 | Upgrade | |
| tier.upgradeHint | 选择适合你的套餐 | Choose a plan that fits you | |
| tier.yearly | 年付 | Yearly | |

## 四、API 错误码消息

来源：`apps/api/src/lib/errorCodes.ts`

当前 API 同时返回 `message`（中文）和 `messageEn`（英文）。建议改为仅返回错误码，由前端根据 locale 查表。

| 错误码 | 中文 | English | 新语言 |
|--------|------|---------|--------|
| UNKNOWN_ERROR | 发生了未知错误 | An unknown error occurred | |
| SERVER_ERROR | 服务器错误 | Server error | |
| VERIFICATION_SEND_TOO_FREQUENT | 发送太频繁，请60秒后重试 | Too many requests, please try again in 60 seconds | |
| VERIFICATION_EXPIRED | 验证码已过期，请重新获取 | Verification code expired, please request a new one | |
| VERIFICATION_INVALID | 验证码错误 | Invalid verification code | |
| VERIFICATION_ATTEMPTS_EXCEEDED | 验证码错误次数过多，请重新获取 | Too many failed attempts, please request a new code | |
| EMAIL_SEND_FAILED | 验证码邮件发送失败，请稍后重试 | Failed to send verification email, please try again later | |
| ACCOUNT_NOT_FOUND | 该账号未注册，请先注册 | Account not found, please register first | |
| PASSWORD_INCORRECT | 密码错误 | Incorrect password | |
| ACCOUNT_NOT_SET_PASSWORD | 该账号未设置密码 | This account has not set a password | |
| ACCOUNT_GOOGLE_NO_PASSWORD | 该账户通过 Google 登录，请使用 Google 登录后设置密码 | This account uses Google login, please log in with Google and set a password | |
| ACCOUNT_SUSPENDED | 账号已被暂停使用，请联系管理员 | Account suspended, please contact support | |
| ACCOUNT_BANNED | 账号已被封禁，请联系管理员 | Account banned, please contact support | |
| ACCOUNT_LOCKED | 登录失败次数过多，账号已锁定，请15分钟后重试 | Too many failed login attempts, account locked. Please try again in 15 minutes | |
| EMAIL_ALREADY_REGISTERED | 该邮箱已被注册 | This email is already registered | |
| USERNAME_ALREADY_EXISTS | 用户名已被使用 | Username already taken | |
| USERNAME_CONTAINS_BANNED_WORDS | 用户名包含违禁词 | Username contains prohibited words | |
| INVALID_EMAIL_FORMAT | 请输入有效的邮箱地址 | Please enter a valid email address | |
| INVALID_PASSWORD_FORMAT | 密码至少8位，且包含英文大小写和数字 | Password must be at least 8 characters with uppercase, lowercase, and numbers | |
| PASSWORD_MISMATCH | 两次密码不一致 | Passwords do not match | |
| USERNAME_INVALID_FORMAT | 用户名2-20位字母、数字、下划线或中文 | Username must be 2-20 characters using letters, numbers, underscores, or Chinese characters | |
| TOKEN_INVALID | Token无效 | Invalid token | |
| TOKEN_EXPIRED | Token已过期 | Token expired | |
| UNAUTHORIZED | 未授权 | Unauthorized | |
| INVALID_GOOGLE_TOKEN | Google 令牌无效 | Invalid Google token | |
| GOOGLE_EMAIL_CANNOT_CHANGE | Google 登录用户的邮箱不可修改 | Google login users cannot change their email | |
| USER_NOT_FOUND | 用户不存在 | User not found | |
| COLLECTION_FETCH_FAILED | 获取收藏失败 | Failed to fetch collections | |
| COLLECTION_CREATE_FAILED | 添加收藏失败 | Failed to add collection | |
| COLLECTION_UPDATE_FAILED | 更新收藏失败 | Failed to update collection | |
| COLLECTION_DELETE_FAILED | 删除收藏失败 | Failed to delete collection | |
| COLLECTION_NOT_FOUND | 收藏不存在 | Collection not found | |
| COLLECTION_BATCH_DELETE_FAILED | 批量删除失败 | Batch delete failed | |
| COLLECTION_BATCH_ADD_TAGS_FAILED | 批量添加标签失败 | Batch add tags failed | |
| COLLECTION_BATCH_UPDATE_FAILED | 批量更新失败 | Batch update failed | |
| COLLECTION_IMPORT_FAILED | 导入失败 | Import failed | |
| COLLECTION_EXPORT_FAILED | 导出失败 | Export failed | |
| COLLECTION_DUPLICATE | 收藏已存在 | Collection already exists | |
| COLLECTION_CHECK_DUPLICATE_FAILED | 查询失败 | Query failed | |
| COLLECTION_SMART_PARSE_FAILED | 解析失败 | Parse failed | |
| COLLECTION_PARSE_URL_FAILED | 抓取页面信息失败 | Failed to fetch page information | |
| COLLECTION_EXTRACT_URL_FAILED | 提取链接失败 | Failed to extract links | |
| COLLECTION_INVALID_IMPORT_DATA | 无效的导入数据 | Invalid import data | |
| COLLECTION_IMPORT_TOO_MANY | 单次最多导入2000条 | Maximum 2000 items per import | |
| COLLECTION_UNAUTHORIZED_TAG | 包含不属于当前用户的标签 | Contains tags not belonging to the current user | |
| LIST_FETCH_FAILED | 获取分组失败 | Failed to fetch lists | |
| LIST_CREATE_FAILED | 创建分组失败 | Failed to create list | |
| LIST_UPDATE_FAILED | 更新分组失败 | Failed to update list | |
| LIST_DELETE_FAILED | 删除分组失败 | Failed to delete list | |
| LIST_NOT_FOUND | 分组不存在 | List not found | |
| LIST_REORDER_FAILED | 排序更新失败 | Failed to update sort order | |
| LIST_NAME_EXISTS | 分组名已存在 | List name already exists | |
| LIST_PARENT_NOT_FOUND | 父分组不存在 | Parent list not found | |
| LIST_MAX_DEPTH_EXCEEDED | 最多支持3级分组 | Maximum 3 levels of nesting supported | |
| LIST_CANNOT_MOVE_TO_SELF | 不能将分组设为自己 | Cannot move a list to itself | |
| LIST_CANNOT_MOVE_TO_CHILD | 不能将分组移到自己的子分组下 | Cannot move a list to its own child | |
| LIST_DEFAULT_CANNOT_DELETE | 默认分组不可删除 | Default list cannot be deleted | |
| TAG_FETCH_FAILED | 获取标签失败 | Failed to fetch tags | |
| TAG_CREATE_FAILED | 创建标签失败 | Failed to create tag | |
| TAG_UPDATE_FAILED | 更新标签失败 | Failed to update tag | |
| TAG_DELETE_FAILED | 删除标签失败 | Failed to delete tag | |
| TAG_NOT_FOUND | 标签不存在 | Tag not found | |
| TAG_REORDER_FAILED | 排序更新失败 | Failed to update sort order | |
| TAG_NAME_EXISTS | 标签名已存在 | Tag name already exists | |
| SHARE_FETCH_FAILED | 获取分享失败 | Failed to fetch share | |
| SHARE_CREATE_FAILED | 创建分享失败 | Failed to create share | |
| SHARE_DELETE_FAILED | 删除分享失败 | Failed to delete share | |
| SHARE_TOGGLE_FAILED | 切换分享状态失败 | Failed to toggle share status | |
| SHARE_NOT_FOUND | 分享不存在 | Share not found | |
| SHARE_LIST_IDS_REQUIRED | 请提供要分享的分组ID | Please provide list IDs to share | |
| SHARE_TAG_IDS_REQUIRED | 请提供要分享的标签ID | Please provide tag IDs to share | |
| SHARE_COLLECTION_IDS_REQUIRED | 请提供要分享的收藏ID | Please provide collection IDs to share | |
| SHARE_NO_COLLECTIONS | 没有可分享的收藏 | No collections to share | |
| SHARE_VIEW_RECORD_FAILED | 记录浏览失败 | Failed to record view | |
| PUBLIC_SHARE_NOT_FOUND | 分享链接不存在或已失效 | Share link not found or inactive | |
| PUBLIC_SHARE_EXPIRED | 分享链接已过期 | Share link has expired | |
| PUBLIC_SHARE_NO_PASSWORD_NEEDED | 该分享无需密码 | This share does not require a password | |
| PUBLIC_SHARE_PASSWORD_INCORRECT | 密码错误 | Incorrect password | |
| PUBLIC_SHARE_VERIFY_FAILED | 验证失败 | Verification failed | |
| PUBLIC_SHARE_SAVE_FAILED | 保存失败 | Failed to save | |
| PUBLIC_SHARE_ALREADY_IMPORTED | 已保存或订阅过该分享 | You have already saved or subscribed to this share | |
| UPLOAD_MISSING_IMAGE_DATA | 缺少图片数据 | Missing image data | |
| UPLOAD_INVALID_IMAGE_DATA | 无效的图片数据 | Invalid image data | |
| UPLOAD_INVALID_IMAGE_FORMAT | 无效的图片格式 | Invalid image format | |
| UPLOAD_FILE_TOO_LARGE | 文件大小超过限制 | File size exceeds the limit | |
| UPLOAD_COVER_FAILED | 封面上传失败 | Cover upload failed | |
| UPLOAD_AVATAR_FAILED | 头像上传失败 | Avatar upload failed | |
| UPLOAD_AVATAR_DELETE_FAILED | 头像删除失败 | Avatar delete failed | |
| UPLOAD_COVER_LIBRARY_FETCH_FAILED | 获取封面库失败 | Failed to fetch cover library | |
| COVER_SYNC_FAILED | 封面同步失败 | Cover sync failed | |
| COVER_SYNC_NO_SOURCE | 无可同步的封面源 | No cover source to sync | |
| QUOTA_FETCH_FAILED | 获取配额失败 | Failed to fetch quota | |
| QUOTA_COLLECTIONS_EXCEEDED | 收藏数量已达上限 | Collection limit reached | |
| QUOTA_TAGS_EXCEEDED | 标签数量已达上限 | Tag limit reached | |
| QUOTA_LISTS_EXCEEDED | 分组数量已达上限 | List limit reached | |
| QUOTA_SHARES_EXCEEDED | 分享数量已达上限 | Share limit reached | |
| QUOTA_COVER_IMAGES_EXCEEDED | 封面图片数量已达上限 | Cover image limit reached | |
| QUOTA_SHARE_ITEMS_EXCEEDED | 分享项数量已达上限 | Share item limit reached | |
| STATS_PLATFORM_FETCH_FAILED | 获取平台统计失败 | Failed to fetch platform statistics | |
| STATS_OVERVIEW_FETCH_FAILED | 获取总览统计失败 | Failed to fetch overview statistics | |
| SUBSCRIPTION_IMPORT_FAILED | 导入分享失败 | Failed to import share | |
| SUBSCRIPTION_SHARE_NOT_FOUND | 分享不存在 | Share not found | |
| SUBSCRIPTION_ALREADY_IMPORTED | 已导入过该分享 | You have already imported this share | |
| SUBSCRIPTION_FETCH_FAILED | 获取订阅信息失败 | Failed to fetch subscription info | |
| SUBSCRIPTION_NOT_FOUND | 订阅不存在 | Subscription not found | |
| SUBSCRIPTION_ALREADY_ACTIVE | 已有有效订阅 | You already have an active subscription | |
| SUBSCRIPTION_EXPIRED | 订阅已过期 | Subscription expired | |
| SUBSCRIPTION_INVALID_TIER | 无效的套餐等级 | Invalid subscription tier | |
| SUBSCRIPTION_INVALID_CYCLE | 无效的计费周期 | Invalid billing cycle | |
| SUBSCRIPTION_EXPIRY_CHECK_FAILED | 订阅到期检查失败 | Subscription expiry check failed | |
| TIER_FETCH_FAILED | 获取等级配置失败 | Failed to fetch tier config | |
| TIER_NOT_FOUND | 等级配置不存在 | Tier config not found | |
| TIER_CREATE_FAILED | 创建等级配置失败 | Failed to create tier config | |
| TIER_UPDATE_FAILED | 更新等级配置失败 | Failed to update tier config | |
| TIER_DELETE_FAILED | 删除等级配置失败 | Failed to delete tier config | |
| TIER_KEY_EXISTS | 等级标识已存在 | Tier key already exists | |

## 五、硬编码 Web 文本

以下文本直接硬编码在代码中，未通过 i18n 系统管理，需要提取到翻译文件或改为动态读取。

### 5.1 SEO / 页面元数据 (`apps/web/src/app/layout.tsx`)

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| layout.title | 链藏 LinkChest - 全网好内容，一键收入链藏 | — | |
| layout.description | 跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。 | — | |
| layout.ogLocale | zh_CN | — | |
| layout.siteName | 链藏 LinkChest | — | |
| layout.appleWebAppTitle | 链藏 LinkChest | — | |
| layout.htmlLang | zh-CN | — | |

### 5.2 404 页面 (`apps/web/src/app/not-found.tsx`)

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| notFound.title | 页面未找到 | — | |
| notFound.desc | 抱歉，您访问的页面不存在或已被移除。 | — | |
| notFound.backHome | 返回首页 | — | |

### 5.3 分享页 SEO (`apps/web/src/app/s/[shareId]/page.tsx`)

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| sharePage.fallbackTitle | 链藏 LinkChest 分享 | — | |
| sharePage.fallbackDesc | 查看 LinkChest 分享的内容收藏 | — | |
| sharePage.titleSuffix | 链藏 LinkChest | — | |
| sharePage.ogImageAlt | 链藏 LinkChest | — | |

### 5.4 下载页 SEO (`apps/web/src/app/download/layout.tsx`)

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| download.title | 下载 LinkChest APP - 链藏 | — | |
| download.description | 下载 LinkChest 安卓 APP，随时随地管理你的跨平台收藏。 | — | |
| download.ogTitle | 下载 LinkChest APP | — | |
| download.ogDesc | 下载 LinkChest 安卓 APP，随时随地管理你的跨平台收藏。 | — | |

### 5.5 管理后台仪表盘 (`apps/web/src/app/admin/page.tsx`)

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| admin.metric.requests1h | 1小时请求量 | — | |
| admin.metric.errorRate1h | 1小时错误率 | — | |
| admin.metric.avgDuration | 平均响应时间 | — | |
| admin.metric.activeErrors | 活跃错误事件 | — | |
| admin.metric.subValue24h | 24小时 | — | |
| admin.metric.subValue24hAvg | 24小时平均 | — | |
| admin.metric.subValuePendingConfirmed | 待处理 / 已确认 | — | |
| admin.chart.trafficTrend | 最近1小时流量趋势 | — | |
| admin.chart.errorDistribution | Top 错误分布 | — | |
| admin.chart.noErrorData | 暂无错误数据 | — | |
| admin.section.recentErrors | 最近错误事件 | — | |
| admin.section.recentAlerts | 最近告警 | — | |
| admin.section.systemResources | 系统资源 | — | |
| admin.section.sharePerformance | 分享页性能 | — | |
| admin.section.upgradeSuggestions | 升级建议与容量规划 | — | |
| admin.status.pending | 待处理 | — | |
| admin.status.confirmed | 已确认 | — | |
| admin.status.fixed | 已修复 | — | |
| admin.status.ignored | 已忽略 | — | |
| admin.trend.up | 上升 | — | |
| admin.trend.down | 下降 | — | |
| admin.trend.flat | 持平 | — | |
| admin.system.physicalMemory | 物理内存 | — | |
| admin.system.nodeHeap | Node.js 堆内存 | — | |
| admin.system.cpuLoad | CPU 负载 | — | |
| admin.system.cpuCoresSuffix | 核 | — | |
| admin.system.nodeRss | Node.js RSS | — | |
| admin.share.cacheHitRate1h | 缓存命中率 (1h) | — | |
| admin.share.shareRequests1h | 分享页请求 (1h) | — | |
| admin.share.shareQps | 分享页 QPS (预估) | — | |
| admin.share.avgDuration1h | 平均响应 (1h) | — | |
| admin.share.avgDuration24h | 平均响应 (24h) | — | |
| admin.error.loadFailed | 加载仪表盘数据失败 | — | |
| admin.error.retry | 重试 | — | |
| admin.suggestion.currentConfig | 当前配置 | — | |
| admin.suggestion.thresholds | 关键阈值 | — | |
| admin.suggestion.noSuggestions | 当前系统运行平稳，暂无升级建议。继续监控即可。 | — | |

## 六、硬编码 Mobile 文本

### 6.1 等级/套餐页面 (`TierScreen.tsx` / `TierUpgradeScreen.tsx`)

以下 `limitInfo` 对象中的文本直接硬编码，未使用全局 `t()` 翻译系统。

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| tierLimit.collections | 收藏数量 | Collections | |
| tierLimit.tags | 标签数量 | Tags | |
| tierLimit.lists | 分组数量 | Groups | |
| tierLimit.shares | 分享数量 | Shares | |
| tierLimit.shareItems | 分享项 | Share Items | |
| tierLimit.coverImages | 封面数量 | Covers | |

## 七、邮件模板文本

来源：`apps/api/src/services/ses.ts`

| Key | 中文 | English | 新语言 |
|-----|------|---------|--------|
| email.verificationSubject | 验证码 | — | |
| email.alertPriority.P0 | 紧急 | — | |
| email.alertPriority.P1 | 严重 | — | |
| email.alertPriority.P2 | 一般 | — | |
| email.alertPriority.P3 | 提示 | — | |
| email.alertTitle | LinkChest 运维告警 | — | |
| email.alertField.priority | 优先级 | — | |
| email.alertField.rule | 规则 | — | |
| email.alertField.detail | 详情 | — | |
| email.alertField.time | 时间 | — | |
| email.alertFooter | 此邮件由 LinkChest 自动告警系统发送，请勿回复。 | — | |
| email.dateFormatLocale | zh-CN | — | |

---

## 附录：使用说明

1. **Web 翻译文件**：`apps/web/src/lib/locales/` 目录下新增 `{lang}.json`，结构同 `zh.json`。
2. **Mobile 翻译文件**：`apps/mobile/src/lib/locales/` 目录下新增 `{lang}.json`，结构同 `zh.json`。
3. **API 错误码**：建议改为仅返回错误码，由前端根据 `locale` 查表，而非返回双语言 `message` / `messageEn`。
4. **硬编码文本**：需要将上述硬编码文本提取到对应的翻译 JSON 文件中，并在代码中改为 `t('key')` 调用。
5. **邮件模板**：SES 模板需要在腾讯云控制台创建对应语言版本的模板，并在代码中根据 `locale` 选择模板 ID。
