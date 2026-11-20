// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.ApplicationInfo
import android.view.View
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

  // Chromium pauses <video> in a WebView whose window is hidden (app in the background, screen
  // off). While the playback service runs it sets keepVisibleInBackground, and the WebView keeps
  // reporting itself visible so the video plays on. Same as the react-native-webview patch.
  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(if (keepVisibleInBackground) View.VISIBLE else visibility)
  }

  companion object {
    /** Set by square-playback's PlaybackService (by name, so the modules don't depend on each other). */
    @JvmField @Volatile var keepVisibleInBackground: Boolean = false
  }
}
