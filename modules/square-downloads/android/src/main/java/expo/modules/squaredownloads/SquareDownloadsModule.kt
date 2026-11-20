// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squaredownloads

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * Saves files into the public Downloads folder. Used for downloads a page creates itself
 * (blob: and data: links, which DownloadManager cannot fetch) and for the app's own exports.
 * Android 10+ goes through MediaStore and needs no permission; Android 9 and older write the
 * file directly and need WRITE_EXTERNAL_STORAGE, which the JS side requests first.
 */
class SquareDownloadsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SquareDownloads")

    // Resolves to the file name actually used (the system may add " (1)" to avoid a clash).
    AsyncFunction("saveBase64") { fileName: String, mimeType: String, base64: String ->
      save(fileName, mimeType, Base64.decode(base64, Base64.DEFAULT))
    }

    AsyncFunction("saveText") { fileName: String, mimeType: String, text: String ->
      save(fileName, mimeType, text.toByteArray(Charsets.UTF_8))
    }
  }

  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw CodedException("No context")

  private fun save(rawName: String, mimeType: String, bytes: ByteArray): String {
    val name = sanitize(rawName)
    val mime = mimeType.ifBlank { "application/octet-stream" }
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) saveWithMediaStore(name, mime, bytes)
    else saveToFile(name, mime, bytes)
  }

  private fun saveWithMediaStore(name: String, mime: String, bytes: ByteArray): String {
    val resolver = context.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Downloads.DISPLAY_NAME, name)
      put(MediaStore.Downloads.MIME_TYPE, mime)
      put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
      put(MediaStore.Downloads.IS_PENDING, 1)
    }
    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
      ?: throw CodedException("Could not create the file")
    try {
      resolver.openOutputStream(uri)?.use { it.write(bytes) } ?: throw CodedException("Could not write the file")
      values.clear()
      values.put(MediaStore.Downloads.IS_PENDING, 0)
      resolver.update(uri, values, null, null)
    } catch (e: Exception) {
      resolver.delete(uri, null, null)
      throw e
    }
    resolver.query(uri, arrayOf(MediaStore.Downloads.DISPLAY_NAME), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) return cursor.getString(0)
    }
    return name
  }

  @Suppress("DEPRECATION")
  private fun saveToFile(name: String, mime: String, bytes: ByteArray): String {
    val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    if (!dir.exists()) dir.mkdirs()
    val file = uniqueFile(dir, name)
    file.writeBytes(bytes)
    MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mime), null)
    return file.name
  }

  private fun uniqueFile(dir: File, name: String): File {
    var file = File(dir, name)
    if (!file.exists()) return file
    val dot = name.lastIndexOf('.')
    val base = if (dot > 0) name.substring(0, dot) else name
    val ext = if (dot > 0) name.substring(dot) else ""
    var i = 1
    while (file.exists()) {
      file = File(dir, "$base ($i)$ext")
      i++
    }
    return file
  }

  private fun sanitize(name: String): String {
    val cleaned = name.replace(Regex("[\\\\/:*?\"<>|\\p{Cntrl}]"), "_").trim().trimStart('.')
    return cleaned.take(120).ifBlank { "download" }
  }
}
