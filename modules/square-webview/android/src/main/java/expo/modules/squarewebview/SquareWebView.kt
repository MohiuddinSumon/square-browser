// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.content.Context
import android.graphics.Bitmap
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.ScriptHandler
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * One browser tab: an ExpoView holding a [BrowserWebView].
 *
 * The JS side (modules/square-webview/index.js) keeps the react-native-webview shapes BrowserTab
 * already uses: events carry `url`, `title`, `canGoBack`, `canGoForward`, `loading` and the
 * view tag (`target`) the square-adblock / square-playback modules look the WebView up by;
 * pages post messages through `window.ReactNativeWebView.postMessage(string)`.
 */
class SquareWebView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // The WebView is a plain Android child, so let Android measure and lay it out.
  override val shouldUseAndroidLayout = true

  private val onLoadStart by EventDispatcher()
  private val onLoadProgress by EventDispatcher()
  private val onLoadEnd by EventDispatcher()
  private val onNavigationStateChange by EventDispatcher()
  private val onMessage by EventDispatcher()
  private val onExternalUrl by EventDispatcher()

  var webView: BrowserWebView = createWebView()
    private set

  // Props (applied together in applyProps, after React has set all of them).
  var sourceUri: String? = null
  var userAgent: String? = null
  var documentStartScript: String = ""
  var documentEndScript: String = ""

  private var loadedSourceUri: String? = null
  private var appliedStartScript: String? = null
  private var startScriptHandler: ScriptHandler? = null
  private val documentStartSupported =
    WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)

  private fun createWebView(): BrowserWebView {
    val view = BrowserWebView(context)
    view.webViewClient = Client()
    view.webChromeClient = ChromeClient()
    view.addJavascriptInterface(Bridge(), BRIDGE_NAME)
    addView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    return view
  }

  fun applyProps() {
    val ua = userAgent
    if (!ua.isNullOrEmpty() && webView.settings.userAgentString != ua) {
      webView.settings.userAgentString = ua
    }
    applyDocumentStartScript()
    val uri = sourceUri
    if (!uri.isNullOrEmpty() && uri != loadedSourceUri) {
      loadedSourceUri = uri
      webView.loadUrl(uri)
    }
  }

  /** Re-registers the document-start script when it changes; it applies from the next page load. */
  private fun applyDocumentStartScript() {
    if (!documentStartSupported || appliedStartScript == documentStartScript) return
    startScriptHandler?.remove()
    startScriptHandler = null
    appliedStartScript = documentStartScript
    if (documentStartScript.isNotBlank()) {
      startScriptHandler = WebViewCompat.addDocumentStartJavaScript(
        webView, wrapForTopFrame(documentStartScript), setOf("*")
      )
    }
  }

  // --- Methods called from JS through the component ref ------------------------------------

  fun reload() = webView.reload()
  fun goBack() { if (webView.canGoBack()) webView.goBack() }
  fun goForward() { if (webView.canGoForward()) webView.goForward() }
  fun stopLoading() = webView.stopLoading()
  fun injectJavaScript(script: String) = webView.evaluateJavascript(script, null)
  fun loadUrl(url: String) = webView.loadUrl(url)

  fun destroy() {
    startScriptHandler?.remove()
    startScriptHandler = null
    webView.stopLoading()
    webView.removeJavascriptInterface(BRIDGE_NAME)
    removeView(webView)
    webView.destroy()
  }

  // --- Events --------------------------------------------------------------------------------

  private fun state(url: String? = webView.url, loading: Boolean): Map<String, Any> = mapOf(
    "target" to id,
    "url" to (url ?: ""),
    "title" to (webView.title ?: ""),
    "canGoBack" to webView.canGoBack(),
    "canGoForward" to webView.canGoForward(),
    "loading" to loading,
  )

  private var isLoading = false

  private inner class Client : WebViewClient() {
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
      val scheme = request.url.scheme?.lowercase() ?: return false
      return when (scheme) {
        in WEB_SCHEMES -> false // phase 2 moves app-link and ad-host checks for http(s) here
        in BLOCKED_SCHEMES -> true
        else -> {
          // whatsapp:, intent:, market:, tel: ... JS shows the "Open in app?" prompt.
          if (request.isForMainFrame || request.hasGesture()) {
            onExternalUrl(mapOf("target" to id, "url" to request.url.toString()))
          }
          true
        }
      }
    }

    override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
      isLoading = true
      // Older WebViews without document-start support: inject as early as we can.
      if (!documentStartSupported && documentStartScript.isNotBlank()) {
        view.evaluateJavascript(wrapForTopFrame(documentStartScript), null)
      }
      val event = state(url, true)
      onLoadStart(event)
      onNavigationStateChange(event)
    }

    override fun onPageFinished(view: WebView, url: String?) {
      isLoading = false
      if (documentEndScript.isNotBlank()) {
        view.evaluateJavascript(wrapForTopFrame(documentEndScript), null)
      }
      val event = state(url, false)
      onLoadEnd(event)
      onNavigationStateChange(event)
    }

    // Also catches history.pushState navigations in single-page sites.
    override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
      onNavigationStateChange(state(url, isLoading))
    }

    // The renderer crashed or was killed to free memory. A WebView can't be used after that,
    // so swap in a fresh one and reload the page instead of letting the app crash.
    override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
      if (view !== webView) return true
      val url = view.url
      startScriptHandler = null
      appliedStartScript = null
      view.removeJavascriptInterface(BRIDGE_NAME)
      removeView(view)
      view.destroy()
      webView = createWebView()
      applyProps()
      if (!url.isNullOrEmpty()) webView.loadUrl(url)
      return true
    }
  }

  private inner class ChromeClient : WebChromeClient() {
    override fun onProgressChanged(view: WebView, newProgress: Int) {
      onLoadProgress(mapOf("target" to id, "url" to (view.url ?: ""), "progress" to newProgress / 100.0))
    }

    override fun onReceivedTitle(view: WebView, title: String?) {
      onNavigationStateChange(state(view.url, isLoading))
    }
  }

  /** `window.ReactNativeWebView.postMessage(string)`, same as react-native-webview. */
  private inner class Bridge {
    @JavascriptInterface
    fun postMessage(message: String) {
      post { onMessage(mapOf("target" to id, "url" to (webView.url ?: ""), "data" to message)) }
    }
  }

  companion object {
    const val BRIDGE_NAME = "ReactNativeWebView"
    private val WEB_SCHEMES = setOf("http", "https", "about", "data", "blob", "javascript")
    private val BLOCKED_SCHEMES = setOf("file", "content")

    /** Main frame only (like react-native-webview's injected scripts), each in its own scope. */
    fun wrapForTopFrame(script: String) =
      "if (window === window.top) { (function() {\n$script\n;})(); }"
  }
}
