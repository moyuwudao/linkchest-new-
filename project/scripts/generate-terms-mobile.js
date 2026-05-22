const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const docsDir = path.join(root, 'docs', 'terms');
const mobileScreensDir = path.join(root, 'apps', 'mobile', 'src', 'screens');

const zh = fs.readFileSync(path.join(docsDir, 'terms-of-service-zh.md'), 'utf-8');
const en = fs.readFileSync(path.join(docsDir, 'terms-of-service-en.md'), 'utf-8');

fs.writeFileSync(
  path.join(mobileScreensDir, 'terms-content.json'),
  JSON.stringify({ zh, en }, null, 2),
  'utf-8'
);

const tsx = `import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../lib/i18n';
import { useThemeStore } from '../store/theme';
import termsContent from './terms-content.json';

function renderMarkdown(content: string, colors: any) {
  return content.split('\\n').map((line, index) => {
    const key = 'line-' + index;
    if (line.startsWith('# ')) {
      return <Text key={key} style={[styles.h1, { color: colors.text }]}>{line.slice(2)}</Text>;
    }
    if (line.startsWith('## ')) {
      return <Text key={key} style={[styles.h2, { color: colors.text }]}>{line.slice(3)}</Text>;
    }
    if (line.startsWith('### ')) {
      return <Text key={key} style={[styles.h3, { color: colors.text }]}>{line.slice(4)}</Text>;
    }
    if (line.startsWith('- ')) {
      return <Text key={key} style={[styles.bullet, { color: colors.text }]}>{'\\u2022'} {line.slice(2)}</Text>;
    }
    if (line.trim() === '---') {
      return <View key={key} style={[styles.hr, { borderBottomColor: colors.border }]} />;
    }
    if (line.trim() === '') {
      return <View key={key} style={{ height: 8 }} />;
    }
    const parts = line.split(/(\\*\\*.*?\\*\\*)/g);
    return (
      <Text key={key} style={[styles.paragraph, { color: colors.text }]}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <Text key={i} style={{ fontWeight: 'bold' }}>{part.slice(2, -2)}</Text>;
          }
          return part;
        })}
      </Text>
    );
  });
}

export default function TermsScreen() {
  const { locale, t } = useI18n();
  const { colors } = useThemeStore();
  const navigation = useNavigation();
  const content = locale === 'en' ? termsContent.en : termsContent.zh;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('terms.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {renderMarkdown(content, colors)}
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
});
`;

fs.writeFileSync(path.join(mobileScreensDir, 'TermsScreen.tsx'), tsx, 'utf-8');
console.log('Generated mobile terms screen files');
