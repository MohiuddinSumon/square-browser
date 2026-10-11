// Copyright (c) 2025 SquareBrowser Contributors

/**
 * Background playback support, injected into every page before its own scripts run.
 *
 *   1. Reports media state to the app ({type:'mediaState', state, title, artist,
 *      artwork, hasPrev, hasNext}) so it can run a foreground service and show a media
 *      notification. state is 'playing' | 'paused' | 'none'. Title/artwork come from the
 *      page's Media Session metadata when it sets one.
 *   2. Exposes window.__sqMediaControl(action) so notification buttons can drive the page:
 *      'play' | 'pause' | 'next' | 'previous'. It calls the page's own Media Session
 *      handlers when present (YouTube uses them for next/previous) and otherwise falls
 *      back to the <video>/<audio> element.
 *   3. On YouTube only: hides the "page went to background" signals. m.youtube.com pauses
 *      itself on visibilitychange/blur/freeze, which is what stops audio when you leave
 *      the app or turn the screen off.
 */
export const BACKGROUND_PLAY_SCRIPT = `
(function() {
  // Injected both before and after load (before-load injection can miss the new document).
  if (window.__sqBgPlay) return;
  window.__sqBgPlay = true;
  try {
    var handlers = {};
    var lastSent = '';
    var timer = null;

    function post(obj) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    function pickMedia() {
      var media = document.querySelectorAll('video, audio');
      var paused = null;
      for (var i = 0; i < media.length; i++) {
        var m = media[i];
        if (!m.paused && !m.ended && !m.muted && m.volume > 0 && m.readyState > 2) return { el: m, playing: true };
        if (!paused && m.paused && !m.ended && m.currentTime > 0 && m.duration > 0) paused = m;
      }
      return paused ? { el: paused, playing: false } : null;
    }

    function report(force) {
      var picked = pickMedia();
      var msg;
      if (!picked) {
        msg = { type: 'mediaState', state: 'none' };
      } else {
        var md = null;
        try { md = navigator.mediaSession && navigator.mediaSession.metadata; } catch (e) {}
        var art = '';
        try {
          if (md && md.artwork && md.artwork.length) art = md.artwork[md.artwork.length - 1].src || '';
        } catch (e) {}
        // This WebView has no Media Session API, so fall back to what the page itself exposes.
        var og = function(name) {
          var el = document.querySelector('meta[property="og:' + name + '"]');
          return el && el.content || '';
        };
        var isYT = /(^|\\.)youtube\\.com$/.test(location.hostname);
        if (!art && isYT) {
          var vid = new URLSearchParams(location.search).get('v');
          if (vid) art = 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg';
        }
        if (!art) art = og('image');
        var title = (md && md.title) || document.title || og('title') || '';
        if (isYT) {
          var h = document.querySelector('.slim-video-information-title, ytm-slim-video-metadata-section-renderer h2, h1.title');
          if (h && h.textContent) title = h.textContent.trim();
        }
        if (isYT) title = title.replace(/\\s*-\\s*YouTube$/, '');
        msg = {
          type: 'mediaState',
          state: picked.playing ? 'playing' : 'paused',
          title: title,
          artist: (md && (md.artist || md.album)) || og('site_name') || (isYT ? 'YouTube' : location.hostname),
          artwork: art,
          hasPrev: !!handlers.previoustrack,
          hasNext: !!handlers.nexttrack,
          seek: !handlers.previoustrack && !handlers.nexttrack
        };
      }
      var json = JSON.stringify(msg);
      if (json !== lastSent || force) { lastSent = json; post(msg); }
    }

    // Site-specific previous/next buttons (YouTube's mobile player has its own).
    function findSiteButton(key) {
      var labels = key === 'nexttrack' ? ['next video', 'next'] : ['previous video', 'previous'];
      var buttons = document.querySelectorAll('button[aria-label], .ytp-next-button, .ytp-prev-button');
      for (var i = 0; i < buttons.length; i++) {
        var l = (buttons[i].getAttribute('aria-label') || '').toLowerCase();
        for (var j = 0; j < labels.length; j++) { if (l === labels[j]) return buttons[i]; }
      }
      return null;
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(report, 300); }

    ['playing', 'play', 'pause', 'ended', 'emptied', 'volumechange', 'loadedmetadata', 'abort'].forEach(function(ev) {
      document.addEventListener(ev, schedule, true);
    });
    try {
      var titleEl = document.querySelector('title');
      var startObservers = function() {
        var t = document.querySelector('title');
        if (t) new MutationObserver(schedule).observe(t, { childList: true });
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObservers);
      else startObservers();
      ['pushState', 'replaceState'].forEach(function(fn) {
        var orig = history[fn];
        history[fn] = function() { var r = orig.apply(this, arguments); schedule(); return r; };
      });
    } catch (e) {}
    setInterval(function() { if (pickMedia()) report(); }, 3000);
    window.addEventListener('pagehide', function() {
      lastSent = '';
      post({ type: 'mediaState', state: 'none' });
    });

    // Track the page's own Media Session so notification buttons reuse its logic.
    try {
      var MS = window.MediaSession && window.MediaSession.prototype;
      if (MS) {
        var origSet = MS.setActionHandler;
        MS.setActionHandler = function(action, fn) {
          if (fn) handlers[action] = fn; else delete handlers[action];
          schedule();
          return origSet.apply(this, arguments);
        };
        var mdDesc = Object.getOwnPropertyDescriptor(MS, 'metadata');
        if (mdDesc && mdDesc.set) {
          Object.defineProperty(MS, 'metadata', {
            get: mdDesc.get,
            set: function(v) { mdDesc.set.call(this, v); schedule(); },
            configurable: true
          });
        }
      }
    } catch (e) {}

    window.__sqMediaControl = function(action) {
      var key = action === 'next' ? 'nexttrack' : action === 'previous' ? 'previoustrack' : action;
      var picked = pickMedia();
      var el = picked && picked.el;
      if (key === 'nexttrack' || key === 'previoustrack') {
        var btn = findSiteButton(key);
        if (handlers[key]) {
          try { handlers[key]({ action: key }); } catch (e) {}
        } else if (btn) {
          btn.click();
        } else if (el) {
          // No track controls on this page: skip forward / back 10 seconds instead.
          try { el.currentTime = Math.max(0, el.currentTime + (key === 'nexttrack' ? 10 : -10)); } catch (e) {}
        }
      } else if (key === 'play') {
        if (el) { var pr = el.play(); if (pr && pr.catch) pr.catch(function() {}); }
        else if (handlers.play) handlers.play({ action: 'play' });
      } else if (key === 'pause') {
        if (el) el.pause(); else if (handlers.pause) handlers.pause({ action: 'pause' });
      }
      schedule();
    };

    // YouTube pauses itself on the "page went to background" signals; hide them.
    if (/(^|\\.)(youtube|youtube-nocookie)\\.com$/.test(location.hostname)) {
      var def = function(name, value) {
        try { Object.defineProperty(document, name, { get: function() { return value; }, configurable: true }); }
        catch (e) {}
      };
      def('hidden', false);
      def('webkitHidden', false);
      def('visibilityState', 'visible');
      def('webkitVisibilityState', 'visible');
      document.hasFocus = function() { return true; };
      var swallow = function(e) { e.stopImmediatePropagation(); };
      ['visibilitychange', 'webkitvisibilitychange', 'freeze', 'resume'].forEach(function(ev) {
        document.addEventListener(ev, swallow, true);
        window.addEventListener(ev, swallow, true);
      });
      window.addEventListener('blur', swallow, true);
    }
  } catch (e) {}
})();
true;
`;
