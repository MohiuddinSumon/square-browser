// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Message
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
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
  private val onOpenWindow by EventDispatcher()
  private val onFileDownload by EventDispatcher()

  // Native pull to refresh around the WebView. See PullGuard for when a pull is allowed.
  private val pullGuard = PullGuard()
  private val swipe = SwipeRefreshLayout(context).also {
    addView(it, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
  }
  private val stopRefreshing = Runnable { swipe.isRefreshing = false }

  var webView: BrowserWebView = createWebView()
    private set

  private val fullscreen = FullscreenVideo { appContext.currentActivity }

  // Props (applied together in applyProps, after React has set all of them).
  var sourceUri: String? = null
  var userAgent: String? = null
  var documentStartScript: String = ""
  var documentEndScript: String = ""
  /** Ad/tracker domains: tapping a link to one of them (main frame) is silently refused. */
  var blockedHosts: Set<String> = emptySet()
  var pullToRefreshEnabled: Boolean = true
    set(value) {
      field = value
      swipe.isEnabled = value
    }

  private var loadedSourceUri: String? = null
  private var appliedStartScript: String? = null
  private var startScriptHandler: ScriptHandler? = null
  private val documentStartSupported =
    WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)

  init {
    swipe.setColorSchemeColors(ACCENT)
    swipe.setOnChildScrollUpCallback { _, _ -> webView.scrollY > 0 || !pullGuard.allowed }
    swipe.setOnRefreshListener {
      webView.reload()
      // onPageFinished stops the spinner; this covers a reload that never finishes.
      removeCallbacks(stopRefreshing)
      postDelayed(stopRefreshing, 15000)
    }
  }

  private fun createWebView(): BrowserWebView {
    val view = BrowserWebView(context)
    view.webViewClient = Client()
    view.webChromeClient = ChromeClient()
    view.addJavascriptInterface(Bridge(), BRIDGE_NAME)
    view.addJavascriptInterface(pullGuard, PullGuard.NAME)
    view.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
      val name = Downloads.start(context, url, userAgent, contentDisposition, mimeType, view.url)
      onFileDownload(mapOf("target" to id, "url" to url, "fileName" to (name ?: ""), "started" to (name != null)))
    }
    swipe.addView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
    return view
  }

  // Each new touch starts as "no pull" until the page's PullGuard script says otherwise.
  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    if (ev.actionMasked == MotionEvent.ACTION_DOWN) pullGuard.allowed = false
    return super.dispatchTouchEvent(ev)
  }

  /** What runs at document start: the pull guard plus BrowserTab's scripts. */
  private fun startScripts() = PullGuard.SCRIPT + "\n" + documentStartScript

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
    val scripts = startScripts()
    if (!documentStartSupported || appliedStartScript == scripts) return
    startScriptHandler?.remove()
    appliedStartScript = scripts
    startScriptHandler = WebViewCompat.addDocumentStartJavaScript(webView, wrapForTopFrame(scripts), setOf("*"))
  }

  // --- Methods called from JS through the component ref ------------------------------------

  fun reload() = webView.reload()
  fun goBack() { if (webView.canGoBack()) webView.goBack() }
  fun goForward() { if (webView.canGoForward()) webView.goForward() }
  fun stopLoading() = webView.stopLoading()
  fun injectJavaScript(script: String) = webView.evaluateJavascript(script, null)
  fun loadUrl(url: String) = webView.loadUrl(url)

  fun destroy() {
    fullscreen.hide()
    startScriptHandler?.remove()
    startScriptHandler = null
    webView.stopLoading()
    webView.removeJavascriptInterface(BRIDGE_NAME)
    webView.removeJavascriptInterface(PullGuard.NAME)
    removeCallbacks(stopRefreshing)
    swipe.removeView(webView)
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
    // Decided here, synchronously. react-native-webview asked JS and waited up to 250 ms, then let
    // the navigation through if JS was busy.
    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
      val uri = request.url
      val scheme = uri.scheme?.lowercase() ?: return false
      return when (scheme) {
        "http", "https" -> {
          if (!request.isForMainFrame) return false
          when {
            LinkRules.isBlockedHost(uri.host, blockedHosts) -> true
            // Play Store / WhatsApp web links: JS asks "Open in app?" and calls loadUrl to stay.
            LinkRules.isAppWebLink(uri.host, uri.path, uri.getQueryParameter("id") != null) -> {
              onExternalUrl(mapOf("target" to id, "url" to uri.toString(), "web" to true))
              true
            }
            else -> false
          }
        }
        in WEB_SCHEMES -> false
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
      if (!documentStartSupported) {
        view.evaluateJavascript(wrapForTopFrame(startScripts()), null)
      }
      val event = state(url, true)
      onLoadStart(event)
      onNavigationStateChange(event)
    }

    override fun onPageFinished(view: WebView, url: String?) {
      isLoading = false
      removeCallbacks(stopRefreshing)
      swipe.isRefreshing = false
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
      fullscreen.hide()
      val url = view.url
      startScriptHandler = null
      appliedStartScript = null
      view.removeJavascriptInterface(BRIDGE_NAME)
      view.removeJavascriptInterface(PullGuard.NAME)
      swipe.removeView(view)
      view.destroy()
      webView = createWebView()
      applyProps()
      if (!url.isNullOrEmpty()) webView.loadUrl(url)
      return true
    }
  }

  private inner class ChromeClient : WebChromeClient() {
    // A site's fullscreen button (video players). See FullscreenVideo.
    override fun onShowCustomView(view: View, callback: CustomViewCallback) {
      fullscreen.show(webView, view, callback)
    }

    override fun onHideCustomView() = fullscreen.hide()

    // <input type="file">
    override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams?) =
      FileChooser.open(appContext.currentActivity, callback, params)

    // SquareBrowser has no camera, microphone or location permission: sites are told no, the
    // same as with the old engine. Explicit so a future library default can't change that.
    override fun onPermissionRequest(request: PermissionRequest) = request.deny()

    override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback?) {
      callback?.invoke(origin, false, false)
    }

    // Without this, Android draws a grey "play" placeholder for videos without a poster.
    override fun getDefaultVideoPoster(): Bitmap? = Bitmap.createBitmap(50, 50, Bitmap.Config.ARGB_8888)

    // window.open / target="_blank". The URL is only known once the new window starts loading,
    // so hand Chromium a throwaway WebView, catch its first URL, report it and drop it.
    // JS decides: new tab, open-in-app prompt, or nothing (ad blocker on).
    override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean {
      val transport = resultMsg.obj as? WebView.WebViewTransport ?: return false
      val popup = WebView(view.context)
      var done = false
      fun finish(url: String?) {
        if (done) return
        done = true
        if (!url.isNullOrEmpty() && url != "about:blank") {
          onOpenWindow(mapOf("target" to id, "targetUrl" to url, "userGesture" to isUserGesture))
        }
        popup.post { popup.stopLoading(); popup.destroy() }
      }
      popup.webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
          finish(r.url.toString())
          return true
        }
        override fun onPageStarted(v: WebView, url: String?, favicon: Bitmap?) {
          if (url != null && url != "about:blank") finish(url)
        }
      }
      // A popup that never navigates (window.open('') + document.write) is just dropped.
      popup.postDelayed({ finish(null) }, 5000)
      transport.webView = popup
      resultMsg.sendToTarget()
      return true
    }

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
    private const val ACCENT = 0xFF007AFF.toInt() // theme.js accent

    /** Main frame only (like react-native-webview's injected scripts), each in its own scope. */
    fun wrapForTopFrame(script: String) =
      "if (window === window.top) { (function() {\n$script\n;})(); }"
  }
}
