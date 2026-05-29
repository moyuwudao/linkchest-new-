# Google Play Store 上架指南

> 本文档指导 LinkChest Android 海外版在 Google Play Store 上架的完整流程。
> **快速参考级，关键步骤+注意事项。**

---

## 一、基础信息

| 项目 | 值 |
|------|-----|
| 平台 | Google Play Store |
| 平台地址 | https://play.google.com/console |
| 应用名称 | LinkChest |
| 包名 | com.linkchest.app |
| 构建方式 | Expo + EAS Build |
| 开发者账号 | ✅ 已申请（$25已付） |

---

## 二、构建AAB

### 2.1 构建命令

海外版使用 EAS Build 构建 AAB 文件（Google Play 要求 AAB 格式）：

```bash
eas build --profile production-global --platform android
```

> **注意：**
> - Google Play 不接受 APK，必须使用 AAB（Android App Bundle）
> - 确保 `MARKET=global` 环境变量正确设置
> - EAS Build 云端构建，自动签名

### 2.2 构建产物验证

```bash
# 检查包名
aapt2 dump badging *.aab 2>/dev/null | grep package
# 期望: name='com.linkchest.app'

# 检查应用名称
aapt2 dump badging *.aab 2>/dev/null | grep application-label
# 期望: application-label: 'LinkChest'

# 检查包含海外域名
grep "linkchest.net" bundle.js 2>/dev/null
# 期望: 有匹配
```

### 2.3 Google Play App Signing

Google Play 会自动管理 AAB 签名：
1. 首次上传 AAB 时，Google 会生成上传密钥
2. 后续上传需使用同一上传密钥
3. 在 Play Console →「设置」→「应用完整性」中管理

---

## 三、上传发布

### 3.1 登录 Google Play Console

1. 访问 https://play.google.com/console
2. 使用已注册的开发者账号登录
3. 点击「创建应用」

### 3.2 创建应用

| 字段 | 填写内容 |
|------|---------|
| 应用名称 | LinkChest |
| 默认语言 | English (US) |
| 应用类型 | Application |
| 免费/付费 | Free（后续可内购） |
| 接受 Google Play 政策 | ✅ 勾选 |

### 3.3 填写商店信息

| 字段 | 填写内容 | 备注 |
|------|---------|------|
| 应用名称 | LinkChest | ≤30字符 |
| 短描述 | Your Digital Collection Hub | ≤80字符 |
| 长描述 | 见产品基础信息详细介绍 | ≤4000字符 |
| 应用分类 | Productivity | - |
| 联系邮箱 | support@linkchest.net | 必须有效 |
| 隐私政策URL | https://linkchest.net/privacy | 必须可访问 |

### 3.4 上传材料

| 材料 | 规格 | 数量 |
|------|------|------|
| 应用图标 | 512x512 PNG 32位（Alpha通道） | 1张 |
| 特色图片(Feature Graphic) | 1024x500 PNG/JPEG | 1张 |
| 手机截图 | 16:9 或 9:16 PNG/JPEG，≤8MB/张 | 2-8张 |

### 3.5 上传AAB

1. 进入「发布」→「Production」
2. 点击「Create new release」
3. 上传 `.aab` 文件
4. 填写版本说明（Release Notes）
5. 点击「Save」→「Review release」→「Start rollout to Production」

---

## 四、Google Play 特殊要求

### 4.1 Content Rating（内容分级）

1. 进入「商店信息」→「Content rating」
2. 完成分级问卷
3. 选择「Everyone」（全年龄）

### 4.2 Data Safety（数据安全）

1. 进入「商店信息」→「Data safety」
2. 填写数据收集情况：

| 数据类型 | 是否收集 | 是否共享 | 用途 |
|---------|---------|---------|------|
| 电子邮件地址 | ✅ | ❌ | 账户管理 |
| 个人信息 | ✅ | ❌ | 应用功能 |
| 设备ID | ✅ | ❌ | 分析 |
| 应用交互数据 | ✅ | ❌ | 应用功能 |

3. 声明加密传输：✅ Yes, data is encrypted in transit
4. 声明用户可请求删除数据：✅ Yes

### 4.3 Target Audience（目标受众）

- 选择「All ages」或指定年龄段
- 确认不含面向儿童的数据收集

---

## 五、审核要求

### 5.1 必需资质

| 资质 | 状态 | 说明 |
|------|------|------|
| 隐私政策 | ✅ 已上线 | 必须可访问 |
| Content Rating | ⬜ 待填写 | Google Play Console内完成 |
| Data Safety | ⬜ 待填写 | Google Play Console内完成 |
| 测试说明 | ⬜ 待填写 | 提供测试账号（如需登录） |

### 5.2 政策合规

| 政策 | 状态 | 说明 |
|------|------|------|
| 开发者分发协议 | ✅ 已接受 | 注册时接受 |
| 隐私政策要求 | ✅ 已上线 | 隐私政策必须说明数据收集 |
| 广告政策 | ✅ 合规 | 当前无广告 |
| 支付政策 | ⬜ 待确认 | 如启用Google Play Billing需遵守30%分成政策 |

---

## 六、注意事项

### 6.1 常见被拒原因

| 原因 | 解决方案 |
|------|---------|
| Data Safety声明与实际不符 | 检查所有SDK数据收集行为 |
| 隐私政策不包含必要信息 | 添加数据收集、使用、删除说明 |
| 应用需要登录但未提供测试账号 | 在测试说明中提供测试账号 |
| APK代替AAB上传 | 必须使用AAB格式 |
| 目标SDK版本过低 | Google要求targetSdkVersion ≥ 34 |
| 64位架构不支持 | 确保包含arm64-v8a |

### 6.2 审核周期

| 阶段 | 预计时间 |
|------|---------|
| 首次提交审核 | 1-7天（新账号可能更长） |
| 版本更新审核 | 1-3天 |
| 被拒后重新提交 | 1-3天 |

### 6.3 版本更新

1. 构建新版本AAB（增加 versionCode）
2. 登录 Google Play Console
3. 进入 Production → Create new release
4. 上传新 AAB
5. 填写 Release Notes
6. Review → Start rollout

### 6.4 国内开发者特别注意

| 注意事项 | 说明 |
|---------|------|
| 网络环境 | 确保开发账号能正常访问Google Play Console |
| 支付信息 | 需要填写有效的收款银行账户 |
| 税收信息 | 需要提交美国税收表格（W-8BEN） |
| 客服响应 | Google会通过邮件联系，确保邮箱畅通 |

---

## 七、更新记录

| 时间 | 更新内容 | 操作人 |
|------|----------|--------|
| 2026-05-29 | 创建Google Play Store上架指南 | - |

---

*最后更新：2026-05-29*
