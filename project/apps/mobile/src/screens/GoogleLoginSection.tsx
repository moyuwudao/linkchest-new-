import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { ErrorCodeToI18nKey, AuthErrorCodes } from '../lib/errorCodes';
import { useNavigation } from '@react-navigation/native';

WebBrowser.maybeCompleteAuthSession();

function getErrorMessage(errorCode: string, t: (key: string) => string): string {
  const i18nKey = ErrorCodeToI18nKey[errorCode as keyof typeof ErrorCodeToI18nKey];
  if (i18nKey) {
    return t(i18nKey);
  }
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
};

export default function GoogleLoginSection({ colors, loading, t, lang, setLoading }: Props) {
  const navigation = useNavigation();
  const { setToken, setUser } = useAuthStore();

  // Google 首次登录设置密码弹窗
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [setPwd, setSetPwd] = useState('');
  const [setPwdConfirm, setSetPwdConfirm] = useState('');
  const [setPwdLoading, setSetPwdLoading] = useState(false);

  // Google OAuth 登录
  const googleClientId = Constants.expoConfig?.extra?.googleClientId as string | undefined;
  const googleClientIdAndroid = Constants.expoConfig?.extra?.googleClientIdAndroid as string | undefined;
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    expoClientId: googleClientId,
    iosClientId: googleClientId,
    androidClientId: googleClientIdAndroid || googleClientId,
    webClientId: googleClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        handleGoogleLogin(id_token);
      }
    } else if (googleResponse?.type === 'error') {
      Alert.alert(t('common.error'), t('login.googleLoginFailed'));
    }
  }, [googleResponse]);

  const handleGoogleLogin = async (credential: string) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/google', { credential, lang });
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
        style={[styles.thirdPartyBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
        onPress={() => promptGoogleAsync()}
        disabled={!googleRequest || loading}
      >
        <Ionicons name="logo-google" size={24} color="#EA4335" />
      </TouchableOpacity>

      {/* Google 首次登录设置密码弹窗 */}
      <Modal visible={showSetPassword} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('login.setPassword')}</Text>
            </View>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              {t('login.setPasswordHint')}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder={t('login.enterPassword')}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={setPwd}
              onChangeText={setSetPwd}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
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
