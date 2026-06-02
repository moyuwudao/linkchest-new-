package cn.linkchest.app.wxapi

import android.app.Activity
import android.os.Bundle
import android.util.Log
import com.wechatlib.WeChatLibModule

class WXEntryActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            WeChatLibModule.handleIntent(intent)
        } catch (e: Exception) {
            Log.e("WXEntryActivity", "handleIntent error", e)
        }
        finish()
    }
}
