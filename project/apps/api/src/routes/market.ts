import { Router } from 'express'
import { getMarket, getMarketFeatures } from '../lib/market'

const router = Router()

/**
 * 获取当前市场配置
 * 前端据此动态显示可用的支付/登录方式
 */
router.get('/config', (req, res) => {
  const features = getMarketFeatures()
  // 强制注入 market 字段（MarketFeatures 接口未声明 market，需额外补充）
  const featuresWithMarket = { ...features, market: getMarket() }

  // 兼容多种微信登录环境变量命名
  const wechatWebClientId = process.env.WECHAT_APP_ID || process.env.WECHAT_CLIENT_ID || process.env.WECHAT_LOGIN_APPID || null
  const wechatMobileClientId = process.env.WECHAT_MOBILE_APPID || null

  res.json({
    success: true,
    data: {
      market: featuresWithMarket.market,
      authProviders: featuresWithMarket.authProviders,
      paymentProviders: featuresWithMarket.paymentProviders,
      pricing: featuresWithMarket.pricing,
      platforms: featuresWithMarket.platforms,
      // 前端需要的配置
      clientIds: {
        google: process.env.GOOGLE_CLIENT_ID || null,
        wechat: wechatWebClientId,       // 网站应用（WEB端）
        wechatMobile: wechatMobileClientId,  // 移动应用（iOS/Android端）
        apple: process.env.APPLE_CLIENT_ID || null,
      },
    },
  })
})

export default router
