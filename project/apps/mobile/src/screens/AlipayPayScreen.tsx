/**
 * AlipayPayScreen — 支付宝原生支付页面（替代 WebView 跳转）
 *
 * 接收路由参数:
 *   - tier: 'medium' | 'heavy' | 'super'
 *   - billingCycle: 'monthly' | 'yearly'
 *   - tierName: 已翻译的套餐名
 *   - price: 已格式化的价格字符串
 *   - orderId?: 可选，预生成订单号
 *
 * 支付流程（阶段1 — 兜底）：
 *   1. 点击"确认支付" → 调后端 /api/payments/alipay/create-order 拿 payUrl
 *   2. 用 expo-web-browser 跳转到支付宝网页收银台
 *   3. 用户在支付宝内完成支付
 *   4. 监听 app state 变化，回调时显示"支付完成"
 *
 * 阶段2（待后端接入 alipay.trade.app.pay）替换为：
 *   1. 拿后端返回的 orderString
 *   2. NativeModules.AlipayPay.pay(orderString) 调起支付宝 APP
 *   3. 接收 PayResult 处理结果
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Animated,
  NativeModules,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { spacing, radius, shadow } from '../theme/tokens';
import { LocalizedText } from '../components/LocalizedText';
import { LinkText } from '../components/LinkText';
import { useStaggerFadeIn } from '../lib/animations';

/**
 * 支付宝支付结果状态码（来自 AlipayPay NativeModule 返回的 resultStatus）
 * 9000 = 支付成功
 * 8000 = 正在处理中
 * 4000 = 支付失败
 * 6001 = 用户取消
 * 6002 = 网络错误
 */
function interpretAlipayResult(resultStatus: string): { success: boolean; pending: boolean; cancelled: boolean; failed: boolean } {
  return {
    success: resultStatus === '9000',
    pending: resultStatus === '8000',
    cancelled: resultStatus === '6001',
    failed: resultStatus === '4000' || resultStatus === '6002',
  }
}

export interface AlipayPayScreenProps {
  route: {
    params: {
      tier: 'medium' | 'heavy' | 'super';
      billingCycle: 'monthly' | 'yearly';
      tierName: string;
      price: string;
    };
  };
  navigation: any;
}

type PayPhase = 'idle' | 'creating' | 'opening' | 'opened' | 'success' | 'failed';

