// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squareplayback

import android.content.Intent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.core.content.ContextCompat
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SquarePlaybackModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SquarePlayback")
    Events("onMediaAction")

    OnCreate {
      PlaybackBridge.listener = { action -> sendEvent("onMediaAction", mapOf("action" to action)) }
    }
    OnDestroy { PlaybackBridge.listener = null }

    // Starts the service (or refreshes its notification). Starting must happen while the
    // app is in the foreground (Android 12+); updates afterwards work from the background.
    Function("update") { playing: Boolean, title: String, artist: String, artwork: String,
                         hasPrev: Boolean, hasNext: Boolean, seek: Boolean ->
      PlaybackService.info = MediaInfo(playing, title, artist, artwork, hasPrev, hasNext, seek)
      val running = PlaybackService.instance
      if (running != null) {
        running.refresh()
        return@Function true
      }
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      try {
        ContextCompat.startForegroundService(context, Intent(context, PlaybackService::class.java))
        true
      } catch (e: Exception) {
        false
      }
    }

    // Runs JS in the WebView with the given react tag. Goes straight to the native WebView
    // because React Native's UI command queue stalls while the app is in the background.
    AsyncFunction("evaluate") { viewTag: Int, js: String ->
      val found = appContext.findView<View>(viewTag)
      val webView = findWebView(found) ?: return@AsyncFunction false
      webView.evaluateJavascript(js, null)
      true
    }.runOnQueue(Queues.MAIN)

    Function("stop") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      context.stopService(Intent(context, PlaybackService::class.java))
      true
    }
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
