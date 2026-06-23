# LinkChest Privacy Policy

**Version:** 2026-06-22 (Compliance Revision)
**Last Updated:** June 22, 2026
**Effective Date:** June 22, 2026

**Developer:** Shenzhen Linkji Information Technology Co., Ltd. (深圳市链记信息技术有限责任公司)
**Application Name:** LinkChest (链藏)
**Application Package:** com.linkchest.app

---

## Introduction

LinkChest ("we," "us," or "our"), developed and operated by **Shenzhen Linkji Information Technology Co., Ltd.** ("the Company"), values your privacy and the protection of your personal information. This Privacy Policy ("Policy") explains how we collect, use, store, share, and protect your personal information when you use LinkChest services (including the LinkChest Android APP, Web website, and related services).

Please read this Policy carefully before using LinkChest services. **We will only begin collecting and using your personal information, and activating third-party SDKs, after you explicitly click the "Agree" button.** If you do not agree with any part of this Policy, please stop using LinkChest services immediately.

---

## 1. Information We Collect

### 1.1 Information You Provide

- **Account Information**: When you register for a LinkChest account, we collect your **email address** and **password** (stored in encrypted bcrypt hash form). You may also choose to set a nickname, username, and avatar.
- **Collection Content**: URL links, titles, descriptions, cover images, tags, groups, and other user content you add or save through LinkChest.
- **Feedback Information**: Problem descriptions, contact information, and other details you submit to us through the "Help & Feedback" feature.

### 1.2 Information We Collect Automatically

- **Device Information**: Device model, operating system version, Android ID (device identifier, used for service diagnostics, abnormal login detection, and push targeting — not for advertising tracking).
- **Log Information**: Operation logs when you use LinkChest services, including access times, feature usage records, IP addresses, and error logs.
- **Network Information**: Network connection type and status, used to optimize service experience.

### 1.3 Third-Party Information

When you save a link from a third-party platform, we extract publicly available metadata (such as title, cover image, description) from the corresponding webpage. We do not access your third-party platform account information through this process.

---

## 2. How We Use Your Information

We use your personal information solely for the following purposes:

- **Core Service Delivery**: Store and sync your collection content, enabling cross-device access;
- **Account Management**: Verify your identity and safeguard your account;
- **Push Notifications**: Send you collection updates, system notifications, and marketing messages (can be disabled in Settings > Notifications);
- **Service Optimization**: Analyze usage data to improve product features and user experience;
- **Security Protection**: Detect and prevent fraud, abuse, and security risks;
- **Customer Support**: Respond to your questions, suggestions, and complaints;
- **Legal Compliance**: Comply with applicable laws, regulations, and regulatory requirements.

**Our Commitment**: We will not use your personal information for purposes beyond those stated above without your explicit consent, nor will we sell your personal information to third parties.

---

## 3. Information Storage and Protection

### 3.1 Storage Location

Your personal information is stored on servers located in mainland China (Tencent Cloud domestic nodes). We take reasonable measures to ensure the security of data storage.

### 3.2 Retention Period

We retain your personal information only for the period necessary to fulfill the purposes described in this Policy, unless laws and regulations require or permit a longer retention period. After you delete your account, we will delete your personal information within a reasonable time, unless otherwise specified by law or agreed upon between you and us.

### 3.3 Security Measures

We employ industry-standard security measures to protect your personal information, including:

- Encryption technologies (HTTPS, bcrypt password hashing) to protect data transmission and storage;
- Access controls to restrict employee access to personal information;
- Regular security risk assessments and vulnerability remediation;
- Data security incident response plans.

**Please Note**: The internet is not an absolutely secure environment. We strongly recommend setting a strong, unique password and keeping it secure to prevent information leakage due to personal reasons.

---

## 4. Information Sharing and Disclosure

### 4.1 Sharing Principles

We will not share your personal information with any third party without your consent, except:

- **With Your Explicit Consent**: After obtaining your explicit authorization;
- **Legal Requirements**: Pursuant to laws, court orders, government requests, or other legal proceedings;
- **Protection of Rights**: Where necessary to protect the legitimate rights, property, or safety of LinkChest, our users, or the public;
- **Merger, Acquisition, or Bankruptcy**: In the event of a merger, division, acquisition, or bankruptcy, your personal information may be transferred as part of the transaction. We will require the new entity to continue to be bound by this Policy.

