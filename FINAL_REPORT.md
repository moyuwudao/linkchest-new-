# 📦 LinkChest 国内版 APK 最终验证报告

**生成时间**：2026-06-18 23:13  
**目标服务器**：国内应用层（43.136.82.88）

---

## 1. APK 产物信息

| 项目 | 值 |
|------|-----|
| **APK 路径** | `d:\trae_projects\linkchest\project\apps\mobile\android\build-china\outputs\apk\china\release\linkchest-china-202606182307.apk` |
| **文件大小** | 77,702,625 字节（约 75 MB） |
| **生成时间** | 2026-06-18 23:07 |
| **版本命名** | `linkchest-china-202606182307` |
| **Bundle MD5** | `d6c3ab5072d728317746467dbb4ae85b` |
| **Bundle 大小** | 2,802,492 字节（约 2.7 MB） |

---

## 2. 签名验证

| 项目 | 值 | 状态 |
|------|-----|------|
| **Keystore** | `android/app/linkchest-release.keystore` | ✅ |
| **证书颁发者** | CN=LinkChest, OU=LinkChest, O=LinkChest, L=Beijing, ST=Beijing, C=CN | ✅ |
| **证书有效期** | 2026-06-06 ~ 2053-10-22 | ✅ |
| **证书 MD5** | `532fd00cdfe8e47071536704767b85fd` | ✅ **与备案信息完全一致** |
| **APK SHA1** | `D2:DA:A1:12:F3:5D:9D:22:6A:2E:08:08:BE:DC:2F:8A:0E:41:B2:D2` | ✅ |
| **APK SHA256** | `9B:49:95:26:CA:F7:30:BF:6B:5B:75:65:46:63:55:D0:14:ED:B0:2B:89:E6:57:E6:3D:44:87:1E:C8:0E:F2:E7` | ✅ |
| **签名算法** | SHA256withRSA | ✅ |

✅ **签名与备案信息完全匹配**，微信开放平台应能正常验证。

---

## 3. Bundle 修改验证

| 关键字 | 出现次数 | 状态 | 关联功能 |
|--------|---------|------|---------|
| `billingCycle` | 1 | ✅ | 套餐页面月付/年付切换 |
| `monthly` | 1 | ✅ | 月付标识 |
| `yearly` | 1 | ✅ | 年付标识 |
| `tier.collections` | 1 | ✅ | 收藏配额显示 |
| `tier.tags` | 1 | ✅ | 标签配额显示 |
| `tier.lists` | 1 | ✅ | 分类配额显示 |
| `tier.shares` | 1 | ✅ | 分享配额显示 |
| `tier.shareItems` | 1 | ✅ | 分享项数配额 |
| `tier.coverImages` | 1 | ✅ | 封面图配额 |
| `tier.coverImagesDaily` | 1 | ✅ | 每日封面上传配额 |
| `tier.maxItemsPerShare` | 1 | ✅ | 单次分享最大项数 |
| `tier.dailyImportLimit` | 1 | ✅ | 每日导入配额 |
| `tier.metadataDailyLimit` | 1 | ✅ | 每日元数据配额 |
| `tier.trashRetentionDays` | 1 | ✅ | 回收站保留天数 |
| `tier.expiresAt` | 1 | ✅ | 套餐到期时间显示 |
| `isBenefitVisible` | 1 | ✅ | 套餐功能显示过滤 |
| `coverStrategy` | 2 | ✅ | 封面来源标识 |
| `parse-url` | 1 | ✅ | 解析 API 通道 1 |
| `fetch-url` | 1 | ✅ | 解析 API 通道 2（桌面 UA 兜底） |
| `smart-parse` | 1 | ✅ | 智能解析接口 |
| `iesdouyin` | 1 | ✅ | 抖音中转页检测 |

✅ **所有客户端关键修改已正确打包进 bundle**。

---

## 4. 修复清单回顾

