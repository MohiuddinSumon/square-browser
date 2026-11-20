// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LinkRulesTest {
  private val blocked = setOf("doubleclick.net", "popads.net")

  @Test fun blocksListedHostsAndSubdomains() {
    assertTrue(LinkRules.isBlockedHost("doubleclick.net", blocked))
    assertTrue(LinkRules.isBlockedHost("ad.g.DoubleClick.net", blocked))
    assertTrue(LinkRules.isBlockedHost("popads.net.", blocked))
  }

  @Test fun doesNotBlockLookalikesOrOthers() {
    assertFalse(LinkRules.isBlockedHost("notdoubleclick.net", blocked))
    assertFalse(LinkRules.isBlockedHost("doubleclick.net.example.com", blocked))
    assertFalse(LinkRules.isBlockedHost("example.com", blocked))
    assertFalse(LinkRules.isBlockedHost(null, blocked))
    assertFalse(LinkRules.isBlockedHost("doubleclick.net", emptySet()))
  }

  @Test fun recognisesAppWebLinks() {
    assertTrue(LinkRules.isAppWebLink("play.google.com", "/store/apps/details", true))
    assertTrue(LinkRules.isAppWebLink("market.android.com", "/details", true))
    assertTrue(LinkRules.isAppWebLink("wa.me", "/8801712345678", false))
    assertTrue(LinkRules.isAppWebLink("api.whatsapp.com", "/send/", false))
    assertTrue(LinkRules.isAppWebLink("chat.whatsapp.com", "/AbCd123", false))
    assertTrue(LinkRules.isAppWebLink("www.wa.me", "/123", false))
  }

  @Test fun leavesOtherWebLinksAlone() {
    assertFalse(LinkRules.isAppWebLink("play.google.com", "/store/apps/details", false))
    assertFalse(LinkRules.isAppWebLink("play.google.com", "/store/movies", true))
    assertFalse(LinkRules.isAppWebLink("wa.me", "/", false))
    assertFalse(LinkRules.isAppWebLink("wa.me", "/message/XYZ", false))
    assertFalse(LinkRules.isAppWebLink("chat.whatsapp.com", "/", false))
    assertFalse(LinkRules.isAppWebLink("www.whatsapp.com", "/download", false))
    assertFalse(LinkRules.isAppWebLink("example.com", "/", true))
    assertFalse(LinkRules.isAppWebLink(null, null, false))
  }
}
