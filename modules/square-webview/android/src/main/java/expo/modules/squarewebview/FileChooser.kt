// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.webkit.ValueCallback
import android.webkit.WebChromeClient

/**
 * <input type="file">: opens Android's file picker and hands the chosen files back to the page.
 * One picker at a time; the result arrives through SquareWebViewModule's OnActivityResult.
 * No camera capture (SquareBrowser has no camera permission), but the picker can pick photos.
 */
object FileChooser {
  const val REQUEST_CODE = 0x5B01

  private var pending: ValueCallback<Array<Uri>>? = null

  fun open(activity: Activity?, callback: ValueCallback<Array<Uri>>, params: WebChromeClient.FileChooserParams?): Boolean {
    if (activity == null) {
      callback.onReceiveValue(null)
      return true
    }
    pending?.onReceiveValue(null) // a page may not leave the previous request hanging
    pending = callback
    val intent = try { params?.createIntent() } catch (e: Exception) { null }
      ?: Intent(Intent.ACTION_GET_CONTENT).setType("*/*")
    intent.addCategory(Intent.CATEGORY_OPENABLE)
    if (params?.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
      intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
    }
    try {
      activity.startActivityForResult(Intent.createChooser(intent, params?.title), REQUEST_CODE)
    } catch (e: ActivityNotFoundException) {
      pending = null
      callback.onReceiveValue(null)
    }
    return true
  }

  fun onResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) return
    val callback = pending ?: return
    pending = null
    if (resultCode != Activity.RESULT_OK || data == null) {
      callback.onReceiveValue(null)
      return
    }
    val uris = mutableListOf<Uri>()
    data.clipData?.let { clip -> for (i in 0 until clip.itemCount) uris += clip.getItemAt(i).uri }
    if (uris.isEmpty()) data.data?.let { uris += it }
    callback.onReceiveValue(if (uris.isEmpty()) null else uris.toTypedArray())
  }
}
