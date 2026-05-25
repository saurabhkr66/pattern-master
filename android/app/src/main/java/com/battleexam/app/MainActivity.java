package com.battleexam.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "BattleExamMainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Clerk sets the __client cookie on its own domain (clerk.battleexam.com).
        // The WebView origin is www.battleexam.com — same registrable domain but
        // different host, which Android's WebView treats as third-party. Without
        // this opt-in, /v1/* requests come back 403 authorization_invalid because
        // the WebView strips the __client cookie before sending it back.
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
            Log.i(TAG, "Third-party cookies enabled on bridge WebView");
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable third-party cookies", e);
        }
    }
}
