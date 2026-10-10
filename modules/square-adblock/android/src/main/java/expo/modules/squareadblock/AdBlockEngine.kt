// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squareadblock

import java.util.Locale
import java.util.concurrent.atomic.AtomicInteger

/**
 * Holds the blocked-domain set and decides whether a sub-resource request is blocked.
 * [shouldBlock] runs on WebView's IO threads, so the set is replaced atomically and
 * never mutated after publication.
 */
object AdBlockEngine {
  @Volatile private var domains: Set<String> = emptySet()
  @Volatile var enabled: Boolean = true
  private val blocked = AtomicInteger(0)

  fun setDomains(list: Collection<String>) {
    val next = HashSet<String>(list.size * 2)
    for (raw in list) {
      val d = raw.trim().lowercase(Locale.ROOT)
      if (d.isNotEmpty()) next.add(d)
    }
    domains = next
  }

  /** True when [host] or any parent domain is in the set (ads.example.com matches example.com). */
  fun shouldBlock(host: String?): Boolean {
    if (!enabled || host.isNullOrEmpty()) return false
    val set = domains
    if (set.isEmpty()) return false
    var h = host.lowercase(Locale.ROOT)
    while (true) {
      if (set.contains(h)) {
        blocked.incrementAndGet()
        return true
      }
      val dot = h.indexOf('.')
      if (dot < 0) return false
      h = h.substring(dot + 1)
    }
  }

  fun blockedCount(): Int = blocked.get()

  fun resetBlockedCount() = blocked.set(0)
}
