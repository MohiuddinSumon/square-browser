// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.URLUtil

/**
 * Files a page downloads go to Android's DownloadManager (system notification, Downloads app).
 * Android 10+: the public Downloads folder, no permission needed. Older: the app's own Downloads
 * folder, since SquareBrowser doesn't ask for storage permission.
 */
object Downloads {
  /** Starts the download and returns the file name, or null if it can't be downloaded. */
  fun start(
    context: Context,
    url: String,
    userAgent: String?,
    contentDisposition: String?,
    mimeType: String?,
    referer: String?,
  ): String? {
    val uri = Uri.parse(url)
    // DownloadManager only fetches http(s); blob: and data: downloads live inside the page.
    if (uri.scheme != "http" && uri.scheme != "https") return null
    return try {
      val name = URLUtil.guessFileName(url, contentDisposition, mimeType)
      val request = DownloadManager.Request(uri).apply {
        if (!mimeType.isNullOrEmpty()) setMimeType(mimeType)
        if (!userAgent.isNullOrEmpty()) addRequestHeader("User-Agent", userAgent)
        CookieManager.getInstance().getCookie(url)?.let { addRequestHeader("Cookie", it) }
        if (!referer.isNullOrEmpty()) addRequestHeader("Referer", referer)
        setTitle(name)
        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
        } else {
          setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, name)
        }
      }
      (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
      name
    } catch (e: Exception) {
      null
    }
  }
}
