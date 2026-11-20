// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

/**
 * Navigation rules decided natively, the moment the WebView asks, so a busy JS thread can never
 * let a navigation through by default. Pure functions: unit-tested in LinkRulesTest.
 *
 * Keep [isAppWebLink] in step with getAppForWebLink() in screens/BrowserScreen.js, which turns
 * the same links into the app URL for the "Open in app?" prompt.
 */
object LinkRules {
  /** True when [host] is one of [blocked] or a subdomain of one (suffix match, like the JS list). */
  fun isBlockedHost(host: String?, blocked: Set<String>): Boolean {
    if (host.isNullOrEmpty() || blocked.isEmpty()) return false
    var h = host.lowercase().trimEnd('.')
    while (true) {
      if (h in blocked) return true
      val dot = h.indexOf('.')
      if (dot < 0) return false
      h = h.substring(dot + 1)
    }
  }

  /**
   * Web links that other browsers hand to an installed app (Android App Links):
   * Play Store app pages, WhatsApp click-to-chat and group invites.
   * [hasIdParam] is whether the URL has an `id` query parameter (Play Store).
   */
  fun isAppWebLink(host: String?, path: String?, hasIdParam: Boolean): Boolean {
    val h = host?.lowercase()?.removePrefix("www.") ?: return false
    val p = path ?: ""
    return when (h) {
      "play.google.com" -> p.startsWith("/store/apps") && hasIdParam
      "market.android.com" -> hasIdParam
      "wa.me" -> p.trim('/').split('/').first().let { it.isNotEmpty() && it.all(Char::isDigit) }
      "api.whatsapp.com" -> p.startsWith("/send")
      "chat.whatsapp.com" -> p.trim('/').isNotEmpty()
      else -> false
    }
  }
}
