package com.battleexam.app;

import android.os.Bundle;
import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Clerk sets the __client cookie on its own domain
        // (destined-oryx-36.clerk.accounts.dev / clerk.battleexam.com), then
        // reads it on subsequent /v1/* requests. Without third-party cookies
        // enabled, Android WebView strips the cookie and Clerk rejects the
        // request with authorization_invalid.
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
    }
}
