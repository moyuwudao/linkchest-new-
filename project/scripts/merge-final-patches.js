const fs = require('fs');
const path = require('path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
function setNested(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  if (cur[keys[keys.length - 1]] === undefined) {
    cur[keys[keys.length - 1]] = value;
  }
}

// ============== WEB PLATFORM ==============
const webLocales = ['de', 'fr', 'ja', 'ko'];
const webPatches = {
  de: {
    'payment.success': 'Zahlung erfolgreich! Plan aktualisiert.',
    'payment.canceled': 'Zahlung abgebrochen',
    'payment.checkoutFailed': 'Weiterleitung zur Kasse fehlgeschlagen',
    'payment.processing': 'Wird verarbeitet...',
    'payment.paypal': 'PayPal',
    'payment.paypalError': 'PayPal-Zahlung fehlgeschlagen, bitte versuchen Sie es erneut',
    'payment.paypalCaptureFailed': 'Bestätigung der PayPal-Zahlung fehlgeschlagen',
    'pricing.title': 'Preise',
    'pricing.subtitle': 'Wählen Sie den Plan, der zu Ihnen passt',
    'pricing.freePlan': 'Kostenlos',
    'pricing.proPlan': 'Pro',
    'pricing.ultimatePlan': 'Ultimate',
    'pricing.perMonth': '/Mo',
    'pricing.perYear': '/Jahr',
    'pricing.signUpToUpgrade': 'Registrieren, um zu abonnieren',
    'pricing.popular': 'Beliebt',
    'pricing.collections': 'Lesezeichen',
    'pricing.tags': 'Tags',
    'pricing.groups': 'Gruppen',
    'pricing.shares': 'Freigaben',
    'pricing.yearlySave': 'Mit jährlicher Zahlung sparen',
    'login.referralCode': 'Empfehlungscode (optional)',
  },
  fr: {
    'payment.success': 'Paiement réussi ! Plan mis à niveau.',
    'payment.canceled': 'Paiement annulé',
    'payment.checkoutFailed': 'Échec de la redirection vers la caisse',
    'payment.processing': 'Traitement en cours...',
    'payment.paypal': 'PayPal',
    'payment.paypalError': 'Échec du paiement PayPal, veuillez réessayer',
    'payment.paypalCaptureFailed': 'Échec de la confirmation du paiement PayPal',
    'pricing.title': 'Tarification',
    'pricing.subtitle': 'Choisissez le plan qui vous convient',
    'pricing.freePlan': 'Gratuit',
    'pricing.proPlan': 'Pro',
    'pricing.ultimatePlan': 'Ultimate',
    'pricing.perMonth': '/mois',
    'pricing.perYear': '/an',
    'pricing.signUpToUpgrade': 'Inscrivez-vous pour vous abonner',
    'pricing.popular': 'Populaire',
    'pricing.collections': 'Favoris',
    'pricing.tags': 'Tags',
    'pricing.groups': 'Groupes',
    'pricing.shares': 'Partages',
    'pricing.yearlySave': 'Économisez avec le plan annuel',
    'login.referralCode': 'Code de parrainage (facultatif)',
  },
  ja: {
    'payment.success': '支払い成功！プランがアップグレードされました。',
    'payment.canceled': '支払いがキャンセルされました',
    'payment.checkoutFailed': 'チェックアウトページへのリダイレクトに失敗しました',
    'payment.processing': '処理中...',
    'payment.paypal': 'PayPal',
    'payment.paypalError': 'PayPal支払いに失敗しました。もう一度お試しください',
    'payment.paypalCaptureFailed': 'PayPal支払いの確認に失敗しました',
    'pricing.title': '料金プラン',
    'pricing.subtitle': 'あなたに合ったプランを選択',
    'pricing.freePlan': '無料',
    'pricing.proPlan': 'Pro',
    'pricing.ultimatePlan': 'Ultimate',
    'pricing.perMonth': '/月',
    'pricing.perYear': '/年',
    'pricing.signUpToUpgrade': '登録してサブスクライブ',
    'pricing.popular': '人気',
    'pricing.collections': 'ブックマーク',
    'pricing.tags': 'タグ',
    'pricing.groups': 'グループ',
    'pricing.shares': '共有',
    'pricing.yearlySave': '年払いでお得',
    'login.referralCode': '紹介コード（任意）',
  },
  ko: {
    'payment.success': '결제 성공! 플랜이 업그레이드되었습니다.',
    'payment.canceled': '결제가 취소되었습니다',
    'payment.checkoutFailed': '결제 페이지로 이동하지 못했습니다',
    'payment.processing': '처리 중...',
    'payment.paypal': 'PayPal',
    'payment.paypalError': 'PayPal 결제 실패, 다시 시도해 주세요',
    'payment.paypalCaptureFailed': 'PayPal 결제 확인 실패',
    'pricing.title': '가격',
    'pricing.subtitle': '나에게 맞는 플랜을 선택하세요',
    'pricing.freePlan': '묣은',
    'pricing.proPlan': 'Pro',
    'pricing.ultimatePlan': 'Ultimate',
    'pricing.perMonth': '/월',
    'pricing.perYear': '/년',
    'pricing.signUpToUpgrade': '구독하려면 가입하세요',
    'pricing.popular': '인기',
    'pricing.collections': '즐겨찾기',
    'pricing.tags': '태그',
    'pricing.groups': '그룹',
    'pricing.shares': '공유',
    'pricing.yearlySave': '연간 결제로 절약',
    'login.referralCode': '추천 코드 (선택)',
  }
};

for (const lang of webLocales) {
  const file = path.join(__dirname, '..', 'apps', 'web', 'src', 'lib', 'locales', `${lang}.json`);
  const data = readJson(file);
  for (const [key, value] of Object.entries(webPatches[lang])) {
    setNested(data, key, value);
  }
  writeJson(file, data);
  console.log(`[WEB ${lang}] Patched ${Object.keys(webPatches[lang]).length} keys`);
}

// ============== MOBILE PLATFORM ==============
const mobileLocales = ['en', 'ja', 'ko', 'fr', 'de'];
const mobilePatches = {
  en: { 'share.view.syncAllCovers': 'Sync All Covers' },
  ja: {
    'share.view.syncAllCovers': 'すべてのカバーを同期',
    'payment.success': '支払い成功！プランがアップグレードされました。',
    'payment.canceled': '支払いがキャンセルされました',
    'payment.checkoutFailed': 'チェックアウトページへのリダイレクトに失敗しました',
    'payment.processing': '処理中...',
  },
  ko: { 'share.view.syncAllCovers': '모든 커버 동기화' },
  fr: { 'share.view.syncAllCovers': 'Synchroniser toutes les couvertures' },
  de: { 'share.view.syncAllCovers': 'Alle Covers synchronisieren' },
};

for (const lang of mobileLocales) {
  const file = path.join(__dirname, '..', 'apps', 'mobile', 'src', 'lib', 'locales', `${lang}.json`);
  const data = readJson(file);
  for (const [key, value] of Object.entries(mobilePatches[lang])) {
    setNested(data, key, value);
  }
  writeJson(file, data);
  console.log(`[MOBILE ${lang}] Patched ${Object.keys(mobilePatches[lang]).length} keys`);
}

console.log('Done!');
