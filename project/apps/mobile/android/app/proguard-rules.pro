# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ========== React Native 核心（必须全部保留，否则 JS 桥接反射失败）==========
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep,allowobfuscation @interface com.facebook.react.bridge.ReadableType
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.common.internal.DoNotStrip class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }
-keep class com.facebook.common.** { *; }
-keep class com.facebook.fbreact.** { *; }
-keep class com.facebook.systrace.** { *; }
-keep class com.facebook.fresco.** { *; }
-keep class com.facebook.infer.** { *; }

-keepclasseswithmembernames class * { native <methods>; }
-keepclassmembers,includedescriptorclasses class * { native <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod <methods>; }
-keepclassmembers class * extends com.facebook.react.bridge.BaseJavaModule {
    public *;
}
-keepclassmembers class * extends com.facebook.react.ReactPackage { public *; }
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager { public *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }

-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ========== React Native Reanimated ==========
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ========== React Native Gesture Handler ==========
-keep class com.swmansion.gesturehandler.** { *; }

# ========== React Native Screens ==========
-keep class com.swmansion.rnscreens.** { *; }

# ========== React Native SVG ==========
-keep public class com.horcrux.svg.** {*;}

# ========== React Navigation Safe Area ==========
-keep class com.th3rdwave.safeareacontext.** { *; }

# ========== AsyncStorage ==========
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ========== Firebase ==========
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ========== Expo Modules ==========
-keep class expo.** { *; }
-keep class expo.modules.** { *; }
-keep class versioned.host.exp.exponent.** { *; }
-keepclassmembers class ** {
    @expo.modules.kotlin.modules.Module *;
}
-dontwarn expo.**

# ========== Kotlin ==========
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-keepclassmembers class **$Companion {
    *;
}
-keepclassmembers class * {
    @kotlin.Metadata <methods>;
}
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# ========== 极光推送 JPush + JCore ==========
-dontoptimize
-dontpreverify
-dontwarn cn.jpush.**
-dontwarn cn.jiguang.**
-keep class cn.jpush.** { *; }
-keep class cn.jiguang.** { *; }
-keep class * extends cn.jpush.android.helpers.JPushMessageReceiver { *; }
-keep class * extends cn.jpush.android.service.JPushMessageReceiver { *; }

# ========== 支付宝 SDK ==========
-keep class com.alipay.** { *; }
-keep class com.ta.utdid2.** { *; }
-keep class com.ut.device.** { *; }
-dontwarn com.alipay.**

# ========== 厂商推送 SDK ==========
-keep class com.huawei.** { *; }
-keep class com.xiaomi.** { *; }
-keep class com.heytap.** { *; }
-keep class com.vivo.** { *; }
-keep class com.hihonor.** { *; }
-dontwarn com.huawei.**
-dontwarn com.xiaomi.**
-dontwarn com.heytap.**
-dontwarn com.vivo.**
-dontwarn com.hihonor.**

# ========== 项目自身代码（保留 Native 模块以避免反射失败）==========
-keep class com.linkchest.app.** { *; }

# ========== 微信 SDK ==========
-keep class com.tencent.mm.opensdk.** { *; }
-keep class com.tencent.wxop.** { *; }
-keep class com.tencent.mm.sdk.** { *; }
-dontwarn com.tencent.mm.**

# ========== OkHttp / Okio / Networking ==========
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.codehaus.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }

# ========== JS 引擎相关 ==========
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.devsupport.** { *; }

# ========== 通用规则 ==========
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes Exceptions
-keepattributes SourceFile,LineNumberTable
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeInvisibleParameterAnnotations

# 保留 R 文件中的资源 ID
-keep class **.R$* { *; }

# 保留枚举
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# 保留序列化类
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# 保留 Parcelable
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# 保留 Gson / JSON 模型类（项目内 model 类）
-keepclassmembers class * {
    private <fields>;
    public <fields>;
    protected <fields>;
}
