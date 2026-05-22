const fs = require('fs');
const path = require('path');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }
function setNested(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

// ==================== MOBILE PATCHES ====================
const mobileCommon = {
  zh: {
    'common.loading': '加载中...',
    'common.noResults': '暂无结果',
    'common.pullToRefresh': '下拉刷新',
    'common.copy': '复制',
    'common.copied': '已复制',
    'common.copyFailed': '复制失败',
    'common.noData': '暂无数据',
  },
  ja: {
    'common.loading': '読み込み中...',
    'common.noResults': '結果がありません',
    'common.pullToRefresh': '引っ張って更新',
    'common.copy': 'コピー',
    'common.copied': 'コピーしました',
    'common.copyFailed': 'コピーに失敗しました',
    'common.noData': 'データがありません',
    'account.myReferralCode': 'マイ紹介コード',
    'account.referralCopied': '紹介コードをコピーしました',
    'account.referralDesc': '友達を招待して登録すると、双方に報酬が入ります',
    'account.referralTotal': '合計',
    'account.referralRegistered': '登録済み',
    'account.referralRewarded': '報酬済み',
    'account.referralLoading': '読み込み中...',
  },
  ko: {
    'common.loading': '로딩 중...',
    'common.noResults': '결과 없음',
    'common.pullToRefresh': '당겨서 새로고침',
    'common.copy': '복사',
    'common.copied': '복사 완료',
    'common.copyFailed': '복사 실패',
    'common.noData': '데이터 없음',
    'collection.importConfirmDesc': '이 공유에는 {total}개의 북마크가 있습니다. {duplicate}개는 이미 존재하고, {new}개가 추가됩니다. 중복 항목은 새 그룹에 연결됩니다.',
    'error.emailAlreadyRegistered': '이 이메일은 이미 등록되어 있습니다',
    'share.view.loading': '로딩 중...',
    'settings.loading': '로딩 중...',
    'payment.processing': '처리 중...',
  },
  fr: {
    'common.loading': 'Chargement...',
    'common.noResults': 'Aucun résultat',
    'common.pullToRefresh': 'Tirez pour actualiser',
    'common.copy': 'Copier',
    'common.copied': 'Copié',
    'common.copyFailed': 'Échec de la copie',
    'common.noData': 'Aucune donnée',
  },
  de: {
    'common.loading': 'Wird geladen...',
    'common.noResults': 'Keine Ergebnisse',
    'common.pullToRefresh': 'Zum Aktualisieren ziehen',
    'common.copy': 'Kopieren',
    'common.copied': 'Kopiert',
    'common.copyFailed': 'Kopieren fehlgeschlagen',
    'common.noData': 'Keine Daten',
  }
};

// ==================== WEB PATCHES ====================
const webCommon = {
  zh: {
    'common.copy': '复制',
    'common.noResults': '暂无结果',
  },
  ja: {
    'common.copy': 'コピー',
    'common.noResults': '結果がありません',
    'account.myReferralCode': 'マイ紹介コード',
    'account.copyReferralCode': 'コードをコピー',
  },
  ko: {
    'common.copy': '복사',
    'common.noResults': '결과 없음',
    'common.loading': '로딩 중...',
    'common.noData': '데이터 없음',
    'common.copyFailed': '복사 실패',
    'account.myReferralCode': '내 추천 코드',
    'account.copyReferralCode': '코드 복사',
  },
  fr: {
    'common.copy': 'Copier',
    'common.noResults': 'Aucun résultat',
    'account.myReferralCode': 'Mon code de parrainage',
    'account.copyReferralCode': 'Copier le code',
  },
  de: {
    'common.copy': 'Kopieren',
    'common.noResults': 'Keine Ergebnisse',
    'account.myReferralCode': 'Mein Empfehlungscode',
    'account.copyReferralCode': 'Code kopieren',
  }
};

for (const [lang, patches] of Object.entries(mobileCommon)) {
  const file = path.join(__dirname, '..', 'apps', 'mobile', 'src', 'lib', 'locales', `${lang}.json`);
  const data = readJson(file);
  for (const [key, value] of Object.entries(patches)) {
    setNested(data, key, value);
  }
  writeJson(file, data);
  console.log(`[MOBILE ${lang}] Patched ${Object.keys(patches).length} keys`);
}

for (const [lang, patches] of Object.entries(webCommon)) {
  const file = path.join(__dirname, '..', 'apps', 'web', 'src', 'lib', 'locales', `${lang}.json`);
  const data = readJson(file);
  for (const [key, value] of Object.entries(patches)) {
    setNested(data, key, value);
  }
  writeJson(file, data);
  console.log(`[WEB ${lang}] Patched ${Object.keys(patches).length} keys`);
}

console.log('Done!');
