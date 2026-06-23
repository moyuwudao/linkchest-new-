/**
 * 隐私政策同意弹窗
 *
 * 合规要求：
 * 1. APP 首次启动时弹出，用户未同意前不可使用 APP
 * 2. 提供明确的「同意」/「不同意」按钮
 * 3. 提供链接跳转到完整隐私政策
 * 4. 摘要中清晰说明会调用哪些 SDK 收集哪些信息
 */

import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  BackHandler,
} from 'react-native'
import { useI18n } from '../lib/i18n'

interface Props {
  visible: boolean
  onAgree: () => void
  onDisagree: () => void
  onViewFullPolicy: () => void
  onViewTerms: () => void
}

export default function PrivacyConsentDialog({
  visible,
  onAgree,
  onDisagree,
  onViewFullPolicy,
  onViewTerms,
}: Props) {
  const { t } = useI18n()

  // 拦截 Android 物理返回键，强制用户做出选择
  React.useEffect(() => {
    if (!visible) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [visible])

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => {
        // 不允许通过返回键关闭
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{t('privacy.dialogTitle')}</Text>

          <ScrollView style={styles.body} showsVerticalScrollIndicator>
            <Text style={styles.text}>
              {t('privacy.dialogIntro')}
            </Text>

            <Text style={styles.sectionTitle}>{t('privacy.summaryTitle')}</Text>
            <Text style={styles.text}>
              <Text style={styles.bullet}>{'• '}</Text>
              {t('privacy.summaryAccount')}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bullet}>{'• '}</Text>
              {t('privacy.summaryCollection')}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bullet}>{'• '}</Text>
              {t('privacy.summaryDevice')}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bullet}>{'• '}</Text>
              {t('privacy.summaryPush')}
            </Text>
            <Text style={styles.text}>
              <Text style={styles.bullet}>{'• '}</Text>
              {t('privacy.summaryCos')}
            </Text>

            <Text style={styles.sectionTitle}>{t('privacy.rightsTitle')}</Text>
            <Text style={styles.text}>{t('privacy.rightsDesc')}</Text>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={onViewFullPolicy}>
                <Text style={styles.link}>{t('privacy.viewFull')}</Text>
              </TouchableOpacity>
              <Text style={styles.text}>  ·  </Text>
              <TouchableOpacity onPress={onViewTerms}>
                <Text style={styles.link}>{t('privacy.viewTerms')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonGhost]}
              onPress={onDisagree}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonGhostText}>{t('privacy.disagree')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={onAgree}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonPrimaryText}>{t('privacy.agree')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    maxHeight: 380,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 14,
    marginBottom: 6,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
    marginBottom: 4,
  },
  bullet: {
    color: '#5B8A72',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  link: {
    fontSize: 13,
    color: '#576F9F',
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: {
    backgroundColor: '#F3F4F6',
  },
  buttonGhostText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  buttonPrimary: {
    backgroundColor: '#5B8A72',
  },
  buttonPrimaryText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
