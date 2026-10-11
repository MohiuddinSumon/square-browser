// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squareplayback

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.content.ContextCompat
import java.net.URL

/** What the page is currently playing, as reported by the WebView. */
data class MediaInfo(
  val playing: Boolean = false,
  val title: String = "",
  val artist: String = "",
  val artworkUrl: String = "",
  val hasPrev: Boolean = false,
  val hasNext: Boolean = false,
  // True when the page has no track handlers: previous/next then seek -10s / +10s.
  val seek: Boolean = false,
)

/** Hands notification / headset button presses to the module (and on to JS). */
/**
 * Chromium pauses <video> playback in a hidden WebView. react-native-webview is patched
 * (patches/react-native-webview+*.patch) with a static flag that makes its WebViews keep
 * reporting themselves as visible; we flip it while the playback service is running.
 * Reflection keeps this module independent of react-native-webview at build time.
 */
object WebViewKeepVisible {
  fun set(on: Boolean) {
    try {
      Class.forName("com.reactnativecommunity.webview.RNCWebView")
        .getField("keepVisibleInBackground")
        .setBoolean(null, on)
    } catch (e: Exception) {
      // react-native-webview not patched: background video playback will pause.
    }
  }
}

object PlaybackBridge {
  @Volatile var listener: ((String) -> Unit)? = null
  fun emit(action: String) {
    listener?.invoke(action)
  }
}

/**
 * Foreground service that keeps the app process alive while a page has media, and shows
 * a media notification (title, artwork, previous / play-pause / next) backed by a
 * MediaSession so the lock screen and headset buttons work too.
 */
class PlaybackService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null
  private var session: MediaSession? = null
  private var artwork: Bitmap? = null
  private var artworkFor: String = ""
  private val main = Handler(Looper.getMainLooper())
  private val stopWhenIdle = Runnable { stopSelf() }

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      intent?.getStringExtra(EXTRA_ACTION)?.let { PlaybackBridge.emit(it) }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    WebViewKeepVisible.set(true)
    ContextCompat.registerReceiver(
      this, receiver, IntentFilter(ACTION_BUTTON), ContextCompat.RECEIVER_NOT_EXPORTED
    )
    session = MediaSession(this, "SquareBrowser").apply {
      setCallback(object : MediaSession.Callback() {
        override fun onPlay() { PlaybackBridge.emit("play") }
        override fun onPause() { PlaybackBridge.emit("pause") }
        override fun onSkipToNext() { PlaybackBridge.emit("next") }
        override fun onSkipToPrevious() { PlaybackBridge.emit("previous") }
      })
      isActive = true
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    refresh(first = true)
    if (wakeLock == null) {
      val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
      wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SquareBrowser:playback").apply {
        setReferenceCounted(false)
        acquire(MAX_WAKE_MS)
      }
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    instance = null
    WebViewKeepVisible.set(false)
    main.removeCallbacks(stopWhenIdle)
    try { unregisterReceiver(receiver) } catch (e: Exception) {}
    session?.release()
    session = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    super.onDestroy()
  }

  /** Rebuilds the session state and notification from the latest [info]. */
  fun refresh(first: Boolean = false) {
    val i = info
    main.removeCallbacks(stopWhenIdle)
    if (!i.playing) main.postDelayed(stopWhenIdle, IDLE_STOP_MS)
    loadArtwork(i.artworkUrl)

    session?.let { s ->
      s.setMetadata(
        MediaMetadata.Builder()
          .putString(MediaMetadata.METADATA_KEY_TITLE, i.title)
          .putString(MediaMetadata.METADATA_KEY_ARTIST, i.artist)
          .apply { artwork?.let { putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, it) } }
          .build()
      )
      var actions = PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE
      if (i.hasNext || i.seek) actions = actions or PlaybackState.ACTION_SKIP_TO_NEXT
      if (i.hasPrev || i.seek) actions = actions or PlaybackState.ACTION_SKIP_TO_PREVIOUS
      s.setPlaybackState(
        PlaybackState.Builder()
          .setActions(actions)
          .setState(
            if (i.playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
            PlaybackState.PLAYBACK_POSITION_UNKNOWN,
            if (i.playing) 1f else 0f
          )
          .build()
      )
    }

    val notification = buildNotification(i)
    if (first) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } else {
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .notify(NOTIFICATION_ID, notification)
    }
  }

  private fun loadArtwork(url: String) {
    if (url == artworkFor) return
    artworkFor = url
    artwork = null
    if (!url.startsWith("http")) return
    Thread {
      try {
        val conn = URL(url).openConnection().apply { connectTimeout = 5000; readTimeout = 5000 }
        val bitmap = conn.getInputStream().use { BitmapFactory.decodeStream(it) }
        main.post {
          if (artworkFor == url && instance === this@PlaybackService) {
            artwork = bitmap
            refresh()
          }
        }
      } catch (e: Exception) {}
    }.start()
  }

  private fun action(code: Int, icon: Int, label: String, name: String): Notification.Action {
    val pi = PendingIntent.getBroadcast(
      this, code,
      Intent(ACTION_BUTTON).setPackage(packageName).putExtra(EXTRA_ACTION, name),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    return Notification.Action.Builder(Icon.createWithResource(this, icon), label, pi).build()
  }

  private fun buildNotification(i: MediaInfo): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Background playback", NotificationManager.IMPORTANCE_LOW)
      )
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val tap = PendingIntent.getActivity(
      this, 0, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION") Notification.Builder(this)
    }

    var next = 0
    val compact = mutableListOf<Int>()
    if (i.hasPrev || i.seek) {
      builder.addAction(
        if (i.seek) action(1, android.R.drawable.ic_media_rew, "Back 10s", "previous")
        else action(1, android.R.drawable.ic_media_previous, "Previous", "previous")
      )
      compact.add(next++)
    }
    builder.addAction(
      if (i.playing) action(2, android.R.drawable.ic_media_pause, "Pause", "pause")
      else action(3, android.R.drawable.ic_media_play, "Play", "play")
    )
    compact.add(next++)
    if (i.hasNext || i.seek) {
      builder.addAction(
        if (i.seek) action(4, android.R.drawable.ic_media_ff, "Forward 10s", "next")
        else action(4, android.R.drawable.ic_media_next, "Next", "next")
      )
      compact.add(next++)
    }

    builder
      .setContentTitle(i.title.ifEmpty { "SquareBrowser" })
      .setContentText(i.artist.ifEmpty { if (i.playing) "Playing in the background" else "Paused" })
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentIntent(tap)
      .setOngoing(i.playing)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setStyle(
        Notification.MediaStyle()
          .setMediaSession(session?.sessionToken)
          .setShowActionsInCompactView(*compact.toIntArray())
      )
    artwork?.let { builder.setLargeIcon(it) }
    return builder.build()
  }

  companion object {
    const val ACTION_BUTTON = "expo.modules.squareplayback.BUTTON"
    const val EXTRA_ACTION = "action"
    private const val CHANNEL_ID = "square_playback"
    private const val NOTIFICATION_ID = 4711
    // Safety nets so a missed "stop" can never hold the CPU or notification forever.
    private const val MAX_WAKE_MS = 6L * 60 * 60 * 1000
    private const val IDLE_STOP_MS = 10L * 60 * 1000

    @Volatile var instance: PlaybackService? = null
    @Volatile var info: MediaInfo = MediaInfo()
  }
}
