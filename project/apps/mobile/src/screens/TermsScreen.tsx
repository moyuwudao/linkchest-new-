import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useI18n } from '../lib/i18n';
import { useThemeStore } from '../store/theme';
import { getBaseDomain, getSupportEmail } from '../lib/api';
import termsContent from './terms-content.json';
import privacyContent from './privacy-content.json';

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
    }
    return part;
  });
}

function renderMarkdown(rawContent: string, colors: any, isChinaMarket: boolean) {
  // 兼容 JSON 中 \n 被存储为字面量的情况
  let content = rawContent.replace(/\\n/g, '\n');
  
  // 根据市场环境动态替换域名
  const targetDomain = isChinaMarket ? 'linkchest.cn' : 'linkchest.net';
  const targetEmail = isChinaMarket ? 'support@linkchest.cn' : 'support@linkchest.net';
  
  content = content.replace(/linkchest\.net/g, targetDomain);
  content = content.replace(/support@linkchest\.net/g, targetEmail);
  
  return content.split('\n').map((line, index) => {
    const key = 'line-' + index;
    // Strip trailing two-space markdown line breaks (already on separate lines)
    const trimmedLine = line.replace(/ {2}$/, '');

    if (trimmedLine.startsWith('# ')) {
      return <Text key={key} style={[styles.h1, { color: colors.text }]}>{renderInlineMarkdown(trimmedLine.slice(2))}</Text>;
    }
    if (trimmedLine.startsWith('## ')) {
      return <Text key={key} style={[styles.h2, { color: colors.text }]}>{renderInlineMarkdown(trimmedLine.slice(3))}</Text>;
    }
    if (trimmedLine.startsWith('### ')) {
      return <Text key={key} style={[styles.h3, { color: colors.text }]}>{renderInlineMarkdown(trimmedLine.slice(4))}</Text>;
    }
    if (trimmedLine.startsWith('- ')) {
      return <Text key={key} style={[styles.bullet, { color: colors.text }]}>{'\u2022'} {renderInlineMarkdown(trimmedLine.slice(2))}</Text>;
    }
    if (trimmedLine.trim() === '---') {
      return <View key={key} style={[styles.hr, { borderBottomColor: colors.border }]} />;
    }
    if (trimmedLine.trim() === '') {
      return <View key={key} style={{ height: 8 }} />;
    }
    return (
      <Text key={key} style={[styles.paragraph, { color: colors.text }]}>
        {renderInlineMarkdown(trimmedLine)}
      </Text>
    );
  });
}

export default function TermsScreen() {
  const { locale, t } = useI18n();
  const { colors } = useThemeStore();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(route.params?.tab === 'privacy' ? 'privacy' : 'terms');

  const content = activeTab === 'privacy'
    ? (locale === 'zh' ? privacyContent.zh : privacyContent.en)
    : (locale === 'zh' ? termsContent.zh : termsContent.en);

  const title = activeTab === 'privacy' ? t('privacy.title') : t('terms.title');

  // 获取市场环境
  const baseDomain = getBaseDomain();
  const isChinaMarket = baseDomain === 'linkchest.cn';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'terms' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('terms')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'terms' ? colors.primary : colors.textTertiary }]}>{t('terms.title')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'privacy' && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab('privacy')}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'privacy' ? colors.primary : colors.textTertiary }]}>{t('privacy.title')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderMarkdown(content, colors, isChinaMarket)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  h1: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  h3: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  bullet: {
    marginLeft: 16,
    marginBottom: 4,
    lineHeight: 22,
  },
  paragraph: {
    lineHeight: 22,
    marginBottom: 4,
  },
  hr: {
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