export default function AlipayPayScreen({ route, navigation }: AlipayPayScreenProps) {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const { tier, billingCycle, tierName, price } = route.params;

  // 防御性处理：price 可能是 string（标准）或 fmtPrice 返回的 {amt, symbol, per} 对象
  const priceText = useMemo(() => {
    if (typeof price === 'string') return price;
    if (price && typeof price === 'object') {
      const p = price as { amt?: string | number; symbol?: string; per?: string };
      const amt = p.amt != null ? String(p.amt) : '';
      const symbol = p.symbol || '';
      const per = p.per || '';
      return `${symbol}${amt} / ${per}`.trim();
    }
    return '';
  }, [price]);

  const [phase, setPhase] = useState<PayPhase>('idle');
  const [orderId, setOrderId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const appStateRef = useRef(AppState.currentState);

  // 列表入场动画
  const anim0 = useStaggerFadeIn(0);
  const anim1 = useStaggerFadeIn(1);
  const anim2 = useStaggerFadeIn(2);
  const anim3 = useStaggerFadeIn(3);

  // 监听 AppState 变化：当用户从支付宝切回 App 时，询问支付结果
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      // 从 background 切回 active，且当前处于 opened 阶段
      if (prev.match(/inactive|background/) && next === 'active' && phase === 'opened') {
        setPhase('success');
      }
    });
    return () => sub.remove();
  }, [phase]);

  async function handlePay() {
    if (phase === 'creating' || phase === 'opening') return;
    setError('');
    setPhase('creating');
    try {
      // 1. 调后端创建订单（后端根据 platform 字段决定返回 orderString 或 payUrl）
      const r = await api.post('/api/payments/alipay/create-order', {
        tier,
        billingCycle,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      const data = r.data?.data || r.data;
      const oId = data?.orderId;
      // 后端返回 { orderId, extra: { orderString, payUrl } }，字段在 extra 下
      const payUrl = data?.extra?.payUrl;
      const orderString = data?.extra?.orderString;

      if (!oId) throw new Error('orderId missing');
      setOrderId(String(oId));

      if (!payUrl && !orderString) {
        throw new Error('PAYURL/ORDERSTRING MISSING');
      }

      // 2. 安卓优先：调起支付宝 APP 完成支付（Native SDK 已在 china flavor 集成）
      if (Platform.OS === 'android' && orderString && NativeModules.AlipayPay) {
        setPhase('opening');
        try {
          const result: { resultStatus: string; result: string; memo: string } = await NativeModules.AlipayPay.pay(orderString);
          const { success, pending, cancelled, failed } = interpretAlipayResult(result.resultStatus);

          if (success || pending) {
            // 成功或处理中：通知后端确认（capture 会通过 alipay.trade.query 校验真实状态）
            try {
              await api.post('/api/payments/alipay/capture', {
                orderId: oId,
                tier,
                billingCycle,
              });
            } catch (captureErr) {
              console.warn('capture after pay failed:', captureErr);
            }
            setPhase('success');
            return;
          }

          if (cancelled) {
            setPhase('idle');
            setError(t('payment.userCancelled') || '支付已取消');
            return;
          }

          if (failed) {
            throw new Error(t('payment.payFailed') || '支付失败，请重试');
          }

          throw new Error(`Unknown resultStatus: ${result.resultStatus}`);
        } catch (e: any) {
          // 用户取消时 NativeModule 也会 reject，需要区别对待
          const code = e?.code || '';
          if (code === 'ALIPAY_PAY_ERROR' && /cancel/i.test(e?.message || '')) {
            setPhase('idle');
            setError(t('payment.userCancelled') || '支付已取消');
            return;
          }
          throw e;
        }
      }

      // 3. iOS / 无 NativeModule：使用 payUrl 走 Web 浏览器兜底
      if (payUrl) {
        setPhase('opening');
        await WebBrowser.openBrowserAsync(payUrl);
        setPhase('opened');
        // 询问用户支付结果
        Alert.alert(
          t('payment.completeTitle') || '支付完成',
          t('payment.completeDesc') || '请在浏览器中完成支付，返回后将更新订单状态。',
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('payment.paid') || '已完成支付',
              onPress: async () => {
                try {
                  await api.post('/api/payments/alipay/capture', {
                    orderId: oId,
                    tier,
                    billingCycle,
                  });
                  setPhase('success');
                } catch (e: any) {
                  setPhase('failed');
                  setError(e?.message || t('common.error'));
                }
              },
            },
          ]
        );
      } else {
        throw new Error(t('payment.sdkPending') || 'Alipay SDK is being integrated, please use web payment');
      }
    } catch (e: any) {
      setPhase('failed');
      const msg = e?.message || t('common.error');
      setError(msg);
    }
  }

  function handleBack() {
    if (phase === 'creating' || phase === 'opening') return;
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  }

  const isProcessing = phase === 'creating' || phase === 'opening';
  const isCompleted = phase === 'opened' || phase === 'success';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 套餐摘要卡片 */}
      <Animated.View style={[{ opacity: anim0.opacity, transform: [{ translateY: anim0.translateY }] }]}>
        <View style={[styles.card, { backgroundColor: colors.card }, shadow.card]}>
          <LocalizedText
            text={t('payment.orderSummary')}
            variant="caption"
            color="textTertiary"
          />
          <View style={styles.row}>
            <LocalizedText
              text={t(`tier.${tier}`) || tier}
              variant="title"
              color="text"
            />
            <LocalizedText
              text={billingCycle === 'yearly' ? t('tier.yearly') : t('tier.monthly')}
              variant="caption"
              color="textSecondary"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <LocalizedText text={t('payment.amount')} variant="body" color="textSecondary" />
            <LocalizedText text={priceText} variant="title" color="primary" />
          </View>
          {orderId ? (
            <View style={[styles.orderRow]}>
              <LocalizedText text={t('payment.orderId')} variant="caption" color="textTertiary" />
              <LocalizedText text={orderId} variant="caption" color="textTertiary" numberOfLines={1} />
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* 支付方式 */}
      <Animated.View style={[{ opacity: anim1.opacity, transform: [{ translateY: anim1.translateY }] }]}>
        <View style={[styles.card, { backgroundColor: colors.card }, shadow.card]}>
          <LocalizedText
            text={t('payment.paymentMethod')}
            variant="caption"
            color="textTertiary"
          />
          <View style={styles.payMethodRow}>
            <View style={[styles.payIcon, { backgroundColor: '#1677FF' + '15' }]}>
              <Ionicons name="wallet" size={22} color="#1677FF" />
            </View>
            <View style={{ flex: 1 }}>
              <LocalizedText
                text={t('payment.alipay')}
                variant="bodyBold"
                color="text"
              />
              <LocalizedText
                text={t('payment.alipayDesc')}
                variant="caption"
                color="textTertiary"
              />
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          </View>
        </View>
      </Animated.View>

      {/* 状态提示 */}
      {(isCompleted || phase === 'failed') && (
        <Animated.View style={[{ opacity: anim2.opacity, transform: [{ translateY: anim2.translateY }] }]}>
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor:
                  phase === 'failed'
                    ? (colors as any).dangerBg || '#E0707015'
                    : (colors as any).successBg || '#5B8A7215',
              },
            ]}
          >
            <Ionicons
              name={phase === 'failed' ? 'close-circle' : 'checkmark-circle'}
              size={20}
              color={phase === 'failed' ? colors.danger : colors.success}
            />
            <LocalizedText
              text={
                phase === 'failed'
                  ? (error || t('payment.payFailed'))
                  : t('payment.payInApp')
              }
              variant="caption"
              color={phase === 'failed' ? 'danger' : 'success'}
            />
          </View>
        </Animated.View>
      )}

      {/* 操作按钮 */}
      <Animated.View style={[{ opacity: anim3.opacity, transform: [{ translateY: anim3.translateY }] }]}>
        <TouchableOpacity
          onPress={handlePay}
          disabled={isProcessing}
          activeOpacity={0.85}
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: isProcessing ? 0.6 : 1 },
            shadow.floating,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {t('payment.payNow')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.linkRow}>
          <LinkText
            text={t('payment.contactSupport')}
            onPress={() => Alert.alert(t('common.contact'), t('payment.contactSupportDesc'))}
            variant="caption"
            color="textTertiary"
            align="center"
          />
        </View>

        <View style={styles.linkRow}>
          <LinkText
            text={t('common.back')}
            onPress={handleBack}
            variant="caption"
            color="textSecondary"
            align="center"
          />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// 用 Animated 别名解决 import 冲突
const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  payMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  payIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
