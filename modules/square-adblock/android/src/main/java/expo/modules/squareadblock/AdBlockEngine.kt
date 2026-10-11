// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squareadblock

import android.content.Context
import java.util.Locale
import java.util.concurrent.atomic.AtomicInteger

/**
 * Holds the blocked-domain sets and decides whether a sub-resource request is blocked.
 * [shouldBlock] runs on WebView's IO threads, so each set is replaced atomically and
 * never mutated after publication.
 *
 * Two sources are combined:
 *  - the bundled list (assets/adlist.txt, built by scripts/build-adlist.js), loaded once in
 *    the background at startup;
 *  - domains pushed from JavaScript with [setDomains] (a small, hand-maintained core list).
 */
object AdBlockEngine {
  @Volatile private var domains: Set<String> = emptySet()
  @Volatile private var bundled: Set<String> = emptySet()
  @Volatile var enabled: Boolean = true
  private val blocked = AtomicInteger(0)
  @Volatile private var loading = false

  fun setDomains(list: Collection<String>) {
    domains = toSet(list)
  }

  /** Loads the bundled list off the main thread. Safe to call more than once. */
  fun loadBundled(context: Context) {
    if (loading || bundled.isNotEmpty()) return
    loading = true
    Thread {
      try {
        val set = HashSet<String>(100_000)
        context.applicationContext.assets.open(BUNDLED_ASSET).bufferedReader().useLines { lines ->
          for (line in lines) {
            val d = line.trim().lowercase(Locale.ROOT)
            if (d.isNotEmpty() && !d.startsWith("#")) set.add(d)
          }
        }
        bundled = set
      } catch (e: Exception) {
        // No bundled list: the JS-provided domains still apply.
      } finally {
        loading = false
      }
    }.start()
  }

  /** True when [host] or any parent domain is in either set (ads.example.com matches example.com). */
  fun shouldBlock(host: String?): Boolean {
    if (!enabled || host.isNullOrEmpty()) return false
    val js = domains
    val list = bundled
    if (js.isEmpty() && list.isEmpty()) return false
    var h = host.lowercase(Locale.ROOT)
    while (true) {
      if (js.contains(h) || list.contains(h)) {
        blocked.incrementAndGet()
        return true
      }
      val dot = h.indexOf('.')
      if (dot < 0) return false
      h = h.substring(dot + 1)
    }
  }

  fun bundledCount(): Int = bundled.size

  fun blockedCount(): Int = blocked.get()

  fun resetBlockedCount() = blocked.set(0)

  private fun toSet(list: Collection<String>): Set<String> {
    val next = HashSet<String>(list.size * 2)
    for (raw in list) {
      val d = raw.trim().lowercase(Locale.ROOT)
      if (d.isNotEmpty()) next.add(d)
    }
    return next
  }

  private const val BUNDLED_ASSET = "adlist.txt"
}
