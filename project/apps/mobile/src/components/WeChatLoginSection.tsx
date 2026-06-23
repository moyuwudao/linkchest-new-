import React, { useState, useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  Alert,
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
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (wechatClientId && !isRegistered) {
      WeChat.registerApp(wechatClientId, '')
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
      // 移除首次登录设置密码弹窗，用户可在「账号设置」中自行设置密码
      navigation.replace('Main' as never);
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

    // 合规：微信登录前必须同意隐私政策
    const privacyConsented = await (global as any).requestPrivacyConsent?.();
    if (!privacyConsented) {
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

  return (
    <TouchableOpacity
      style={[styles.thirdPartyBtn, { backgroundColor: '#07C160', borderWidth: 0 }]}
      onPress={handleWechatLogin}
      disabled={loading || !wechatClientId}
    >
      <WeChatIcon size={22} color="#fff" />
    </TouchableOpacity>
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
});
