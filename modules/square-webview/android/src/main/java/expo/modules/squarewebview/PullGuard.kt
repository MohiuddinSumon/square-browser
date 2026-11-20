// Copyright (c) 2025 SquareBrowser Contributors
package expo.modules.squarewebview

import android.webkit.JavascriptInterface

/**
 * Native pull to refresh (SwipeRefreshLayout) only knows whether the WebView itself is scrolled
 * to the top. This page script tells it, at each touch, whether the page lets a pull through:
 * like Chrome, not when an inner scroll box under the finger is scrolled, the page opts out with
 * `overscroll-behavior`, handles the gesture itself (maps: `touch-action`, preventDefault), the
 * page is zoomed in, or a video is fullscreen. SquareWebView resets the answer to "no" at every
 * finger-down, so a pull only starts once the page has said yes for this touch.
 */
class PullGuard {
  @Volatile var allowed = false

  /** Called by the page script (window.__sqPull.report). */
  @JavascriptInterface
  fun report(value: Boolean) {
    allowed = value
  }

  companion object {
    const val NAME = "__sqPull"

    val SCRIPT = """
(function() {
  if (window.__sqPullGuard) return;
  window.__sqPullGuard = true;
  function pullAllowed(target) {
    if ((window.scrollY || 0) > 0) return false;
    if (document.fullscreenElement || document.webkitFullscreenElement) return false;
    var vv = window.visualViewport;
    if (vv && vv.scale > 1.01) return false;
    for (var el = target; el && el.nodeType === 1; el = el.parentElement) {
      if (el.scrollTop > 0) return false;
      var cs = getComputedStyle(el);
      var ob = cs.overscrollBehaviorY;
      var root = el === document.documentElement || el === document.body;
      var scrollBox = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
      if ((root || scrollBox) && (ob === 'none' || ob === 'contain')) return false;
      var ta = cs.touchAction;
      if (ta && ta !== 'auto' && ta !== 'manipulation' && ta.indexOf('pan-y') < 0) return false;
    }
    return true;
  }
  function tell(value) { try { window.$NAME.report(value); } catch (e) {} }
  window.addEventListener('touchstart', function(e) {
    tell(e.touches.length === 1 && !e.defaultPrevented && pullAllowed(e.target));
  }, { passive: true });
  window.addEventListener('touchmove', function(e) {
    if (e.defaultPrevented || e.touches.length !== 1) tell(false);
  }, { passive: true });
})();
"""
  }
}
