// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.OrientationEventListener
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.widget.FrameLayout
import android.widget.ImageButton
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback

/**
 * A site's fullscreen video (WebChromeClient.onShowCustomView), as the react-native-webview patch
 * did it: the video view covers the app, the phone switches to landscape, a rotate button sits
 * top right, rotation is freed once the phone is physically turned, and the system back gesture
 * leaves fullscreen.
 */
class FullscreenVideo(private val activityProvider: () -> Activity?) {
  private var videoView: View? = null
  private var callback: WebChromeClient.CustomViewCallback? = null
  private var hiddenWebView: View? = null
  private var savedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
  private var rotateButton: View? = null
  private var orientationListener: OrientationEventListener? = null
  private var pendingUnlock = 0 // 1 = waiting for the phone to be landscape, 2 = portrait
  private var backCallback: OnBackPressedCallback? = null

  fun show(webView: View, view: View, cb: WebChromeClient.CustomViewCallback) {
    val activity = activityProvider()
    val root = activity?.findViewById<ViewGroup>(android.R.id.content)
    if (activity == null || root == null || videoView != null) {
      cb.onCustomViewHidden()
      return
    }
    videoView = view
    callback = cb
    savedOrientation = activity.requestedOrientation

    view.setBackgroundColor(Color.BLACK)
    @Suppress("DEPRECATION")
    view.systemUiVisibility = FULLSCREEN_FLAGS
    activity.window.addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
    root.addView(view, FrameLayout.LayoutParams(MATCH, MATCH, Gravity.CENTER))
    webView.visibility = View.GONE
    hiddenWebView = webView

    // Movies are landscape; offer a rotate button; back leaves fullscreen.
    lockOrientation(activity, ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, toLandscape = true)
    addRotateButton(activity, root)
    registerBack(activity)
  }

  /** Leaves fullscreen. Safe to call when not in fullscreen (Chromium calls it after we do). */
  fun hide() {
    val view = videoView ?: return
    videoView = null
    val activity = activityProvider()

    hiddenWebView?.visibility = View.VISIBLE
    hiddenWebView = null
    (view.parent as? ViewGroup)?.removeView(view)
    rotateButton?.let { (it.parent as? ViewGroup)?.removeView(it) }
    rotateButton = null
    orientationListener?.disable()
    orientationListener = null
    pendingUnlock = 0
    backCallback?.remove()
    backCallback = null
    activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
    activity?.requestedOrientation = savedOrientation

    val cb = callback
    callback = null
    cb?.onCustomViewHidden()
  }

  private fun lockOrientation(activity: Activity, requested: Int, toLandscape: Boolean) {
    activity.requestedOrientation = requested
    pendingUnlock = if (toLandscape) 1 else 2
    if (orientationListener == null) {
      orientationListener = object : OrientationEventListener(activity) {
        override fun onOrientationChanged(deg: Int) {
          if (deg == ORIENTATION_UNKNOWN || pendingUnlock == 0) return
          val landscape = deg in 60..120 || deg in 240..300
          val portrait = deg <= 30 || deg >= 330 || deg in 150..210
          if ((pendingUnlock == 1 && landscape) || (pendingUnlock == 2 && portrait)) {
            // The phone now matches the forced orientation: let it rotate freely.
            pendingUnlock = 0
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
          }
        }
      }
    }
    orientationListener?.let { if (it.canDetectOrientation()) it.enable() }
  }

  private fun addRotateButton(activity: Activity, root: ViewGroup) {
    val density = activity.resources.displayMetrics.density
    val button = ImageButton(activity).apply {
      setImageResource(android.R.drawable.ic_menu_rotate)
      setColorFilter(Color.WHITE)
      contentDescription = "Rotate screen"
      alpha = 0.85f
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(0x99000000.toInt())
      }
      setOnClickListener {
        val landscape = activity.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        if (landscape) {
          lockOrientation(activity, ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT, toLandscape = false)
        } else {
          lockOrientation(activity, ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, toLandscape = true)
        }
      }
    }
    val size = (44 * density).toInt()
    val params = FrameLayout.LayoutParams(size, size, Gravity.TOP or Gravity.END)
    params.setMargins(0, (56 * density).toInt(), (12 * density).toInt(), 0)
    root.addView(button, params)
    rotateButton = button
  }

  private fun registerBack(activity: Activity) {
    val owner = activity as? ComponentActivity ?: return
    // Added last, so it runs before React Native's own back handling.
    val cb = object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() = hide()
    }
    owner.onBackPressedDispatcher.addCallback(owner, cb)
    backCallback = cb
  }

  private companion object {
    const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT

    @Suppress("DEPRECATION")
    const val FULLSCREEN_FLAGS = View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
      View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
      View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
      View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
      View.SYSTEM_UI_FLAG_FULLSCREEN or
      View.SYSTEM_UI_FLAG_IMMERSIVE or
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
  }
}
