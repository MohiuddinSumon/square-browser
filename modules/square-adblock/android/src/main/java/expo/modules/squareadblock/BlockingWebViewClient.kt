// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squareadblock

import android.graphics.Bitmap
import android.net.http.SslError
import android.webkit.HttpAuthHandler
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream

/**
 * Wraps the WebViewClient installed by react-native-webview. Only
 * [shouldInterceptRequest] is added; every callback the original client handles is
 * forwarded unchanged so react-native-webview's events keep firing.
 */
class BlockingWebViewClient(
  private val delegate: WebViewClient,
  private val engine: AdBlockEngine,
) : WebViewClient() {

  override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
    // Main-frame navigations are left alone so the user can always open a page they typed.
    if (request != null && !request.isForMainFrame && engine.shouldBlock(request.url?.host)) {
      return WebResourceResponse(
        "text/plain",
        "utf-8",
        204,
        "No Content",
        emptyMap(),
        ByteArrayInputStream(ByteArray(0)),
      )
    }
    return delegate.shouldInterceptRequest(view, request)
  }

  override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean =
    delegate.shouldOverrideUrlLoading(view, request)

  override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) =
    delegate.onPageStarted(view, url, favicon)

  override fun onPageFinished(view: WebView?, url: String?) =
    delegate.onPageFinished(view, url)

  override fun doUpdateVisitedHistory(view: WebView?, url: String?, isReload: Boolean) =
    delegate.doUpdateVisitedHistory(view, url, isReload)

  override fun onReceivedHttpAuthRequest(
    view: WebView?,
    handler: HttpAuthHandler?,
    host: String?,
    realm: String?,
  ) = delegate.onReceivedHttpAuthRequest(view, handler, host, realm)

  override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) =
    delegate.onReceivedSslError(view, handler, error)

  override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) =
    delegate.onReceivedError(view, request, error)

  override fun onReceivedHttpError(
    view: WebView?,
    request: WebResourceRequest?,
    errorResponse: WebResourceResponse?,
  ) = delegate.onReceivedHttpError(view, request, errorResponse)

  override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean =
    delegate.onRenderProcessGone(view, detail)
}
