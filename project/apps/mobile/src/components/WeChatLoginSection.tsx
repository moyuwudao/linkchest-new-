import React, { useState, useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  Alert,
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import * as WeChat from 'react-native-wechat-lib';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useNavigation } from '@react-navigation/native';
import { ErrorCodeToI18nKey, AuthErrorCodes } from '../lib/errorCodes';
import WeChatIcon from './WeChatIcon';

function getErrorMessage(errorCode: string, t: (key: string) => string): string {
  const i18nKey = ErrorCodeToI18nKey[errorCode as keyof typeof ErrorCodeToI18nKey];
  if (i18nKey) return t(i18nKey);
  return t('error.unknown');
}

type Props = {
  colors: {
    card: string;
    border: string;
    text: string;
    textTertiary: string;
    inputBg: string;
    primary: string;
  };
  loading: boolean;
  t: (key: string) => string;
  lang: string;
  setLoading: (v: boolean) => void;
  wechatClientId?: string;
};

export default function WeChatLoginSection({
  colors,
  loading,
  t,
  lang,
  setLoading,
  wechatClientId,
}: Props) {
  const navigation = useNavigation();
  const { setToken, setUser } = useAuthStore();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [setPwd, setSetPwd] = useState('');
  const [setPwdConfirm, setSetPwdConfirm] = useState('');
  const [setPwdLoading, setSetPwdLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (wechatClientId && !isRegistered) {
      WeChat.registerApp(wechatClientId)
        .then(() => {
          console.log('WeChat SDK registered');
          setIsRegistered(true);
        })
        .catch((err: Error) => {
          console.error('WeChat register failed:', err);
        });
    }
  }, [wechatClientId, isRegistered]);

  const handleWechatCode = async (code: string) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/wechat', { code, lang, platform: 'mobile' });
      const { token, user } = response.data;
      await setToken(token);
      setUser(user);
      if (!user.hasPassword) {
        setSetPwd('');
        setSetPwdConfirm('');
        setShowSetPassword(true);
      } else {
        navigation.replace('Main' as never);
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = useCallback(async () => {
    if (!wechatClientId) {
      Alert.alert(t('common.error'), t('login.wechatLoginFailed'));
      return;
    }
    if (!isRegistered) {
      Alert.alert(t('common.error'), t('login.wechatLoginFailed'));
      return;
    }

    try {
      setLoading(true);
      const resp = await WeChat.sendAuthRequest('snsapi_userinfo', lang);
      if (resp && resp.code) {
        await handleWechatCode(resp.code);
      }
    } catch (err: any) {
      if (err.code === -2) {
        console.log('用户取消微信登录');
      } else if (err.code === -4) {
        Alert.alert(t('common.error'), t('login.wechatLoginFailed'));
      } else {
        Alert.alert(t('common.error'), t('login.wechatLoginFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [wechatClientId, isRegistered, lang, setLoading]);

  const handleSetPassword = async () => {
    if (!setPwd || !setPwdConfirm) {
      Alert.alert(t('common.hint'), t('login.enterPasswordAndConfirm'));
      return;
    }
    if (setPwd !== setPwdConfirm) {
      Alert.alert(t('common.hint'), t('login.passwordsDoNotMatch'));
      return;
    }
    if (setPwd.length < 6) {
      Alert.alert(t('common.hint'), t('login.passwordTooShort'));
      return;
    }
    try {
      setSetPwdLoading(true);
      await api.post('/auth/set-password', { password: setPwd });
      Alert.alert(t('common.success'), t('login.passwordSetSuccess'));
      setShowSetPassword(false);
      navigation.replace('Main' as never);
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setSetPwdLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.thirdPartyBtn, { backgroundColor: '#07C160', borderWidth: 0 }]}
        onPress={handleWechatLogin}
        disabled={loading || !wechatClientId}
      >
        <WeChatIcon size={22} color="#fff" />
      </TouchableOpacity>

      {/* 首次登录设置密码弹窗 */}
      <Modal visible={showSetPassword} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('login.setPassword')}
              </Text>
            </View>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              {t('login.setPasswordHint')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
              ]}
              placeholder={t('login.enterPassword')}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={setPwd}
              onChangeText={setSetPwd}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
              ]}
              placeholder={t('login.confirmPassword')}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={setPwdConfirm}
              onChangeText={setSetPwdConfirm}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={handleSetPassword}
              disabled={setPwdLoading}
            >
              <Text style={styles.btnText}>
                {setPwdLoading ? t('common.loading') : t('common.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thirdPartyBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  btn: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
