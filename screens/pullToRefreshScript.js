/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * Pull-to-refresh for Android. react-native-webview only supports `pullToRefreshEnabled`
 * on iOS, so on Android this script watches for a downward drag that starts while the page
 * is scrolled to the very top and reports it to React Native, which draws the spinner and
 * reloads the tab.
 *
 * Messages: { type: 'pull', distance } while dragging (throttled to one per frame) and
 * { type: 'pullEnd', refresh } when the finger lifts.
 *
 * Like Chrome, it stays out of the way when:
 *  - the page (or an inner scroll box under the finger) isn't scrolled to the top,
 *  - the page sets `overscroll-behavior-y: none|contain` on html/body (maps, editors),
 *  - the page handles the touch itself (preventDefault on touchstart/touchmove),
 *  - the drag is mostly sideways (carousels), uses two fingers (pinch), or is zoomed in,
 *  - a video is fullscreen.
 */

export const PULL_THRESHOLD = 80; // px of (dampened) pull needed to refresh
export const PULL_MAX = 130;

export const PULL_TO_REFRESH_SCRIPT = `
(function() {
  if (window.__sqPullToRefresh) return;
  window.__sqPullToRefresh = true;

  var THRESHOLD = ${PULL_THRESHOLD}, MAX = ${PULL_MAX}, RESIST = 0.5;
  var startX = 0, startY = 0, state = 0; /* 0 idle, 1 maybe, 2 pulling */
  var distance = 0, frame = 0;

  function post(msg) {
    try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  }

  function pageTop() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (window.visualViewport) y += window.visualViewport.offsetTop || 0;
    return y <= 0;
  }

  function overscrollDisabled() {
    try {
      var els = [document.documentElement, document.body];
      for (var i = 0; i < els.length; i++) {
        if (!els[i]) continue;
        var v = getComputedStyle(els[i]).overscrollBehaviorY;
        if (v === 'none' || v === 'contain') return true;
      }
    } catch (e) {}
    return false;
  }

  /* An inner scroll box under the finger that is scrolled down, or that wants its own
     overscroll, gets the gesture instead of us. */
  function innerScrollBlocks(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      try {
        if (el.scrollTop > 0) return true;
        var cs = getComputedStyle(el);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
          if (cs.overscrollBehaviorY === 'none' || cs.overscrollBehaviorY === 'contain') return true;
        }
      } catch (e) {}
      el = el.parentElement;
    }
    return false;
  }

  function zoomedIn() {
    return window.visualViewport && window.visualViewport.scale > 1.01;
  }

  function reset() {
    if (state === 2) post({ type: 'pullEnd', refresh: false });
    state = 0; distance = 0;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }

  function sendPull() {
    frame = 0;
    if (state === 2) post({ type: 'pull', distance: distance });
  }

  window.addEventListener('touchstart', function(e) {
    if (state === 2) reset();
    state = 0;
    if (e.defaultPrevented || e.touches.length !== 1) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    if (!pageTop() || zoomedIn() || overscrollDisabled() || innerScrollBlocks(e.target)) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    state = 1;
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (state === 0) return;
    if (e.defaultPrevented || e.touches.length !== 1 || !pageTop()) { reset(); return; }
    var dx = e.touches[0].clientX - startX;
    var dy = e.touches[0].clientY - startY;
    if (state === 1) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      /* Must start as a downward, mostly vertical drag. */
      if (dy <= 0 || Math.abs(dx) > dy) { state = 0; return; }
      state = 2;
      startY = e.touches[0].clientY; /* begin counting from here so it doesn't jump */
      dy = 0;
    }
    distance = Math.max(0, Math.min(MAX, dy * RESIST));
    if (!frame) frame = requestAnimationFrame(sendPull);
  }, { passive: true });

  function end() {
    if (state !== 2) { state = 0; return; }
    var refresh = distance >= THRESHOLD;
    state = 0; distance = 0;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    post({ type: 'pullEnd', refresh: refresh });
  }
  window.addEventListener('touchend', end, { passive: true });
  window.addEventListener('touchcancel', reset, { passive: true });
})();
true;
`;
