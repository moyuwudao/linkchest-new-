const fs = require('fs');

// Check APK bundle
const apkPath = 'android/build-china/outputs/apk/china/release/linkchest-china-202606011244.apk';
const { execSync } = require('child_process');

// Extract bundle from APK
const bundle = execSync(`unzip -p "${apkPath}" assets/index.android.bundle`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });

console.log('Bundle size:', bundle.length);

// Check for tier translations
const hasTierPro = bundle.includes('tier.pro');
const hasTierSuper = bundle.includes('tier.super');
const hasProTranslated = bundle.includes('"pro":"Pro"') || bundle.includes('"pro": "Pro"');
const hasSuperTranslated = bundle.includes('"super":"Ultimate"') || bundle.includes('"super": "Ultimate"');

console.log('Has tier.pro key:', hasTierPro);
console.log('Has tier.super key:', hasTierSuper);
console.log('Has "Pro" translation:', hasProTranslated);
console.log('Has "Ultimate" translation:', hasSuperTranslated);

// Check for terms content
const hasLinkchestCn = bundle.includes('linkchest.cn');
const hasWechatLogin = bundle.includes('微信登录');
const hasGoogleLogin = bundle.includes('Google Sign-In');

console.log('Has linkchest.cn:', hasLinkchestCn);
console.log('Has 微信登录:', hasWechatLogin);
console.log('Has Google Sign-In:', hasGoogleLogin);
