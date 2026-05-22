import { Router } from 'express'
import { getMarket, getMarketFeatures } from '../lib/market'

const router = Router()

/**
 * 获取当前市场配置
 * 前端据此动态显示可用的支付/登录方式
 */
router.get('/config', (req, res) => {
  const features = getMarketFeatures()

  res.json({
    success: true,
    data: {
      market: getMarket(),
      paymentProviders: features.paymentProviders,
      authProviders: features.authProviders,
      pricing: features.pricing,
      platforms: features.platforms,
    },
  })
})

export default router
