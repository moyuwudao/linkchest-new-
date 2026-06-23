package com.linkchest.app.privacy

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 合规模块：用于在 RN 端控制极光 SDK（JCore）的收集授权
 *
 * 调用流程：
 *   1) MainApplication.onCreate 会先调用 JCollectionAuth.setAuth(false)
 *   2) 用户同意隐私政策后，RN 端调用 setJiguangAuth(true) 开启极光数据收集
 *   3) 用户撤回同意后，RN 端调用 setJiguangAuth(false) 关闭收集
 */
class PrivacyAuthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PrivacyAuth"

  /**
   * 设置极光数据收集授权
   * @param enabled true=允许收集, false=禁止收集
   */
  @ReactMethod
  fun setJiguangAuth(enabled: Boolean, promise: Promise) {
    try {
      val authCls = Class.forName("cn.jiguang.api.utils.JCollectionAuth")
      val setAuth = authCls.getDeclaredMethod(
        "setAuth",
        android.content.Context::class.java,
        Boolean::class.javaPrimitiveType
      )
      setAuth.invoke(null, reactApplicationContext, enabled)
      Log.i("LinkChest", "JCollectionAuth.setAuth($enabled) 调用成功")
      promise.resolve(true)
    } catch (e: Throwable) {
      Log.w("LinkChest", "JCollectionAuth.setAuth 调用失败: ${e.message}")
      promise.resolve(false)
    }
  }

  /**
   * 查询当前极光授权状态
   */
  @ReactMethod
  fun isJiguangAuthorized(promise: Promise) {
    try {
      val authCls = Class.forName("cn.jiguang.api.utils.JCollectionAuth")
      val isAuth = authCls.getDeclaredMethod(
        "isAuth",
        android.content.Context::class.java
      )
      val result = isAuth.invoke(null, reactApplicationContext) as Boolean
      promise.resolve(result)
    } catch (e: Throwable) {
      promise.resolve(false)
    }
  }
}
