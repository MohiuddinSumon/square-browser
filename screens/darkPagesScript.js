// Copyright (c) 2025 SquareBrowser Contributors

/**
 * "Dark web pages": shows light pages in dark colors, injected into every page.
 *
 * The WebView's own force-dark switch does nothing on Android 13+ (it was replaced by
 * "algorithmic darkening", which only runs when the app theme is dark), so this inverts
 * the page with a CSS filter instead and inverts images and video back so they look
 * normal. Pages that are already dark are left alone: once the page has loaded, its
 * background is measured with the filter off.
 *
 * window.__sqSetDark(on) turns it on or off without a reload (used when the setting is
 * flipped). Injected before and after load, like the other scripts, so it is idempotent.
 */
export const darkPagesScript = (enabled) => `
(function() {
  try {
    if (window.__sqSetDark) { window.__sqSetDark(${enabled ? 'true' : 'false'}); return; }
    var STYLE_ID = '__sq_dark_pages';
    var CSS =
      'html{filter:invert(1) hue-rotate(180deg)!important;background:#fff!important}' +
      'img,video,canvas,iframe,embed,object,picture,[style*="background-image"]' +
      '{filter:invert(1) hue-rotate(180deg)!important}' +
      'picture img{filter:none!important}';
    var wanted = ${enabled ? 'true' : 'false'};
    var pageIsDark = false;

    function addStyle() {
      var root = document.head || document.documentElement;
      // Before-load injection can run before <html> exists; DOMContentLoaded applies it then.
      if (!root || document.getElementById(STYLE_ID)) return;
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      root.appendChild(style);
    }
    function removeStyle() {
      var style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    }
    function apply() {
      if (wanted && !pageIsDark) addStyle(); else removeStyle();
    }

    // Relative luminance of a CSS color, or -1 when it is transparent.
    function luminance(color) {
      var m = (color || '').match(/rgba?\\(([^)]+)\\)/);
      if (!m) return -1;
      var p = m[1].split(',').map(function(v) { return parseFloat(v); });
      if (p.length > 3 && p[3] < 0.1) return -1;
      return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
    }

    var measured = false;
    function measure() {
      if (!document.body) return;
      measured = true;
      var had = !!document.getElementById(STYLE_ID);
      removeStyle();
      var lum = -1;
      [document.body, document.documentElement].forEach(function(el) {
        if (lum < 0 && el) lum = luminance(getComputedStyle(el).backgroundColor);
      });
      // A transparent page shows the WebView's white background.
      pageIsDark = lum >= 0 && lum < 0.4;
      if (had || wanted) apply();
    }

    window.__sqSetDark = function(on) {
      wanted = !!on;
      if (!measured) measure();
      apply();
    };

    document.addEventListener('DOMContentLoaded', measure);
    window.addEventListener('load', measure);
    if (document.readyState === 'loading') apply(); else measure();
  } catch (e) {}
})();
true;
`;