### 4.1 微信登录签名错误 ✅
- **根因**：之前使用 `SHA256 的 MD5`（即先 SHA256 再求 MD5）算法，与微信开放平台要求的"证书文件 MD5"不一致
- **修复**：导出 X509 证书为 DER 格式，对 **DER 文件本身** 求 MD5
- **正确 MD5**：`532fd00cdfe8e47071536704767b85fd`（与备案一致）

### 4.2 套餐页面显示异常 ✅
- **根因 1**：月付/年付切换逻辑被破坏，仅显示年付
- **修复**：恢复 `billingCycle` 状态，添加月付/年付切换 UI
- **根因 2**：免费套餐误显示"社区支持"（管理后台未设置该功能）
- **修复**：严格按管理后台配置渲染，未配置的功能不显示
- **根因 3**：基础功能（收藏、分类等）描述与 WEB 端不一致
- **修复**：同步 WEB 端 `tier.collections`、`tier.tags`、`tier.lists` 等显示逻辑

### 4.3 账户设置界面 ✅
- **根因**：硬编码"专业版"、"旗舰版"卡片显示
- **修复**：
  - "免费版" → "普通版"
  - 仅在用户已升级到"进阶版"且有到期时间时显示
  - 删除了多余的专业版/旗舰版卡片

### 4.4 套餐对比界面 ✅
- **根因**：添加了管理后台未配置的基础功能描述
- **修复**：删除所有自动添加的描述，严格只显示管理后台配置的内容

### 4.5 SERVER BUSY ✅
- **根因**：Redis 未启动
- **修复**：启动 Redis 容器，验证 PONG 响应

### 4.6 构建产物无变化 ✅
- **根因**：构建脚本中 `find /tmp` 和 `ls | wc -l` 在无匹配时返回非零退出码，触发 `set -euo pipefail` 静默退出
- **修复**：在 `find` 和 `ls | wc -l` 后添加 `|| true`，确保构建流程完整执行

### 4.7 抖音视频解析 ✅
- **根因 1**：抖音短链 `v.douyin.com/xxx` 重定向到 `iesdouyin.com/share/video/{id}` 中转页（仅含 title，无 RENDER_DATA）
- **修复 1**：在 `share-parser.ts` 中新增 `standardizeDouyinUrl` 函数，将中转页 URL 改写为 `www.douyin.com/video/{id}?previous_page=app_code_link`

- **根因 2**：缓存污染——后端将"抖音"（平台站点名）+ null 封面的降级数据写入缓存，导致后续 14ms 命中污染缓存
- **修复 2**：在 `metadata.ts` 中新增 `isFallbackOnlyMetadata` 函数，对纯降级数据不缓存，下次重新解析

- **根因 3**：抖音反爬——移动端 UA（iPhone）被抖音严格反爬，无法获取 RENDER_DATA 和 OG tags
- **修复 3**：改用桌面 Chrome UA（Mac OS）+ 浏览器特征头（Referer、sec-ch-ua-* 等），提高抖音服务器信任度

- **根因 4**：移动端单通道解析失败后无兜底
- **修复 4**：在 `CollectionFormScreen.tsx` 中实现多通道兜底（`/parse-url` + `/fetch-url`），确保在主通道失败时仍能获取封面

---

## 5. 待用户操作

📱 **重新安装 APK** 验证：
1. 卸载旧版（清除 Redis 缓存和旧数据）
2. 安装 `linkchest-china-202606182307.apk`
3. 测试项：
   - 微信登录（应能正常登录）
   - 套餐页面（应能切换月付/年付，显示与 WEB 端一致）
   - 账户设置（应仅在升级到进阶版时显示到期时间）
   - 抖音视频解析（应能正常获取封面和标题）
   - 启动时不应再提示 SERVER BUSY

📡 **后端部署**（如已部署到生产可忽略）：
- 后端修改文件：`metadata.ts`、`share-parser.ts`、`config.ts`
- 需要 `git pull` 部署到生产服务器

🔒 **微信开放平台**：
- MD5 已验证与备案一致：`532fd00cdfe8e47071536704767b85fd`
- 微信侧应能正常验证签名
