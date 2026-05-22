const fs = require('fs');
const path = require('path');

function setNested(obj, pathStr, value) {
  const keys = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function hasNested(obj, pathStr) {
  const keys = pathStr.split('.');
  let current = obj;
  for (const k of keys) {
    if (current === undefined || current === null) return false;
    current = current[k];
  }
  return current !== undefined;
}

function merge(localePath, patches) {
  const data = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
  let changed = false;
  for (const [key, value] of Object.entries(patches)) {
    if (!hasNested(data, key)) {
      setNested(data, key, value);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(localePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  return changed;
}

const webDir = path.join(__dirname, '..', 'apps/web/src/lib/locales');
const mobileDir = path.join(__dirname, '..', 'apps/mobile/src/lib/locales');

// Web patches (all keys missing from all locales, plus referral keys missing in non-zh)
const webPatches = {
  "tier.expires": "Expires",
  "collection.trash.items": "Items",
  "profile.systemSettings": "System Settings",
  "profile.dataManagement": "Data Management",
  "profile.other": "Other",
  "settings.backupAutoFormat": "Backup Format",
  "settings.backupRetainHint": "Backups are retained for 30 days",
  "profile.feedback": "Feedback",
  "common.copy": "Copy",
  "profile.feedbackDesc": "Send feedback to support@linkchest.net",
  "share.syncCoversSuccess": "Covers synced successfully",
  "share.syncCoversFailed": "Failed to sync covers",
  "share.syncCoversConfirm": "Sync covers from source?",
  "share.syncCovers": "Sync Covers",
  "tag.noTagsHint": "Create tags to organize your bookmarks",
  "common.search": "Search",
  "common.noResults": "No results",
  "common.clear": "Clear",
  "edit.pleaseSelectList": "Please select a group",
  "edit.deleteSuccess": "Deleted successfully",
  "edit.deleteFailed": "Delete failed",
  "edit.confirmDelete": "Confirm delete?",
  "share.view.password": "Password",
  "share.create.viewPasswordAnytime": "You can view this password anytime in Share Management",
  "collection.addedTime": "Added Time",
  "collection.tag": "Tag",
  "collection.removeFromTagConfirm": "Remove from this tag?",
  "collection.clear": "Clear",
  "collection.allLoaded": "All loaded",
  "account.myReferralCode": "My Referral Code",
  "account.referralCopied": "Referral code copied",
  "account.copyReferralCode": "Copy Code",
  "account.referralDesc": "Invite friends to register and both get rewards",
  "account.referralTotal": "Total",
  "account.referralRegistered": "Registered",
  "account.referralRewarded": "Rewarded",
  "account.referralLoading": "Loading...",
};

const mobilePatches = {
  "common.noResults": "No results",
  "collection.detail.deleted": "Deleted",
  "collection.detail.deleteConfirm": "Delete this collection?",
  "common.pullToRefresh": "Pull to refresh",
  "collection.noSearchResults": "No search results",
  "collection.tryDifferentKeywords": "Try different keywords",
  "edit.enterUrl": "Enter URL",
  "edit.linkAddress": "Link Address",
  "edit.pasteLinkOrShareText": "Paste link or share text",
  "edit.platformField": "Platform",
  "settings.duplicateDetect": "Duplicate Detection",
  "settings.comingSoon": "Coming Soon",
  "settings.autoBackup": "Auto Backup",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.copyFailed": "Copy failed",
  "share.view.syncCoversSuccess": "Covers synced",
  "share.view.syncCoversFailed": "Failed to sync covers",
  "share.view.syncCoversTitle": "Sync Covers",
  "share.view.syncCoversDesc": "Sync covers from source?",
  "share.view.syncCoversBtn": "Sync",
  "share.createFirst": "Create your first share",
  "common.noData": "No data",
  "tier.perQuarter": "/quarter",
  "account.myReferralCode": "My Referral Code",
  "account.referralCopied": "Referral code copied",
  "account.referralDesc": "Invite friends to register and both get rewards",
  "account.referralTotal": "Total",
  "account.referralRegistered": "Registered",
  "account.referralRewarded": "Rewarded",
  "account.referralLoading": "Loading...",
  "login.referralCode": "Referral Code (optional)",
};

for (const lang of ['en','zh','ja','ko','fr','de']) {
  const changedWeb = merge(path.join(webDir, `${lang}.json`), webPatches);
  console.log(`Web ${lang}: ${changedWeb ? 'UPDATED' : 'ok'}`);
  const changedMobile = merge(path.join(mobileDir, `${lang}.json`), mobilePatches);
  console.log(`Mobile ${lang}: ${changedMobile ? 'UPDATED' : 'ok'}`);
}

// Now produce language-specific patches for zh/ja/ko/fr/de
// Read the en files as base, then we'll patch specific languages below
const zhWebExtra = {
  "tier.expires": "到期时间", "collection.trash.items": "项目",
  "profile.systemSettings": "系统设置", "profile.dataManagement": "数据管理",
  "profile.other": "其他", "settings.backupAutoFormat": "备份格式",
  "settings.backupRetainHint": "备份保留30天", "profile.feedback": "反馈",
  "common.copy": "复制", "profile.feedbackDesc": "发送反馈至 support@linkchest.net",
  "share.syncCoversSuccess": "封面同步成功", "share.syncCoversFailed": "封面同步失败",
  "share.syncCoversConfirm": "从来源同步封面？", "share.syncCovers": "同步封面",
  "tag.noTagsHint": "创建标签来整理你的书签", "common.search": "搜索",
  "common.noResults": "无结果", "common.clear": "清空",
  "edit.pleaseSelectList": "请选择一个分组", "edit.deleteSuccess": "删除成功",
  "edit.deleteFailed": "删除失败", "edit.confirmDelete": "确认删除？",
  "share.view.password": "密码",
  "share.create.viewPasswordAnytime": "你可以在分享管理中随时查看此密码",
  "collection.addedTime": "添加时间", "collection.tag": "标签",
  "collection.removeFromTagConfirm": "从此标签移除？", "collection.clear": "清空",
  "collection.allLoaded": "已加载全部",
  "account.myReferralCode": "我的推荐码", "account.referralCopied": "推荐码已复制",
  "account.copyReferralCode": "复制推荐码",
  "account.referralDesc": "邀请好友注册，双方均可获得奖励",
  "account.referralTotal": "总计", "account.referralRegistered": "已注册",
  "account.referralRewarded": "已奖励", "account.referralLoading": "加载中...",
};
const zhMobileExtra = {
  "common.noResults": "无结果", "collection.detail.deleted": "已删除",
  "collection.detail.deleteConfirm": "删除此收藏？", "common.pullToRefresh": "下拉刷新",
  "collection.noSearchResults": "无搜索结果", "collection.tryDifferentKeywords": "尝试其他关键词",
  "edit.enterUrl": "输入链接", "edit.linkAddress": "链接地址",
  "edit.pasteLinkOrShareText": "粘贴链接或分享文本", "edit.platformField": "平台",
  "settings.duplicateDetect": "重复检测", "settings.comingSoon": "即将推出",
  "settings.autoBackup": "自动备份", "common.copy": "复制",
  "common.copied": "已复制", "common.copyFailed": "复制失败",
  "share.view.syncCoversSuccess": "封面已同步", "share.view.syncCoversFailed": "封面同步失败",
  "share.view.syncCoversTitle": "同步封面", "share.view.syncCoversDesc": "从来源同步封面？",
  "share.view.syncCoversBtn": "同步", "share.createFirst": "创建你的第一个分享",
  "common.noData": "暂无数据", "tier.perQuarter": "/季度",
  "account.myReferralCode": "我的推荐码", "account.referralCopied": "推荐码已复制",
  "account.referralDesc": "邀请好友注册，双方均可获得奖励",
  "account.referralTotal": "总计", "account.referralRegistered": "已注册",
  "account.referralRewarded": "已奖励", "account.referralLoading": "加载中...",
  "login.referralCode": "推荐码（可选）",
};
merge(path.join(webDir, 'zh.json'), zhWebExtra);
merge(path.join(mobileDir, 'zh.json'), zhMobileExtra);

// Japanese
const jaWebExtra = {
  "tier.expires": "有効期限", "collection.trash.items": "項目",
  "profile.systemSettings": "システム設定", "profile.dataManagement": "データ管理",
  "profile.other": "その他", "settings.backupAutoFormat": "バックアップ形式",
  "settings.backupRetainHint": "バックアップは30日間保持されます", "profile.feedback": "フィードバック",
  "common.copy": "コピー", "profile.feedbackDesc": "support@linkchest.net へフィードバックを送信",
  "share.syncCoversSuccess": "カバーの同期に成功しました", "share.syncCoversFailed": "カバーの同期に失敗しました",
  "share.syncCoversConfirm": "ソースからカバーを同期しますか？", "share.syncCovers": "カバーを同期",
  "tag.noTagsHint": "タグを作成してブックマークを整理しましょう", "common.search": "検索",
  "common.noResults": "結果がありません", "common.clear": "クリア",
  "edit.pleaseSelectList": "グループを選択してください", "edit.deleteSuccess": "削除しました",
  "edit.deleteFailed": "削除に失敗しました", "edit.confirmDelete": "削除してもよろしいですか？",
  "share.view.password": "パスワード",
  "share.create.viewPasswordAnytime": "シェア管理からいつでもこのパスワードを確認できます",
  "collection.addedTime": "追加日時", "collection.tag": "タグ",
  "collection.removeFromTagConfirm": "このタグから削除しますか？", "collection.clear": "クリア",
  "collection.allLoaded": "すべて読み込みました",
  "account.myReferralCode": "マイ紹介コード", "account.referralCopied": "紹介コードをコピーしました",
  "account.copyReferralCode": "コードをコピー",
  "account.referralDesc": "友達を招待して登録すると、両方に報酬があります",
  "account.referralTotal": "合計", "account.referralRegistered": "登録済み",
  "account.referralRewarded": "報酬済み", "account.referralLoading": "読み込み中...",
};
const jaMobileExtra = {
  "common.noResults": "結果がありません", "collection.detail.deleted": "削除しました",
  "collection.detail.deleteConfirm": "このコレクションを削除しますか？", "common.pullToRefresh": "引っ張って更新",
  "collection.noSearchResults": "検索結果がありません", "collection.tryDifferentKeywords": "別のキーワードを試してください",
  "edit.enterUrl": "URLを入力", "edit.linkAddress": "リンクアドレス",
  "edit.pasteLinkOrShareText": "リンクまたはシェアテキストを貼り付け", "edit.platformField": "プラットフォーム",
  "settings.duplicateDetect": "重複検出", "settings.comingSoon": "近日公開",
  "settings.autoBackup": "自動バックアップ", "common.copy": "コピー",
  "common.copied": "コピーしました", "common.copyFailed": "コピーに失敗しました",
  "share.view.syncCoversSuccess": "カバーを同期しました", "share.view.syncCoversFailed": "カバーの同期に失敗しました",
  "share.view.syncCoversTitle": "カバーを同期", "share.view.syncCoversDesc": "ソースからカバーを同期しますか？",
  "share.view.syncCoversBtn": "同期", "share.createFirst": "最初のシェアを作成",
  "common.noData": "データがありません", "tier.perQuarter": "/四半期",
  "account.myReferralCode": "マイ紹介コード", "account.referralCopied": "紹介コードをコピーしました",
  "account.referralDesc": "友達を招待して登録すると、両方に報酬があります",
  "account.referralTotal": "合計", "account.referralRegistered": "登録済み",
  "account.referralRewarded": "報酬済み", "account.referralLoading": "読み込み中...",
  "login.referralCode": "紹介コード（オプション）",
};
merge(path.join(webDir, 'ja.json'), jaWebExtra);
merge(path.join(mobileDir, 'ja.json'), jaMobileExtra);

// Korean
const koWebExtra = {
  "tier.expires": "만료일", "collection.trash.items": "항목",
  "profile.systemSettings": "시스템 설정", "profile.dataManagement": "데이터 관리",
  "profile.other": "기타", "settings.backupAutoFormat": "백업 형식",
  "settings.backupRetainHint": "백업은 30일간 보관됩니다", "profile.feedback": "피드백",
  "common.copy": "복사", "profile.feedbackDesc": "support@linkchest.net 으로 피드백을 보내세요",
  "share.syncCoversSuccess": "커버 동기화 성공", "share.syncCoversFailed": "커버 동기화 실패",
  "share.syncCoversConfirm": "소스에서 커버를 동기화하시겠습니까?", "share.syncCovers": "커버 동기화",
  "tag.noTagsHint": "태그를 만들어 북마크를 정리하세요", "common.search": "검색",
  "common.noResults": "결과 없음", "common.clear": "지우기",
  "edit.pleaseSelectList": "그룹을 선택하세요", "edit.deleteSuccess": "삭제 완료",
  "edit.deleteFailed": "삭제 실패", "edit.confirmDelete": "삭제하시겠습니까?",
  "share.view.password": "비밀번호",
  "share.create.viewPasswordAnytime": "공유 관리에서 언제든지 이 비밀번호를 확인할 수 있습니다",
  "collection.addedTime": "추가 시간", "collection.tag": "태그",
  "collection.removeFromTagConfirm": "이 태그에서 제거하시겠습니까?", "collection.clear": "지우기",
  "collection.allLoaded": "모두 로드됨",
  "account.myReferralCode": "내 추천 코드", "account.referralCopied": "추천 코드가 복사되었습니다",
  "account.copyReferralCode": "코드 복사",
  "account.referralDesc": "친구를 초대하여 등록하면 양쪽 모두 보상을 받습니다",
  "account.referralTotal": "합계", "account.referralRegistered": "등록됨",
  "account.referralRewarded": "보상 완료", "account.referralLoading": "로딩 중...",
};
const koMobileExtra = {
  "common.noResults": "결과 없음", "collection.detail.deleted": "삭제됨",
  "collection.detail.deleteConfirm": "이 컬렉션을 삭제하시겠습니까?", "common.pullToRefresh": "당겨서 새로고침",
  "collection.noSearchResults": "검색 결과 없음", "collection.tryDifferentKeywords": "다른 키워드를 시도하세요",
  "edit.enterUrl": "URL 입력", "edit.linkAddress": "링크 주소",
  "edit.pasteLinkOrShareText": "링크 또는 공유 텍스트 붙여넣기", "edit.platformField": "플랫폼",
  "settings.duplicateDetect": "중복 감지", "settings.comingSoon": "곧 출시",
  "settings.autoBackup": "자동 백업", "common.copy": "복사",
  "common.copied": "복사됨", "common.copyFailed": "복사 실패",
  "share.view.syncCoversSuccess": "커버 동기화됨", "share.view.syncCoversFailed": "커버 동기화 실패",
  "share.view.syncCoversTitle": "커버 동기화", "share.view.syncCoversDesc": "소스에서 커버를 동기화하시겠습니까?",
  "share.view.syncCoversBtn": "동기화", "share.createFirst": "첫 번째 공유 만들기",
  "common.noData": "데이터 없음", "tier.perQuarter": "/분기",
  "account.myReferralCode": "내 추천 코드", "account.referralCopied": "추천 코드가 복사되었습니다",
  "account.referralDesc": "친구를 초대하여 등록하면 양쪽 모두 보상을 받습니다",
  "account.referralTotal": "합계", "account.referralRegistered": "등록됨",
  "account.referralRewarded": "보상 완료", "account.referralLoading": "로딩 중...",
};
merge(path.join(webDir, 'ko.json'), koWebExtra);
merge(path.join(mobileDir, 'ko.json'), koMobileExtra);

// French
const frWebExtra = {
  "tier.expires": "Expire le", "collection.trash.items": "Éléments",
  "profile.systemSettings": "Paramètres système", "profile.dataManagement": "Gestion des données",
  "profile.other": "Autre", "settings.backupAutoFormat": "Format de sauvegarde",
  "settings.backupRetainHint": "Les sauvegardes sont conservées pendant 30 jours", "profile.feedback": "Retour",
  "common.copy": "Copier", "profile.feedbackDesc": "Envoyez vos retours à support@linkchest.net",
  "share.syncCoversSuccess": "Couvertures synchronisées avec succès", "share.syncCoversFailed": "Échec de la synchronisation des couvertures",
  "share.syncCoversConfirm": "Synchroniser les couvertures depuis la source ?", "share.syncCovers": "Synchroniser les couvertures",
  "tag.noTagsHint": "Créez des tags pour organiser vos signets", "common.search": "Rechercher",
  "common.noResults": "Aucun résultat", "common.clear": "Effacer",
  "edit.pleaseSelectList": "Veuillez sélectionner un groupe", "edit.deleteSuccess": "Supprimé avec succès",
  "edit.deleteFailed": "Échec de la suppression", "edit.confirmDelete": "Confirmer la suppression ?",
  "share.view.password": "Mot de passe",
  "share.create.viewPasswordAnytime": "Vous pouvez consulter ce mot de passe à tout moment dans la gestion des partages",
  "collection.addedTime": "Date d'ajout", "collection.tag": "Tag",
  "collection.removeFromTagConfirm": "Retirer de ce tag ?", "collection.clear": "Effacer",
  "collection.allLoaded": "Tout chargé",
  "account.myReferralCode": "Mon code de parrainage", "account.referralCopied": "Code copié",
  "account.copyReferralCode": "Copier le code",
  "account.referralDesc": "Invitez des amis à s'inscrire, vous recevrez tous les deux une récompense",
  "account.referralTotal": "Total", "account.referralRegistered": "Inscrits",
  "account.referralRewarded": "Récompensés", "account.referralLoading": "Chargement...",
};
const frMobileExtra = {
  "common.noResults": "Aucun résultat", "collection.detail.deleted": "Supprimé",
  "collection.detail.deleteConfirm": "Supprimer cette collection ?", "common.pullToRefresh": "Tirez pour actualiser",
  "collection.noSearchResults": "Aucun résultat de recherche", "collection.tryDifferentKeywords": "Essayez d'autres mots-clés",
  "edit.enterUrl": "Entrez l'URL", "edit.linkAddress": "Adresse du lien",
  "edit.pasteLinkOrShareText": "Collez le lien ou le texte partagé", "edit.platformField": "Plateforme",
  "settings.duplicateDetect": "Détection de doublons", "settings.comingSoon": "Bientôt disponible",
  "settings.autoBackup": "Sauvegarde automatique", "common.copy": "Copier",
  "common.copied": "Copié", "common.copyFailed": "Échec de la copie",
  "share.view.syncCoversSuccess": "Couvertures synchronisées", "share.view.syncCoversFailed": "Échec de la synchronisation",
  "share.view.syncCoversTitle": "Synchroniser les couvertures", "share.view.syncCoversDesc": "Synchroniser les couvertures depuis la source ?",
  "share.view.syncCoversBtn": "Synchroniser", "share.createFirst": "Créez votre premier partage",
  "common.noData": "Aucune donnée", "tier.perQuarter": "/trimestre",
  "account.myReferralCode": "Mon code de parrainage", "account.referralCopied": "Code copié",
  "account.referralDesc": "Invitez des amis à s'inscrire, vous recevrez tous les deux une récompense",
  "account.referralTotal": "Total", "account.referralRegistered": "Inscrits",
  "account.referralRewarded": "Récompensés", "account.referralLoading": "Chargement...",
};
merge(path.join(webDir, 'fr.json'), frWebExtra);
merge(path.join(mobileDir, 'fr.json'), frMobileExtra);

// German
const deWebExtra = {
  "tier.expires": "Läuft ab am", "collection.trash.items": "Einträge",
  "profile.systemSettings": "Systemeinstellungen", "profile.dataManagement": "Datenverwaltung",
  "profile.other": "Sonstiges", "settings.backupAutoFormat": "Sicherungsformat",
  "settings.backupRetainHint": "Sicherungen werden 30 Tage lang aufbewahrt", "profile.feedback": "Feedback",
  "common.copy": "Kopieren", "profile.feedbackDesc": "Senden Sie Feedback an support@linkchest.net",
  "share.syncCoversSuccess": "Cover erfolgreich synchronisiert", "share.syncCoversFailed": "Cover-Synchronisierung fehlgeschlagen",
  "share.syncCoversConfirm": "Cover von der Quelle synchronisieren?", "share.syncCovers": "Cover synchronisieren",
  "tag.noTagsHint": "Erstellen Sie Tags, um Ihre Lesezeichen zu organisieren", "common.search": "Suchen",
  "common.noResults": "Keine Ergebnisse", "common.clear": "Löschen",
  "edit.pleaseSelectList": "Bitte wählen Sie eine Gruppe", "edit.deleteSuccess": "Erfolgreich gelöscht",
  "edit.deleteFailed": "Löschen fehlgeschlagen", "edit.confirmDelete": "Löschen bestätigen?",
  "share.view.password": "Passwort",
  "share.create.viewPasswordAnytime": "Sie können dieses Passwort jederzeit in der Freigabeverwaltung einsehen",
  "collection.addedTime": "Hinzugefügt am", "collection.tag": "Tag",
  "collection.removeFromTagConfirm": "Aus diesem Tag entfernen?", "collection.clear": "Löschen",
  "collection.allLoaded": "Alle geladen",
  "account.myReferralCode": "Mein Empfehlungscode", "account.referralCopied": "Empfehlungscode kopiert",
  "account.copyReferralCode": "Code kopieren",
  "account.referralDesc": "Laden Sie Freunde zur Registrierung ein, beide erhalten eine Belohnung",
  "account.referralTotal": "Gesamt", "account.referralRegistered": "Registriert",
  "account.referralRewarded": "Belohnt", "account.referralLoading": "Laden...",
};
const deMobileExtra = {
  "common.noResults": "Keine Ergebnisse", "collection.detail.deleted": "Gelöscht",
  "collection.detail.deleteConfirm": "Diese Sammlung löschen?", "common.pullToRefresh": "Zum Aktualisieren ziehen",
  "collection.noSearchResults": "Keine Suchergebnisse", "collection.tryDifferentKeywords": "Versuchen Sie andere Schlüsselwörter",
  "edit.enterUrl": "URL eingeben", "edit.linkAddress": "Link-Adresse",
  "edit.pasteLinkOrShareText": "Link oder Freigabetext einfügen", "edit.platformField": "Plattform",
  "settings.duplicateDetect": "Duplikaterkennung", "settings.comingSoon": "Demnächst verfügbar",
  "settings.autoBackup": "Automatische Sicherung", "common.copy": "Kopieren",
  "common.copied": "Kopiert", "common.copyFailed": "Kopieren fehlgeschlagen",
  "share.view.syncCoversSuccess": "Cover synchronisiert", "share.view.syncCoversFailed": "Synchronisierung fehlgeschlagen",
  "share.view.syncCoversTitle": "Cover synchronisieren", "share.view.syncCoversDesc": "Cover von der Quelle synchronisieren?",
  "share.view.syncCoversBtn": "Synchronisieren", "share.createFirst": "Erstellen Sie Ihre erste Freigabe",
  "common.noData": "Keine Daten", "tier.perQuarter": "/Quartal",
  "account.myReferralCode": "Mein Empfehlungscode", "account.referralCopied": "Empfehlungscode kopiert",
  "account.referralDesc": "Laden Sie Freunde zur Registrierung ein, beide erhalten eine Belohnung",
  "account.referralTotal": "Gesamt", "account.referralRegistered": "Registriert",
  "account.referralRewarded": "Belohnt", "account.referralLoading": "Laden...",
};
merge(path.join(webDir, 'de.json'), deWebExtra);
merge(path.join(mobileDir, 'de.json'), deMobileExtra);

console.log('\nDone!');