### 4.2 Third-Party Services

We may use third-party service providers to support our business operations (e.g., cloud storage, email delivery). These providers access your personal information only to the extent necessary to provide services to us and are bound by confidentiality agreements. For specific third-party SDKs integrated, please see Section 8 below.

---

## 5. Your Rights

Under applicable data protection laws, you have the following rights regarding your personal information:

- **Right to Know**: You have the right to understand how we process your personal information;
- **Right to Access**: You have the right to access the personal information we hold about you;
- **Right to Rectification**: If you discover inaccuracies in your personal information, you have the right to request correction;
- **Right to Deletion**: Under legally defined circumstances, you have the right to request deletion of your personal information;
- **Right to Withdraw Consent**: You have the right to withdraw your consent to the processing of your personal information at any time;
- **Right to Account Deletion**: You can delete your account via LinkChest APP > Settings > Account Deletion.

To exercise these rights, please contact us through the channels listed at the bottom of this Policy. We will respond to your request within a reasonable timeframe.

---

## 6. Cookies and Similar Technologies

The LinkChest Web version may use cookies and similar technologies to recognize your browser or device, in order to:

- Remember your login status to avoid repeated logins;
- Understand your preferences to optimize your service experience.

You can manage or delete cookies through your browser settings. However, disabling cookies may affect the normal use of certain LinkChest features.

---

## 7. Children's Privacy

LinkChest services are primarily intended for adults aged 18 and above. We do not knowingly collect personal information from children under the age of 14. If you discover that we have inadvertently collected a child's personal information, please contact us immediately, and we will delete the relevant information as soon as possible.

---

## 8. Third-Party SDK Information Collection Disclosure

To ensure the proper functioning of LinkChest APP features and the security and stability of our services, our product integrates third-party Software Development Kits (SDKs). We conduct strict security monitoring of SDKs that access information to protect data security. **The following SDKs are only initialized and invoked after you agree to this Privacy Policy.**

### 8.1 JPush SDK & JCore (Aurora Mobile Push + Core Library)

LinkChest integrates the push service provided by Aurora Mobile, which consists of two SDK components:

- **JPush SDK**: `cn.jpush.android`
- **JCore (Aurora Core Library / Aurora Analytics)**: `cn.jiguang`

JCore is the underlying foundation library required by JPush SDK, providing device identification and network communication capabilities. **Both JPush and JCore are only initialized after the user agrees to this Privacy Policy.**

- **Service Name**: JPush (Aurora Push) and JCore (Aurora Core Library / Aurora Analytics)
- **Provider**: Aurora Mobile Limited (Shenzhen Hexun Huagu Information Technology Co., Ltd.)
- **SDK Packages**: `cn.jpush.android` (JPush), `cn.jiguang` (JCore)
- **Purpose**:
  - JPush: Push notification delivery for collection updates, system notifications, and marketing messages
  - JCore: Provides device identification and network communication capabilities required by JPush
- **Collection Method**: After user agrees in the privacy policy dialog, SDK starts collection only after JCollectionAuth authorization
- **Personal Information Collected**:
  - **Device Identifier**: Android ID (for push targeting and anti-spam identification)
  - **Network Information**: Network connection type, IP address, network status
  - **Device Information**: Device manufacturer, device model, OS version
  - **JPush Registration ID**: Unique push identifier assigned by JPush
- **Information NOT Collected**:
  - **NOT collected**: IMEI, device MAC address
  - **NOT collected**: Software installation list
  - **NOT collected**: Contacts, SMS messages
  - **NOT collected**: Location information
- **Collection Frequency**: On app launch (only after authorization), user login/logout, push message delivery
- **Data Transmitted To**: JPush servers (within China)
- **Communication Domains**: `*.jpush.cn`
- **SDK Privacy Policy**: https://www.jiguang.cn/license/privacy

### 8.2 Firebase Cloud Messaging SDK (FCM)

- **Service Name**: Firebase Cloud Messaging (FCM) — Global version only
- **Provider**: Google LLC
- **SDK Package**: `com.google.firebase.messaging`, `io.invertase.firebase`
- **Purpose**: Push notifications for global users
- **Collection Method**: Automatic SDK collection
- **Personal Information Collected**:
  - Device model, OS version
  - FCM Push Token
  - Network status
- **Data Transmitted To**: Google servers (outside China)
- **Privacy Policy**: https://firebase.google.com/support/privacy

