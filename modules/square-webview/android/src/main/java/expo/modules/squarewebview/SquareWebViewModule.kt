// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * SquareBrowser's own WebView component for Android (phase 1 of replacing
 * react-native-webview there). See modules/square-webview/index.js for the JS side.
 */
class SquareWebViewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SquareWebView")

    // The file picker for <input type="file"> reports back here.
    OnActivityResult { _, payload ->
      FileChooser.onResult(payload.requestCode, payload.resultCode, payload.data)
    }

    View(SquareWebView::class) {
      Events(
        "onLoadStart",
        "onLoadProgress",
        "onLoadEnd",
        "onNavigationStateChange",
        "onMessage",
        "onExternalUrl",
        "onOpenWindow",
        "onFileDownload"
      )

      Prop("sourceUri") { view: SquareWebView, uri: String? -> view.sourceUri = uri }
      Prop("userAgent") { view: SquareWebView, ua: String? -> view.userAgent = ua }
      Prop("documentStartScript") { view: SquareWebView, script: String? ->
        view.documentStartScript = script ?: ""
      }
      Prop("documentEndScript") { view: SquareWebView, script: String? ->
        view.documentEndScript = script ?: ""
      }
      Prop("pullToRefreshEnabled") { view: SquareWebView, enabled: Boolean? ->
        view.pullToRefreshEnabled = enabled ?: true
      }
      Prop("blockedHosts") { view: SquareWebView, hosts: List<String>? ->
        view.blockedHosts = hosts.orEmpty().map { it.lowercase() }.toSet()
      }

      // Runs once per prop update, after every changed prop is set, so the user agent and
      // scripts are in place before the first page load.
      OnViewDidUpdateProps { view: SquareWebView -> view.applyProps() }
      OnViewDestroys { view: SquareWebView -> view.destroy() }

      // Ref methods. Same names as react-native-webview's, so BrowserTab, BrowserContext and
      // the navigation controls work with either engine.
      AsyncFunction("reload") { view: SquareWebView -> view.reload() }.runOnQueue(Queues.MAIN)
      AsyncFunction("goBack") { view: SquareWebView -> view.goBack() }.runOnQueue(Queues.MAIN)
      AsyncFunction("goForward") { view: SquareWebView -> view.goForward() }.runOnQueue(Queues.MAIN)
      AsyncFunction("stopLoading") { view: SquareWebView -> view.stopLoading() }.runOnQueue(Queues.MAIN)
      AsyncFunction("injectJavaScript") { view: SquareWebView, script: String ->
        view.injectJavaScript(script)
      }.runOnQueue(Queues.MAIN)
      AsyncFunction("loadUrl") { view: SquareWebView, url: String -> view.loadUrl(url) }.runOnQueue(Queues.MAIN)
    }
  }
}
