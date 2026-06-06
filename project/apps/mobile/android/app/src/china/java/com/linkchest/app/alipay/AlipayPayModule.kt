package com.linkchest.app.alipay

import com.alipay.sdk.app.EnvUtils
import com.alipay.sdk.app.PayTask
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

/**
 * 支付宝移动支付 NativeModule
 * 仅在 china flavor 编译（AlipayPayPackage 在 MainApplication 中按 MARKET 条件注册）
 *
 * JS 端调用：
 *   import { NativeModules } from 'react-native';
 *   const { AlipayPay } = NativeModules;
 *   const result = await AlipayPay.pay(orderString);
 *   result: { resultStatus, result, memo } | { error: 'msg' }
 */
class AlipayPayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AlipayPay"

  /**
   * 调起支付宝客户端完成支付
   * @param orderString 后端签名后的订单字符串（来自 alipay.trade.app.pay）
   * @param promise resolve: { resultStatus, result, memo } / reject: { code, msg }
   */
  @ReactMethod
  fun pay(orderString: String, promise: Promise) {
    try {
      // PayTask 必须在主线程/UI 线程构造并执行
      val activity = currentActivity
      if (activity == null) {
        val error: WritableMap = Arguments.createMap()
        error.putString("code", "NO_ACTIVITY")
        error.putString("msg", "Current activity is null")
        promise.reject("NO_ACTIVITY", "Current activity is null")
        return
      }

      // 沙箱环境切换：支付宝 SDK 默认走生产环境，必须显式设置沙箱
      // 生产环境上线时必须移除此行或改为 EnvEnum.ONLINE
      EnvUtils.setEnv(EnvUtils.EnvEnum.SANDBOX)

      val payTask = PayTask(activity)
      // 同步调用（PayTask.payV2 内部已经异步处理 UI 线程）
      val result = payTask.payV2(orderString, true)

      val map: WritableMap = Arguments.createMap()
      map.putString("resultStatus", result["resultStatus"] ?: "")
      map.putString("result", result["result"] ?: "")
      map.putString("memo", result["memo"] ?: "")
      promise.resolve(map)
    } catch (e: Throwable) {
      promise.reject("ALIPAY_PAY_ERROR", e.message ?: "Unknown error", e)
    }
  }

  /**
   * 查询当前是否已安装支付宝客户端
   * @param promise resolve: Boolean
   */
  @ReactMethod
  fun isAlipayInstalled(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      val packageManager = ctx.packageManager
      val installed = try {
        packageManager.getPackageInfo("com.eg.android.AlipayGphone", 0)
        true
      } catch (e: Exception) {
        false
      }
      promise.resolve(installed)
    } catch (e: Throwable) {
      promise.reject("ALIPAY_CHECK_ERROR", e.message ?: "Unknown error", e)
    }
  }
}
