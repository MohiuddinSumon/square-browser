// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.ApplicationInfo
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView

/**
 * The WebView each SquareBrowser tab uses when the native engine is on.
 * Settings mirror what react-native-webview applied for the props BrowserTab passed, so
 * sites behave the same with either engine.
 */
@SuppressLint("SetJavaScriptEnabled")
class BrowserWebView(context: Context) : WebView(context) {
  init {
    settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      mediaPlaybackRequiresUserGesture = false
      mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
      javaScriptCanOpenWindowsAutomatically = false
      // Popups go to SquareWebView's onCreateWindow, which reports the URL to JS (new tab or blocked).
      setSupportMultipleWindows(true)
      setSupportZoom(true)
      builtInZoomControls = true
      displayZoomControls = false
      loadWithOverviewMode = true
      useWideViewPort = true
      allowFileAccess = false
      allowContentAccess = false
    }
    CookieManager.getInstance().apply {
      setAcceptCookie(true)
      setAcceptThirdPartyCookies(this@BrowserWebView, true)
    }
    if (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
      setWebContentsDebuggingEnabled(true)
    }
  }
}
