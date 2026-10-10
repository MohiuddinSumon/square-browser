// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squareadblock

import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import expo.modules.kotlin.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SquareAdBlockModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SquareAdBlock")

    Function("setDomains") { domains: List<String> -> AdBlockEngine.setDomains(domains) }
    Function("setEnabled") { enabled: Boolean -> AdBlockEngine.enabled = enabled }
    Function("getBlockedCount") { AdBlockEngine.blockedCount() }
    Function("resetBlockedCount") { AdBlockEngine.resetBlockedCount() }

    // Wraps the WebView client of the react-native-webview instance with the given
    // react tag. Returns false when the request filter could not be installed.
    AsyncFunction("attach") { viewTag: Int ->
      // WebViewClient has no getter before API 26; JS-level blocking still applies there.
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@AsyncFunction false
      val webView = findWebView(appContext.findView<View>(viewTag)) ?: return@AsyncFunction false
      val current = webView.webViewClient
      if (current !is BlockingWebViewClient) {
        webView.webViewClient = BlockingWebViewClient(current, AdBlockEngine)
      }
      true
    }.runOnQueue(Queues.MAIN)
  }

  private fun findWebView(view: View?): WebView? {
    if (view is WebView) return view
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        findWebView(view.getChildAt(i))?.let { return it }
      }
    }
    return null
  }
}
