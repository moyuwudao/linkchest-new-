import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { useI18n } from '../lib/i18n';
import { useThemeStore } from '../store/theme';
import { Ionicons } from '@expo/vector-icons';

/**
 * 备案信息展示页
 *
 * 展示 ICP 备案、公安备案、APP 备案等合规信息
 * 满足《互联网信息服务管理办法》和《移动互联网应用程序信息服务管理规定》的展示要求
 */
export default function BeianScreen() {
  const { t, locale } = useI18n();
  const { colors } = useThemeStore();
  const isZh = locale === 'zh';

  // 备案信息（仅展示法规要求内容）
  const beian = {
    icp: '粤ICP备2026065057号-4A',
    icpLink: 'https://beian.miit.gov.cn/',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* 顶部标题 */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {isZh ? '备案信息' : 'Registration Info'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isZh
            ? '根据《互联网信息服务管理办法》公示'
            : 'Disclosed per applicable regulations'}
        </Text>
      </View>

      {/* ICP 备案 */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isZh ? 'ICP 备案' : 'ICP Filing'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {isZh ? '备案号' : 'Filing No.'}
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>{beian.icp}</Text>
        </View>

        <TouchableOpacity
          onPress={() => Linking.openURL(beian.icpLink)}
          style={[styles.linkBtn, { borderColor: colors.primary }]}
        >
          <Ionicons name="open-outline" size={16} color={colors.primary} />
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {isZh ? '前往工信部备案管理系统查询' : 'Query on MIIT system'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* APP 备案说明卡片 */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="phone-portrait" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isZh ? '移动应用备案' : 'Mobile APP Filing'}
          </Text>
        </View>

        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
          {isZh
            ? '本应用已依据《移动互联网应用程序信息服务管理规定》完成移动互联网应用程序（APP）备案，备案信息可在工信部政务服务平台查询。'
            : 'This APP has been filed in accordance with the Regulations on the Administration of Information Services of Mobile Internet Applications. The filing record is queryable on the MIIT platform.'}
        </Text>

        <TouchableOpacity
          onPress={() => Linking.openURL('https://beian.miit.gov.cn/#/app/index')}
          style={[styles.linkBtn, { borderColor: colors.primary }]}
        >
          <Ionicons name="open-outline" size={16} color={colors.primary} />
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {isZh ? '查询移动应用备案信息' : 'Query Mobile APP filing'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 法规说明 */}
      <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="information-circle" size={18} color={colors.textTertiary} />
        <Text style={[styles.noticeText, { color: colors.textTertiary }]}>
          {isZh
            ? '本页面信息由运营主体依法公示。如对备案信息有疑问，可通过 APP 内"反馈"联系客服。'
            : 'The information above is disclosed in accordance with applicable regulations. For questions, please contact support via the Feedback option in the APP.'}
        </Text>
      </View>

      <View style={{ height: Platform.OS === 'ios' ? 32 : 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { alignItems: 'center', paddingVertical: 24 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  rowColumn: {
    paddingVertical: 8,
  },
  label: { fontSize: 13, flexShrink: 0 },
  value: { fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  valueMono: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 1,
    textAlign: 'right',
  },
  valueMonoSmall: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
    lineHeight: 16,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
  },
  linkText: { fontSize: 14, fontWeight: '500' },
  bodyText: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    gap: 8,
  },
  noticeText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
