// Copyright (c) 2025 SquareBrowser Contributors

/**
 * Downloads that a page builds itself, injected into every page (Android only).
 *
 * Normal http(s) downloads already reach Android's DownloadManager through
 * react-native-webview. Links to blob: and data: URLs do not: DownloadManager cannot fetch
 * them and the WebView has no viewer for them, so tapping "Download" (generated PDFs,
 * tickets, statements, exported images) did nothing. This script catches those links,
 * reads the file and posts it to the app ({type:'download', name, mime, data} with base64
 * data, or {type:'download', error:'tooLarge'|'failed', name}); the app saves it to Downloads.
 *
 * Pages often revoke the blob: URL right after clicking the link, so blobs are remembered
 * when the URL is created and kept for a minute after it is revoked.
 */
export const DOWNLOAD_SCRIPT = `
(function() {
  // Injected both before and after load (before-load injection can miss the new document).
  if (window.__sqDownloads) return;
  window.__sqDownloads = true;
  try {
    // The file travels to the app as base64 in one message, so keep it to what a low-end phone can handle.
    var MAX_BYTES = 20 * 1024 * 1024;
    var blobs = {};

    var _create = URL.createObjectURL;
    var _revoke = URL.revokeObjectURL;
    URL.createObjectURL = function(obj) {
      var url = _create.apply(URL, arguments);
      if (obj instanceof Blob) blobs[url] = obj;
      return url;
    };
    URL.revokeObjectURL = function(url) {
      setTimeout(function() { delete blobs[url]; }, 60000);
      return _revoke.apply(URL, arguments);
    };

    function post(obj) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    function isFileLink(a) {
      return !!a && /^(blob|data):/i.test(a.href || '');
    }

    function save(a) {
      var href = a.href;
      var name = a.getAttribute('download') || '';
      var get = blobs[href]
        ? Promise.resolve(blobs[href])
        : fetch(href).then(function(r) { return r.blob(); });
      get.then(function(blob) {
        if (blob.size > MAX_BYTES) { post({ type: 'download', error: 'tooLarge', name: name }); return; }
        var reader = new FileReader();
        reader.onload = function() {
          var result = String(reader.result);
          post({ type: 'download', name: name, mime: blob.type || '', data: result.slice(result.indexOf(',') + 1) });
        };
        reader.onerror = function() { post({ type: 'download', error: 'failed', name: name }); };
        reader.readAsDataURL(blob);
      }).catch(function() { post({ type: 'download', error: 'failed', name: name }); });
    }

    // Links on the page (capture phase, before the page's and the ad blocker's handlers)
    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!isFileLink(a)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      save(a);
    }, true);

    // Links that are never added to the page: a.click() / a.dispatchEvent(click), as used by
    // FileSaver.js and most "export" buttons. Connected links reach the listener above.
    var _click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
      if (isFileLink(this) && !this.isConnected) { save(this); return; }
      return _click.apply(this, arguments);
    };
    var _dispatch = HTMLAnchorElement.prototype.dispatchEvent;
    HTMLAnchorElement.prototype.dispatchEvent = function(event) {
      if (event && event.type === 'click' && isFileLink(this) && !this.isConnected) { save(this); return false; }
      return _dispatch.apply(this, arguments);
    };
  } catch (e) {}
})();
true;
`;