### 8.3 Expo Notifications SDK

- **Service Name**: Expo Notifications
- **Provider**: Expo, Inc.
- **SDK Package**: `expo.modules.notifications`
- **Purpose**: Local notification scheduling, collection success reminders
- **Collection Method**: Automatic SDK collection (local-only, not uploaded to any server)
- **Personal Information Collected**:
  - Notification ID, notification content (processed locally only)
- **Data Location**: Local device only, no server upload
- **Privacy Policy**: https://expo.dev/privacy

### 8.4 Tencent Cloud COS SDK

- **Service Name**: Tencent Cloud Object Storage (COS)
- **Provider**: Tencent Cloud Computing (Beijing) Co., Ltd.
- **Purpose**: Storing uploaded cover images and avatar images
- **Collection Method**: Invoked only when you actively upload images
- **Personal Information Collected**:
  - Image files you actively upload
  - Temporary credentials for upload requests
- **Data Transmitted To**: Tencent Cloud COS servers (within China)
- **Privacy Policy**: https://privacy.qq.com/

### 8.5 Tencent Cloud SES SDK

- **Service Name**: Tencent Cloud Simple Email Service (SES)
- **Provider**: Tencent Cloud Computing (Beijing) Co., Ltd.
- **Purpose**: Sending email verification codes, account security notifications, system emails
- **Collection Method**: Invoked only during registration, login, or password change
- **Personal Information Collected**:
  - Your email address
  - Email content
- **Data Transmitted To**: Tencent Cloud SES servers (within China)
- **Privacy Policy**: https://privacy.qq.com/

### 8.6 Alipay Payment SDK (China Version Only)

- **Service Name**: Alipay Mobile Payment SDK
- **Provider**: Alipay (China) Internet Technology Co., Ltd.
- **SDK Package**: `com.alipay.sdk`
- **Purpose**: Membership subscription payments
- **Collection Method**: Invoked only when you initiate a payment
- **Personal Information Collected**:
  - Order information (order ID, order amount)
  - Device information (for payment security verification)
- **Data Transmitted To**: Alipay servers
- **Privacy Policy**: https://render.alipay.com/p/c/k2cx0tg8

### 8.7 WeChat Open Platform SDK (China Version Only)

- **Service Name**: WeChat Login & Share SDK
- **Provider**: Shenzhen Tencent Computer Systems Co., Ltd.
- **SDK Package**: `com.tencent.mm.opensdk`
- **Purpose**: WeChat login, content sharing to WeChat
- **Collection Method**: Invoked only when you actively click WeChat login or share
- **Personal Information Collected**:
  - OpenID, UnionID, nickname, avatar returned by WeChat Open Platform
- **Data Transmitted To**: WeChat servers
- **Privacy Policy**: https://privacy.qq.com/

---

## 9. App Auto-Start and Associated Launch Behavior

To enable push notifications and local notification scheduling, the LinkChest APP includes the following system-level behaviors:

- **JPush SDK** may trigger app process wake-up when receiving push messages (only after you agree to the Privacy Policy and enable push permissions)
- **Expo Notifications module** schedules local notification tasks after app exit (no information is uploaded to any server)

You can disable auto-start permissions in System Settings > App Management > LinkChest > Auto-Start Management, or disable push functionality in APP > Settings > Notification Settings.

---

## 10. Policy Updates

We may revise this Policy from time to time based on changes in laws and regulations, business development, or technology updates. The revised policy will be published within the LinkChest APP or on the Web version and will take effect upon publication. **Major changes will require re-confirmation of consent through a popup dialog.** Your continued use of LinkChest services constitutes your acceptance of the revised policy.

---

## 11. Contact Us

If you have any questions, comments, or suggestions regarding this Privacy Policy, or wish to exercise your personal information rights, please contact us through:

- **Developer Entity**: Shenzhen Linkji Information Technology Co., Ltd. (深圳市链记信息技术有限责任公司)
- **Customer Support Email**: support@linkchest.net
- **In-App Feedback**: LinkChest APP > Settings > Help & Feedback > Contact Us

We will process and respond to your request within a reasonable timeframe.

---

**Developer:** Shenzhen Linkji Information Technology Co., Ltd.
**Application:** LinkChest (链藏)
**Version: 2026-06-22 · Last Updated: June 22, 2026**