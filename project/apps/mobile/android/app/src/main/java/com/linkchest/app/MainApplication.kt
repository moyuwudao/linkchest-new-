package com.linkchest.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(new MyReactNativePackage());
            val packages = PackageList(this).packages.toMutableList()
            // 合规模块：极光授权控制
            packages.add(com.linkchest.app.privacy.PrivacyAuthPackage())
            // 中国市场按需加载支付宝支付 Package（china 源集才编译）
            if (BuildConfig.MARKET == "china") {
              try {
                val cls = Class.forName("com.linkchest.app.alipay.AlipayPayPackage")
                val pkg = cls.getDeclaredConstructor().newInstance() as ReactPackage
                packages.add(pkg)
              } catch (e: Throwable) {
                android.util.Log.e("LinkChest", "Failed to load AlipayPayPackage", e)
              }
            }
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    // 合规修复：在 onCreate 中立即关闭极光统计/极光推送（JCore）自动收集行为
    // 必须在 SoLoader.init 之后，ApplicationLifecycleDispatcher 之前
    // 用户同意隐私政策后，通过 PrivacyAuthModule.setJiguangAuth(true) 再开启
    try {
      val authCls = Class.forName("cn.jiguang.api.utils.JCollectionAuth")
      val setAuth = authCls.getDeclaredMethod("setAuth", android.content.Context::class.java, Boolean::class.javaPrimitiveType)
      setAuth.invoke(null, this, false)
      android.util.Log.i("LinkChest", "JCollectionAuth.setAuth(false) 已调用 — 用户同意前禁止极光收集个人信息")
    } catch (e: Throwable) {
      android.util.Log.w("LinkChest", "JCollectionAuth.setAuth 调用失败（可能未集成 JCore）: ${e.message}")
    }
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
