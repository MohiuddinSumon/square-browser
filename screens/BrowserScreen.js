/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * BrowserScreen - Main browser interface component
 * Handles tab management, WebView rendering, and navigation
 */
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, Platform, ToastAndroid, KeyboardAvoidingView, SafeAreaView, StatusBar, RefreshControl, ScrollView, Modal, Text, TouchableOpacity, FlatList, BackHandler, Alert, Animated, Keyboard, Share, Linking, PermissionsAndroid, Dimensions, PanResponder, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import AddressBar from '../components/AddressBar';
import HomeScreen from '../components/HomeScreen';
import {
  attachToWebView,
  setBlockedDomains,
  setNativeAdBlockEnabled,
} from '../modules/square-adblock';
import { updatePlayback, stopPlaybackService, addMediaActionListener, evaluateInWebView } from '../modules/square-playback';
import { BACKGROUND_PLAY_SCRIPT } from './backgroundPlayScript';
import { darkPagesScript } from './darkPagesScript';
import { DOWNLOAD_SCRIPT } from './downloadScript';
import { saveBase64ToDownloads, fileNameFor } from '../modules/square-downloads';
import { getTheme } from '../theme.js';

/**
 * Bot-detection bypass script injected BEFORE page content loads.
 *
 * Cloudflare and similar services check for these signals during early JS execution.
 * Using injectedJavaScriptBeforeContentLoaded ensures we override them before the
 * page's own scripts run — injectedJavaScript (after DOMContentLoaded) is too late.
 *
 * Overrides:
 *   - navigator.webdriver → false  (explicit bot flag set by WebView runtimes)
 *   - window.chrome          → realistic Chrome object with runtime, loadTimes, csi, app
 *   - navigator.plugins      → 5 standard plugin entries present in real Chrome
 *   - navigator.mimeTypes    → matching MIME types for the above plugins
 *
 * NOTE: iOS — injectedJavaScriptBeforeContentLoaded only reaches the main frame, not
 * iframes. Cloudflare Turnstile runs in an iframe, so this fix is partial on iOS.
 * Android gets the full fix because the WebView injects into all frames.
 */
const BOT_BYPASS_SCRIPT = `
(function() {
  try {
    // 1. Clear the webdriver flag
    if (!/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)) Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: false,
    });

    // 2. Inject a realistic window.chrome object
    if (!/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) && (!window.chrome || !window.chrome.runtime)) {
      const chrome = {
        app: {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
          getDetails: function() {},
          getIsInstalled: function() {},
          installState: function() {},
          runningState: function() {},
        },
        runtime: {
          OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
          OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
          PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
          RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
          id: undefined,
        },
        loadTimes: function() {
          return {
            commitLoadTime: Date.now() / 1000,
            connectionInfo: 'h2',
            finishDocumentLoadTime: 0,
            finishLoadTime: 0,
            firstPaintAfterLoadTime: 0,
            firstPaintTime: 0,
            navigationType: 'Other',
            npnNegotiatedProtocol: 'h2',
            requestTime: Date.now() / 1000 - 0.1,
            startLoadTime: Date.now() / 1000 - 0.05,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true,
          };
        },
        csi: function() {
          return { onloadT: Date.now(), pageT: Date.now() - performance.timing.navigationStart, startE: performance.timing.navigationStart, tran: 15 };
        },
      };
      try { Object.defineProperty(window, 'chrome', { value: chrome, writable: false, enumerable: true, configurable: false }); }
      catch(e) { window.chrome = chrome; }
    }

    // 3. Spoof navigator.plugins with realistic Chrome entries.
    // Desktop only: real mobile Chrome has no plugins, so faking PDF viewers behind a
    // mobile user agent is itself a bot signal (OLX's firewall rejected logins over it).
    if (/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)) { return; }
    const pluginData = [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf' }, { type: 'text/pdf', suffixes: 'pdf' }] },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '', mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf' }, { type: 'text/pdf', suffixes: 'pdf' }] },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '', mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf' }, { type: 'text/pdf', suffixes: 'pdf' }] },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: '', mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf' }, { type: 'text/pdf', suffixes: 'pdf' }] },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: '', mimeTypes: [{ type: 'application/pdf', suffixes: 'pdf' }, { type: 'text/pdf', suffixes: 'pdf' }] },
    ];

    function makeMimeType(type, suffixes, plugin) {
      return { type, suffixes, description: '', enabledPlugin: plugin };
    }

    function makePlugin(data) {
      const plugin = { name: data.name, filename: data.filename, description: data.description, length: data.mimeTypes.length };
      data.mimeTypes.forEach((mt, i) => { plugin[i] = makeMimeType(mt.type, mt.suffixes, plugin); });
      plugin.item = (i) => plugin[i];
      plugin.namedItem = (name) => Object.values(plugin).find(v => v && v.type === name) || null;
      plugin[Symbol.iterator] = function*() { for (let i = 0; i < this.length; i++) yield this[i]; };
      return plugin;
    }

    const plugins = pluginData.map(makePlugin);
    plugins.item = (i) => plugins[i] || null;
    plugins.namedItem = (name) => plugins.find(p => p.name === name) || null;
    plugins.refresh = () => {};
    plugins[Symbol.iterator] = function*() { for (let i = 0; i < this.length; i++) yield this[i]; };

    try { Object.defineProperty(navigator, 'plugins', { get: () => plugins, configurable: false }); } catch(e) {}

    // 4. Spoof mimeTypes to match plugins
    const allMime = plugins.flatMap((p, pi) => pluginData[pi].mimeTypes.map(mt => makeMimeType(mt.type, mt.suffixes, p)));
    const mimeTypes = {};
    allMime.forEach((mt, i) => { mimeTypes[i] = mt; mimeTypes[mt.type] = mt; });
    mimeTypes.length = allMime.length;
    mimeTypes.item = (i) => mimeTypes[i] || null;
    mimeTypes.namedItem = (name) => mimeTypes[name] || null;
    mimeTypes[Symbol.iterator] = function*() { for (let i = 0; i < this.length; i++) yield this[i]; };

    try { Object.defineProperty(navigator, 'mimeTypes', { get: () => mimeTypes, configurable: false }); } catch(e) {}

  } catch(err) {
    // Never surface errors to the page
  }
})();
true;
`;

/**
 * Ad-block domain list — used both in injected JS (network interception) and in
 * onShouldStartLoadWithRequest (native navigation guard).
 * Covers the most impactful ad-serving networks while avoiding false positives on
 * legitimate content domains.
 */
const AD_DOMAINS = [
  // Google ad infrastructure
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'googletagservices.com', 'pagead2.googlesyndication.com',
  // Programmatic / DSP / SSP
  'adnxs.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net',
  'casalemedia.com', 'adsrvr.org', 'criteo.com', 'criteo.net',
  'sharethrough.com', 'triplelift.com', 'smartadserver.com',
  'adform.net', 'advertising.com', 'moatads.com', 'yieldmanager.com',
  '2mdn.net', 'aolcloud.net', 'adtech.de', 'media.net',
  // Native / content ads
  'outbrain.com', 'taboola.com',
  // Mobile ad networks
  'adcolony.com', 'applovin.com', 'mopub.com', 'chartboost.com',
  'vungle.com', 'ironsrc.com', 'admob.com',
  // Pop-under / click-hijack / native-ad networks common on streaming, forum and adult sites
  'popads.net', 'popcash.net', 'propellerads.com', 'adsterra.com',
  'exoclick.com', 'juicyads.com', 'hilltopads.net', 'onclickads.net',
  'adcash.com', 'clickadu.com',
  // ExoClick family (ad servers, native widgets, pop-under loaders, creative CDNs)
  'exosrv.com', 'exdynsrv.com', 'realsrv.com', 'magsrv.com', 'pemsrv.com',
  'bkcdn.net', 'bxcdn.net',
  // Other pop-under / push / native networks
  'juicyads.net', 'jads.co', 'trafficjunky.net', 'trafficjunky.com',
  'trafficstars.com', 'tsyndicate.com', 'trafficfactory.biz', 'traffichaus.com',
  'plugrush.com', 'adxpansion.com', 'clickaine.com', 'hilltopads.com',
  'highperformancegate.com', 'effectivegatecpm.com', 'profitablecpmrate.com',
  'propellerclick.com', 'onclkds.com', 'ad-maven.com', 'admaven.com', 'a-ads.com',
  'monetag.com', 'clickadilla.com', 'zeropark.com', 'evadav.com',
  'adspyglass.com', 'ero-advertising.com', 'tubecorporate.com', 'trafficforce.com',
  'adtng.com', 'smartyads.com', 'bidvertiser.com', 'revcontent.com',
  'mgid.com', 'adskeeper.com', 'richpush.co', 'popmyads.com',
  // Seen on movie-streaming sites: pop-under redirect targets, ad-exchange and tracker hosts
  'zeloru.com', 'acscdn.com', 'adexchangerapid.com', 'usrpubtrk.com',
  // Tracking / measurement (pure trackers, not login providers)
  'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
  'adsymptotic.com', 'amazon-adsystem.com',
];

// Share the domain list with the native request filter (no-op where unavailable).
setBlockedDomains(AD_DOMAINS);

// Schemes the WebView handles itself; everything else is an "open in app" link.
const INTERNAL_SCHEMES = ['http', 'https', 'about', 'data', 'blob', 'javascript', 'file', 'content', 'ws', 'wss'];

/**
 * Classifies a URL the WebView is about to load. Returns null for normal pages, or
 * { label, openUrl, packageName, stayUrl } for links that should open another app:
 *   - custom schemes (whatsapp:, tg:, upi:, mailto:, tel:, market:, ...)
 *   - Android intent:// links (converted to their real scheme)
 *   - Play Store web links (converted to market://)
 * `stayUrl` is set when the page can also be loaded in the browser.
 */
const getExternalAppLink = (url = '') => {
  if (Platform.OS !== 'android') return null;
  const scheme = (url.match(/^([a-z][a-z0-9+.-]*):/i) || [])[1]?.toLowerCase();
  if (!scheme) return null;

  if (scheme === 'http' || scheme === 'https') {
    try {
      const u = new URL(url);
      if (u.hostname === 'play.google.com' && u.pathname.startsWith('/store/apps')) {
        const id = u.searchParams.get('id');
        if (id) return { label: 'Play Store', openUrl: `market://details?id=${encodeURIComponent(id)}`, stayUrl: url };
      }
    } catch (e) {}
    return null;
  }
  if (INTERNAL_SCHEMES.includes(scheme)) return null;

  if (scheme === 'intent') {
    // intent://host/path#Intent;scheme=xyz;package=com.app;S.browser_fallback_url=...;end
    const [base, extras = ''] = url.split('#Intent;');
    const get = (key) => (extras.match(new RegExp('(?:^|;)' + key + '=([^;]*)')) || [])[1];
    const realScheme = get('scheme');
    const packageName = get('package');
    if (!realScheme) return packageName
      ? { label: packageName, openUrl: `market://details?id=${packageName}`, packageName }
      : null;
    return {
      label: packageName || realScheme,
      openUrl: realScheme + ':' + base.slice('intent:'.length),
      packageName,
    };
  }
  return { label: scheme === 'market' ? 'Play Store' : scheme, openUrl: url };
};

let externalPromptVisible = false;

/** Asks the user whether to open a link in another app (one prompt at a time) */
const promptOpenInApp = (t, { label, openUrl, packageName }, onStayInBrowser) => {
  if (externalPromptVisible) return;
  externalPromptVisible = true;
  const done = () => { externalPromptVisible = false; };
  const open = () => {
    Linking.openURL(openUrl).catch(() => {
      if (packageName) {
        Linking.openURL(`market://details?id=${packageName}`).catch(() => {});
      } else {
        Alert.alert(t('browser.externalNoAppTitle'), t('browser.externalNoAppMessage'));
      }
    });
  };
  const buttons = [
    { text: t('common.cancel'), style: 'cancel', onPress: done },
    { text: t('browser.externalOpen', { label }), onPress: () => { done(); open(); } },
  ];
  if (onStayInBrowser) {
    buttons.splice(1, 0, { text: t('browser.externalStay'), onPress: () => { done(); onStayInBrowser(); } });
  }
  Alert.alert(t('browser.externalTitle'), t('browser.externalMessage', { label }), buttons, { onDismiss: done });
};

/** Returns true if the hostname belongs to a known ad/tracking domain */
const isAdHostname = (hostname = '') =>
  AD_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));

/**
 * Injected BEFORE page content loads — intercepts network-layer ad requests.
 * Runs early so ad scripts cannot fire XHR/fetch before we override them.
 *
 * Blocks:
 *   - window.open() → null  (pop-ups, pop-unders)
 *   - fetch() to ad domains → silent no-op
 *   - XMLHttpRequest to ad domains → silent no-op
 *   - document.createElement('script') for ad domains → inert element
 */
const AD_BLOCK_NETWORK_SCRIPT = `
(function() {
  try {
    var AD = ${JSON.stringify(AD_DOMAINS)};
    function _isAd(url) {
      try {
        var h = new URL(url, location.href).hostname;
        return AD.some(function(d) { return h === d || h.slice(-(d.length+1)) === '.'+d; });
      } catch(e) { return false; }
    }

    // 1. Kill pop-ups and pop-unders
    window.open = function() { return null; };

    // 2. Block fetch() to ad domains
    var _fetch = window.fetch;
    window.fetch = function(resource, opts) {
      var url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
      if (_isAd(url)) return new Promise(function() {});
      return _fetch.apply(this, arguments);
    };

    // 3. Block XHR to ad domains
    var _xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._sqBlocked = _isAd(String(url));
      if (!this._sqBlocked) return _xhrOpen.apply(this, arguments);
    };
    var _xhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
      if (!this._sqBlocked) return _xhrSend.apply(this, arguments);
    };

    // 4. Block dynamic <script> injection for ad domains
    var _createElement = document.createElement.bind(document);
    document.createElement = function(tag) {
      var el = _createElement(tag);
      if (typeof tag === 'string' && tag.toLowerCase() === 'script') {
        var _setSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        if (_setSrc) {
          Object.defineProperty(el, 'src', {
            set: function(val) {
              if (_isAd(val)) { this._sqBlocked = true; return; }
              _setSrc.set.call(this, val);
            },
            get: function() { return _setSrc.get.call(this); },
            configurable: true,
          });
        }
      }
      return el;
    };

    // 5. Block location-based redirects to ad domains (used as window.open fallback)
    try {
      var _assign = Location.prototype.assign;
      Location.prototype.assign = function(url) {
        if (_isAd(url)) return;
        return _assign.call(this, url);
      };
      var _replace = Location.prototype.replace;
      Location.prototype.replace = function(url) {
        if (_isAd(url)) return;
        return _replace.call(this, url);
      };
      // Trap location.href = 'ad-url' assignments
      var _locHrefDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
      if (_locHrefDesc && _locHrefDesc.set) {
        Object.defineProperty(Location.prototype, 'href', {
          set: function(val) {
            if (_isAd(String(val))) return;
            _locHrefDesc.set.call(this, val);
          },
          get: _locHrefDesc.get,
          configurable: true,
        });
      }
    } catch(e) {}
  } catch(e) {}
})();
true;
`;

/**
 * BrowserTab Component
 * Encapsulates logic for a SINGLE tab's WebView to ensure persistence and state management.
 * Each tab maintains its own WebView instance for proper navigation history.
 */
/** Returns true if the URL or title looks like a Cloudflare bot-verification challenge */
const isCloudflareChallengePage = (url = '', title = '') => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  return (
    lowerUrl.includes('challenges.cloudflare.com') ||
    lowerUrl.includes('/cdn-cgi/challenge-platform/') ||
    lowerUrl.includes('/cdn-cgi/challenge') ||
    lowerTitle === 'just a moment...' ||
    lowerTitle === 'just a moment'
  );
};

const BrowserTab = ({
  tab,
  isActive,
  userAgent,
  adBlockEnabled,
  enhancedCompatEnabled,
  onUpdateState,
  onLoadEnd,
  onRegisterRef,
  onScroll,
  onChallengeDetected,
  autoHideEnabled,
  onLinkLongPress,
  onOpenWindow,
  backgroundPlayEnabled,
  onMediaState,
  darkPagesEnabled,
  textZoom,
  onDownload,
  theme,
  t,
}) => {
  // Track the navRequestId we last acted on — avoids reloading on WebView-internal
  // URL changes (redirects, link clicks) that also update tab.url in context.
  const lastNavRequestId = useRef(tab.navRequestId || 0);
  const [sourceUrl, setSourceUrl] = useState(tab.url);
  const webViewRef = useRef(null);
  const allowedWebUrl = useRef(null);
  const viewTag = useRef(null);

  // Only push a new URL into the WebView when an explicit external navigation was
  // requested (address bar submit). WebView-internal navigations (redirects, link
  // clicks) change tab.url without bumping navRequestId, so they are ignored here.
  useEffect(() => {
    const reqId = tab.navRequestId || 0;
    if (reqId !== lastNavRequestId.current) {
      lastNavRequestId.current = reqId;
      setSourceUrl(tab.url);
    }
  }, [tab.navRequestId, tab.url]);

  const webViewSource = useMemo(() => ({ uri: sourceUrl }), [sourceUrl]);

  const handleNavigationStateChange = useCallback((navState) => {
    // Notify parent to update context/tab state (url, canGoBack, canGoForward)
    onUpdateState(navState);
    // Detect Cloudflare challenge page so parent can show an info banner
    if (onChallengeDetected) {
      onChallengeDetected(isCloudflareChallengePage(navState.url, navState.title || ''));
    }
  }, [onUpdateState, onChallengeDetected]);

  // Stable ref handler to prevent infinite render loops
  const handleWebViewRef = useCallback((node) => {
    webViewRef.current = node;
  }, []);

  // Flip dark pages on the loaded page right away; new pages get it from the injected script.
  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.__sqSetDark && window.__sqSetDark(${darkPagesEnabled ? 'true' : 'false'}); true;`
    );
  }, [darkPagesEnabled]);

  // Keep the native request filter in sync with the ad-block setting.
  useEffect(() => {
    setNativeAdBlockEnabled(adBlockEnabled);
  }, [adBlockEnabled]);

  // Register ref with parent only when active status changes
  useEffect(() => {
    if (isActive && webViewRef.current) {
      onRegisterRef(webViewRef.current);
    }
  }, [isActive, onRegisterRef]);

  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const adBlockScript = adBlockEnabled ? `
(function() {
  var AD = ${JSON.stringify(AD_DOMAINS)};
  function _isAd(url) {
    try {
      var h = new URL(url, location.href).hostname;
      return AD.some(function(d) { return h === d || h.slice(-(d.length+1)) === '.'+d; });
    } catch(e) { return false; }
  }

  var adSelectors = [
    /* Google Ads */
    '.adsbygoogle','ins.adsbygoogle','[data-ad-client]','[data-ad-slot]',
    '[id^="google_ads_"]','[id^="google_ad_"]','[id^="div-gpt-ad"]',
    /* Generic ad containers */
    '.ad-box','.ad-container','.ad-wrapper','.ad-unit','.ad-zone',
    '.ad-slot','.ad-banner','.ad-space','.ad-section','.ad-block',
    '.banner-ad','.video-ads','.advertisement','.advertisements',
    '[class*="AdWrapper"]','[class*="ad-wrap"]','[id*="adbox"]',
    '[id*="ad-container"]','[id*="ad_container"]',
    '[id*="banner_ad"]','[id*="ad-banner"]','[id*="AdContainer"]',
    /* Native-ad widgets (ExoClick and similar) */
    '[class*="native-widget"]','[class*="exo-native"]','[class*="msg-native"]',
    '[id^="ad_"][id$="_css"]',
    /* Outbrain & Taboola */
    '#outbrain','.outbrain','[id^="outbrain"]',
    '#taboola','.taboola-container','[id^="taboola"]','.widget_taboola',
    /* Sponsored / native ad labels */
    '[id*="sponsored"]','[class*="sponsored-content"]',
    '[class*="native-ad"]','[class*="promoted"]','[class*="promotion"]',
    /* Pop-up / interstitial overlays */
    '[class*="popup-overlay"]','[id*="popup-overlay"]',
    '[class*="interstitial"]','[id*="interstitial"]',
    '[class*="ad-overlay"]','[id*="ad-overlay"]',
    /* Ad iframes */
    'iframe[src*="doubleclick"]','iframe[src*="googlesyndication"]',
    'iframe[src*="adnxs"]','iframe[src*="outbrain"]',
    'iframe[src*="taboola"]','iframe[src*="criteo"]',
    'iframe[src*="advertising.com"]','iframe[src*="openx"]',
    'iframe[id*="google_ads"]',
  ];

  /* Popup ads lock page scrolling while they are open (overflow:hidden, position:fixed on the
     body, "modal-open" style classes). The page's own close code would undo that, but we delete
     the ad instead, so the lock stays and the page can no longer scroll. After removing a big
     layer we undo the lock - only shortly afterwards, and never while another full-screen layer
     (for example a real cookie dialog) is still showing. */
  var _lastOverlayRemoval = 0;
  var LOCK_CLASSES = ['modal-open','no-scroll','noscroll','no_scroll','scroll-lock','scroll-locked',
    'lock-scroll','overflow-hidden','is-locked','popup-open','has-popup','body-fixed'];

  function isBigLayer(el) {
    try {
      var cs = window.getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
      var r = el.getBoundingClientRect();
      return r.width >= window.innerWidth * 0.6 && r.height >= window.innerHeight * 0.6;
    } catch (e) { return false; }
  }

  function hasFullscreenLayer() {
    var vw = window.innerWidth, vh = window.innerHeight, found = false;
    Array.prototype.slice.call(document.body ? document.body.children : []).forEach(function(el) {
      if (found) return;
      var cs = window.getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return;
      if (parseFloat(cs.opacity) < 0.05) return;
      var r = el.getBoundingClientRect();
      if (r.width >= vw * 0.9 && r.height >= vh * 0.9) found = true;
    });
    return found;
  }

  function releaseScrollLock() {
    try {
      if (Date.now() - _lastOverlayRemoval > 8000 || hasFullscreenLayer()) return;
      var restoreTop = null;
      [document.documentElement, document.body].forEach(function(el) {
        if (!el) return;
        var cs = window.getComputedStyle(el);
        var fixedBody = el === document.body && cs.position === 'fixed';
        if (cs.overflowY !== 'hidden' && !fixedBody) return;
        if (fixedBody) restoreTop = parseInt(cs.top) || 0;
        LOCK_CLASSES.forEach(function(c) { el.classList.remove(c); });
        ['overflow','overflow-y','position','top','left','right','width'].forEach(function(prop) {
          if (prop === 'overflow' || prop === 'overflow-y' || fixedBody) el.style.removeProperty(prop);
        });
        cs = window.getComputedStyle(el);
        if (cs.overflowY === 'hidden') el.style.setProperty('overflow-y', 'auto', 'important');
        if (el === document.body && cs.position === 'fixed') el.style.setProperty('position', 'static', 'important');
      });
      if (restoreTop) window.scrollTo(0, -restoreTop);
    } catch (e) {}
  }

  function noteOverlayRemoved() {
    _lastOverlayRemoval = Date.now();
    [0, 150, 600, 1500].forEach(function(ms) { setTimeout(releaseScrollLock, ms); });
  }

  function removeAds() {
    adSelectors.forEach(function(s) {
      try {
        document.querySelectorAll(s).forEach(function(el) {
          if (isBigLayer(el)) noteOverlayRemoved();
          el.remove();
        });
      }
      catch(e) {}
    });
  }

  /* Pop-under networks inject a full-viewport layer with a huge z-index (often right after
     the first tap) that either is an invisible click-catcher or holds an ad. Remove those,
     but keep anything that looks like a real dialog (form controls or real text). */
  function removeFullscreenOverlays() {
    try {
      var vw = window.innerWidth, vh = window.innerHeight;
      var nodes = document.body ? document.body.children : [];
      Array.prototype.slice.call(nodes).forEach(function(el) {
        var cs = window.getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'absolute') return;
        if ((parseInt(cs.zIndex) || 0) < 1000000) return;
        var r = el.getBoundingClientRect();
        if (r.width < vw * 0.9 || r.height < vh * 0.9) return;
        if (el.querySelector('input, select, textarea, button, form')) return;
        var textLen = (el.innerText || '').trim().length;
        var hasFrame = !!el.querySelector('iframe');
        var hasLink = !!el.querySelector('a[href]');
        if (hasFrame || textLen < 40 || (hasLink && textLen < 200)) { el.remove(); noteOverlayRemoved(); }
      });
    } catch (e) {}
  }
  document.addEventListener('click', function() {
    setTimeout(removeFullscreenOverlays, 60);
    setTimeout(removeFullscreenOverlays, 500);
    setTimeout(removeFullscreenOverlays, 1500);
  }, true);

  removeAds();
  removeFullscreenOverlays();
  setTimeout(removeAds, 800);
  setTimeout(removeAds, 2500);

  /* A popup script may re-apply its scroll lock after we removed the layer */
  try {
    var _lockObserver = new MutationObserver(function() {
      if (Date.now() - _lastOverlayRemoval < 8000) releaseScrollLock();
    });
    [document.documentElement, document.body].forEach(function(el) {
      if (el) _lockObserver.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    });
  } catch(e) {}

  /* Watch for dynamically injected ads */
  try {
    var _ovTimer = null;
    new MutationObserver(function() {
      removeAds();
      clearTimeout(_ovTimer);
      _ovTimer = setTimeout(removeFullscreenOverlays, 150);
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch(e) {}

  /* Block click-through to ad domains AND all target="_blank" pop-up attempts.
     Runs in capture phase so it fires before any page click handler. */
  document.addEventListener('click', function(e) {
    var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!el) return;
    // Download links may use target="_blank"; those are files, not pop-ups.
    var blocked = _isAd(el.href || '') || (el.target === '_blank' && !el.hasAttribute('download'));
    if (blocked) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  /* Remove transparent overlay elements stacked on top of video players.
     These are the "invisible ad link" trick — a zero-opacity <a> covers the
     player so tapping Play actually taps the ad link instead. */
  function removeVideoAdOverlays() {
    var players = document.querySelectorAll(
      'video, [class*="player"], [id*="player"], [class*="Player"], [id*="Player"]'
    );
    players.forEach(function(media) {
      var rect = media.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      try {
        var stack = document.elementsFromPoint(cx, cy);
        stack.forEach(function(el) {
          if (el === media || el === document.body || el === document.documentElement) return;
          // Only remove elements that sit ABOVE the video and are transparent/invisible
          var s = window.getComputedStyle(el);
          var zIndex = parseInt(s.zIndex) || 0;
          if (zIndex <= 0) return;
          var opacity = parseFloat(s.opacity);
          var bg = s.backgroundColor;
          var isTransparent = opacity < 0.05 ||
            bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';
          // Must look like a clickable overlay (anchor, or has onclick/href)
          var isClickable = el.tagName === 'A' || el.onclick ||
            el.getAttribute('onclick') || el.getAttribute('href');
          if (isTransparent && isClickable) el.remove();
        });
      } catch(e) {}
    });
  }

  setTimeout(removeVideoAdOverlays, 1200);
  setTimeout(removeVideoAdOverlays, 3000);

  /* Re-run overlay sweep whenever new nodes are added (e.g. lazy-loaded players) */
  try {
    var _overlayTimer = null;
    new MutationObserver(function() {
      clearTimeout(_overlayTimer);
      _overlayTimer = setTimeout(removeVideoAdOverlays, 500);
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch(e) {}
})();
true;
  ` : '';

  // Scroll tracking script for auto-hide navbar
  const scrollTrackingScript = autoHideEnabled ? `
    (function() {
      let lastScrollY = window.scrollY;
      let scrollTimeout;

      window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        const scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';

        // Throttle scroll events
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scroll',
              direction: scrollDirection,
              scrollY: currentScrollY
            }));
          }
        }, 50);

        lastScrollY = currentScrollY;
      });
    })();
  ` : '';

  const linkLongPressScript = `
    (function() {
      var _sqTimer = null;
      function findAnchor(el) {
        while (el && el !== document.body) {
          if (el.tagName && el.tagName.toLowerCase() === 'a' && el.href) return el;
          el = el.parentElement;
        }
        return null;
      }
      document.addEventListener('touchstart', function(e) {
        var a = findAnchor(e.target);
        if (!a) return;
        _sqTimer = setTimeout(function() {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'linkLongPress',
            url: a.href,
            text: (a.innerText || '').trim().substring(0, 80)
          }));
        }, 500);
      }, { passive: true });
      ['touchmove', 'touchend', 'touchcancel'].forEach(function(ev) {
        document.addEventListener(ev, function() {
          if (_sqTimer) { clearTimeout(_sqTimer); _sqTimer = null; }
        }, { passive: true });
      });
      document.addEventListener('contextmenu', function(e) {
        if (findAnchor(e.target)) e.preventDefault();
      }, true);
    })();
  `;

  return (
    <View style={[styles.webviewContainer, { display: isActive ? 'flex' : 'none' }]}>
      <WebView
        ref={handleWebViewRef}
        source={webViewSource}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={(e) => {
          // The event target is the native view tag the native modules need.
          viewTag.current = e.nativeEvent.target;
          attachToWebView(viewTag.current);
          setIsLoading(true);
          setLoadProgress(0.1);
        }}
        onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
        onLoadEnd={(e) => {
          setIsLoading(false);
          setLoadProgress(1);
          // Re-check CF status after page fully loads (title is available here)
          if (onChallengeDetected) {
            const { url = '', title = '' } = e.nativeEvent;
            onChallengeDetected(isCloudflareChallengePage(url, title));
          }
          onLoadEnd(e, tab.id);
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'scroll' && autoHideEnabled && onScroll) {
              onScroll(data.direction, data.scrollY);
            } else if (data.type === 'linkLongPress' && onLinkLongPress) {
              onLinkLongPress(data.url, data.text);
            } else if (data.type === 'mediaState' && onMediaState) {
              onMediaState(tab.id, data, (js) => evaluateInWebView(viewTag.current, js));
            } else if (data.type === 'download' && onDownload) {
              onDownload(data);
            }
          } catch (e) {
            // Ignore non-JSON messages
          }
        }}
        startInLoadingState={false}
        userAgent={userAgent}
        injectedJavaScriptBeforeContentLoaded={
          (enhancedCompatEnabled ? BOT_BYPASS_SCRIPT : 'true;') +
          (adBlockEnabled ? AD_BLOCK_NETWORK_SCRIPT : 'true;') +
          (backgroundPlayEnabled ? BACKGROUND_PLAY_SCRIPT : 'true;') +
          darkPagesScript(darkPagesEnabled) +
          (Platform.OS === 'android' ? DOWNLOAD_SCRIPT : '')
        }
        injectedJavaScript={
          adBlockScript + scrollTrackingScript + linkLongPressScript +
          (backgroundPlayEnabled ? BACKGROUND_PLAY_SCRIPT : '') +
          darkPagesScript(darkPagesEnabled) +
          (Platform.OS === 'android' ? DOWNLOAD_SCRIPT : '')
        }
        textZoom={textZoom}
        // Shown by react-native-webview for normal (DownloadManager) downloads
        downloadingMessage={t('downloads.started')}
        lackPermissionToDownloadMessage={t('downloads.noPermission')}
        javaScriptEnabled={true}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={false}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={Platform.OS !== 'web'}
        thirdPartyCookiesEnabled={Platform.OS !== 'web'}
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode="compatibility"
        pullToRefreshEnabled={true}
        // Popups (window.open / target="_blank"). Our JS overrides only reach the main
        // frame on Android, so ad pop-unders from cross-origin player iframes land here.
        // Without this handler Android hands the URL to the system browser.
        onOpenWindow={({ nativeEvent }) => {
          if (adBlockEnabled) return;
          if (onOpenWindow) onOpenWindow(nativeEvent.targetUrl);
        }}
        onShouldStartLoadWithRequest={(request) => {
          const external = getExternalAppLink(request.url);
          if (external) {
            // One-shot bypass so "Stay in browser" can load the web page.
            if (allowedWebUrl.current === request.url) {
              allowedWebUrl.current = null;
              return true;
            }
            promptOpenInApp(t, external, external.stayUrl ? () => {
              allowedWebUrl.current = request.url;
              webViewRef.current?.injectJavaScript(
                `window.location.href = ${JSON.stringify(request.url)}; true;`
              );
            } : null);
            return false;
          }
          if (!adBlockEnabled) return true;
          try {
            const hostname = new URL(request.url).hostname;
            if (isAdHostname(hostname)) return false;
          } catch (e) {}
          return true;
        }}
      />
      {/* Thin non-blocking progress bar — replaces full-screen ActivityIndicator overlay
          so Cloudflare challenge pages remain visible and interactive during load */}
      {isLoading && (
        <View style={styles.progressBarTrack} pointerEvents="none">
          <View style={[styles.progressBarFill, { width: `${Math.round(loadProgress * 100)}%` }]} />
        </View>
      )}
    </View>
  );
};


const BrowserScreen = ({ navigation }) => {
  const {
    currentUrl,
    setCurrentUrl,
    setWebViewRef,
    adBlockEnabled,
    enhancedCompatEnabled,
    backgroundPlayEnabled,
    darkPagesEnabled,
    textZoom,
    userAgent,
    tabs,
    activeTabIndex,
    addTab,
    addTabInBackground,
    closeTab,
    setActiveTabIndex,
    updateTabState,
    addHistoryEntry,
    toggleBookmark,
    showTabSwitcher,
    setShowTabSwitcher,
    isDarkMode,
    exitConfirmationEnabled,
    setExitConfirmation,
    urlBarPosition,
    autoHideNavBar,
    timerEnabled,
    limitReached,
    strictMode,
    extensionMs,
    extendTimer,
    setTimerScreenActive,
    t,
  } = useBrowser();

  const theme = getTheme(isDarkMode);
  const { colors, spacing, borderRadius, animation, typography } = theme;

  const showSoftOverlay = timerEnabled && limitReached && !strictMode;
  const showStrictWall = timerEnabled && limitReached && strictMode;

  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [isCloudflareChallenge, setIsCloudflareChallenge] = useState(false);
  const [linkMenuVisible, setLinkMenuVisible] = useState(false);
  const [longPressedLink, setLongPressedLink] = useState({ url: '', text: '' });


  const handleChallengeDetected = useCallback((detected) => {
    setIsCloudflareChallenge(detected);
  }, []);

  // Tabs that currently have media (playing or paused), most recent last. The foreground
  // service and its media notification follow the tab that is playing (else the last paused).
  const mediaTabs = useRef(new Map());
  const currentMediaTab = useRef(null);
  const askedNotificationPermission = useRef(false);
  const stopTimer = useRef(null);

  const syncPlayback = useCallback(() => {
    const entries = [...mediaTabs.current.entries()];
    const pick = entries.reverse().find(([, m]) => m.state === 'playing') ||
      [...mediaTabs.current.entries()].reverse()[0];
    clearTimeout(stopTimer.current);
    if (!backgroundPlayEnabled || !pick) {
      currentMediaTab.current = null;
      // Wait before stopping: skipping to the previous video navigates the page, which
      // briefly reports "no media", and the service cannot be restarted from the background.
      stopTimer.current = setTimeout(stopPlaybackService, backgroundPlayEnabled ? 30000 : 0);
      return;
    }
    const [tabId, m] = pick;
    currentMediaTab.current = tabId;
    updatePlayback({
      playing: m.state === 'playing',
      title: m.title,
      artist: m.artist,
      artwork: m.artwork,
      hasPrev: m.hasPrev,
      hasNext: m.hasNext,
      seek: m.seek,
    });
  }, [backgroundPlayEnabled]);

  const handleMediaState = useCallback((tabId, data, inject) => {
    if (data.state === 'none') {
      mediaTabs.current.delete(tabId);
    } else {
      // Re-insert so Map order reflects the most recently updated tab.
      mediaTabs.current.delete(tabId);
      mediaTabs.current.set(tabId, { ...data, inject });
      // Android 13+: without this the service still runs, but its notification is hidden.
      if (data.state === 'playing' && Platform.OS === 'android' && Platform.Version >= 33 &&
          !askedNotificationPermission.current) {
        askedNotificationPermission.current = true;
        PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => {});
      }
    }
    syncPlayback();
  }, [syncPlayback]);

  // Notification / headset buttons -> the page that is playing.
  useEffect(() => addMediaActionListener((action) => {
    const entry = mediaTabs.current.get(currentMediaTab.current);
    if (entry?.inject) {
      entry.inject(`window.__sqMediaControl && window.__sqMediaControl(${JSON.stringify(action)}); true;`);
    }
  }), []);

  // Drop closed tabs and react to the setting being toggled.
  useEffect(() => {
    const ids = new Set(tabs.map(t => t.id));
    mediaTabs.current.forEach((_, id) => { if (!ids.has(id)) mediaTabs.current.delete(id); });
    syncPlayback();
  }, [tabs, syncPlayback]);

  useEffect(() => () => stopPlaybackService(), []);

  // Files a page built itself (blob:/data: links), posted by DOWNLOAD_SCRIPT.
  const handleDownload = useCallback(async (data) => {
    if (Platform.OS !== 'android') return;
    if (data.error) {
      ToastAndroid.show(t(data.error === 'tooLarge' ? 'downloads.tooLarge' : 'downloads.failed'), ToastAndroid.LONG);
      return;
    }
    try {
      const saved = await saveBase64ToDownloads(fileNameFor(data.name, data.mime), data.mime, data.data);
      if (saved) ToastAndroid.show(t('downloads.saved', { name: saved }), ToastAndroid.LONG);
    } catch (e) {
      ToastAndroid.show(t(e && e.message === 'permission' ? 'downloads.noPermission' : 'downloads.failed'), ToastAndroid.LONG);
    }
  }, [t]);

  const handleLinkLongPress = useCallback((url, text) => {
    if (!url || url.startsWith('javascript:')) return;
    setLongPressedLink({ url, text });
    setLinkMenuVisible(true);
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    setLinkMenuVisible(false);
    addTab(longPressedLink.url);
  }, [addTab, longPressedLink.url]);

  const handleOpenInBackground = useCallback(() => {
    setLinkMenuVisible(false);
    addTabInBackground(longPressedLink.url);
  }, [addTabInBackground, longPressedLink.url]);

  const handleCopyLink = useCallback(async () => {
    setLinkMenuVisible(false);
    await Clipboard.setStringAsync(longPressedLink.url);
  }, [longPressedLink.url]);

  const handleShareLink = useCallback(() => {
    setLinkMenuVisible(false);
    Share.share(Platform.OS === 'ios'
      ? { url: longPressedLink.url }
      : { message: longPressedLink.url });
  }, [longPressedLink.url]);

  const handleAddBookmark = useCallback(async () => {
    setLinkMenuVisible(false);
    await toggleBookmark(longPressedLink.url, longPressedLink.text || longPressedLink.url);
  }, [toggleBookmark, longPressedLink]);

  // Animated value for navbar hide/show
  const navbarTranslateY = useRef(new Animated.Value(0)).current;
  const isNavbarVisible = useRef(true);
  const lastScrollDirection = useRef(null);

  // Animated value for content padding
  const contentPadding = useRef(new Animated.Value(0)).current;

  // Keyboard height tracking for bottom URL bar
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Calculate URL bar height for content padding (approximately 50-60px)
  const URL_BAR_HEIGHT = Platform.OS === 'ios' ? 60 : 55;
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  const totalTopBarHeight = URL_BAR_HEIGHT + statusBarHeight;

  // Initialize content padding based on URL bar position
  // Always include status bar height to prevent content from going under status icons
  // Update when urlBarPosition changes (loaded from AsyncStorage)
  useEffect(() => {
    const initialPadding = urlBarPosition === 'top' ? totalTopBarHeight : statusBarHeight;
    contentPadding.setValue(initialPadding);
  }, [urlBarPosition]); // Re-run when urlBarPosition is loaded from AsyncStorage

  // Track keyboard height for bottom URL bar positioning
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Refs to track WebViews for all tabs
  const activeWebViewRef = useRef(null);

  // Update global ref when active tab changes.
  // CRITICAL: Check for equality to prevent infinite context updates
  const handleRegisterRef = useCallback((ref) => {
    if (activeWebViewRef.current !== ref) {
      activeWebViewRef.current = ref;
      setWebViewRef(ref);
    }
  }, [setWebViewRef]);

  // Navigation State Handler (Multi-tab aware)
  const handleTabUpdate = useCallback((navState, index) => {
    if (navState.url !== tabs[index].url ||
        navState.canGoBack !== tabs[index].canGoBack ||
        navState.canGoForward !== tabs[index].canGoForward) {

      updateTabState(index, {
        canGoBack: navState.canGoBack,
        canGoForward: navState.canGoForward,
        url: navState.url
      });
    }
  }, [tabs, updateTabState]);

  const handleLoadEnd = useCallback((syntheticEvent, tabId) => {
    const { nativeEvent } = syntheticEvent;
    if (nativeEvent.url && nativeEvent.url !== 'about:blank' && !nativeEvent.url.startsWith('file://')) {
      const title = nativeEvent.title || nativeEvent.url.split('/')[2] || nativeEvent.url;
      addHistoryEntry(nativeEvent.url, title);
    }
  }, [addHistoryEntry]);

  // Handle scroll events for auto-hide navbar
  const handleScroll = useCallback((direction, scrollY) => {
    if (!autoHideNavBar) return;

    // Hide navbar when scrolling down, show when scrolling up
    // Only hide after scrolling down a bit (avoid hiding on small scrolls)
    const shouldHide = direction === 'down' && scrollY > 50;
    const shouldShow = direction === 'up';

    // For top bar: hide by sliding up (negative Y), show at 0
    // For bottom bar: hide by sliding down (positive Y), show at 0
    const hideValue = urlBarPosition === 'bottom' ? 100 : -100;

    // Calculate target padding based on URL bar position and visibility
    // When URL bar is at bottom, padding stays at status bar height (doesn't change)
    // When URL bar is at top, padding changes based on visibility
    let targetPadding;
    if (urlBarPosition === 'bottom') {
      targetPadding = statusBarHeight; // Always maintain status bar padding for bottom position
    } else {
      targetPadding = isNavbarVisible.current === false || shouldHide ? statusBarHeight : totalTopBarHeight;
    }

    if (shouldHide && isNavbarVisible.current) {
      isNavbarVisible.current = false;
      Animated.parallel([
        Animated.timing(navbarTranslateY, {
          toValue: hideValue,
          duration: animation.normal,
          useNativeDriver: true,
        }),
        Animated.timing(contentPadding, {
          toValue: urlBarPosition === 'top' ? statusBarHeight : statusBarHeight,
          duration: animation.normal,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (shouldShow && !isNavbarVisible.current) {
      isNavbarVisible.current = true;
      Animated.parallel([
        Animated.timing(navbarTranslateY, {
          toValue: 0,
          duration: animation.normal,
          useNativeDriver: true,
        }),
        Animated.timing(contentPadding, {
          toValue: urlBarPosition === 'top' ? totalTopBarHeight : statusBarHeight,
          duration: animation.normal,
          useNativeDriver: false,
        }),
      ]).start();
    }

    lastScrollDirection.current = direction;
  }, [autoHideNavBar, navbarTranslateY, urlBarPosition, contentPadding, totalTopBarHeight, statusBarHeight, animation]);

  // Reset navbar visibility and CF banner when URL changes
  useEffect(() => {
    // Clear CF challenge banner whenever the active URL changes — the new page may not be CF
    setIsCloudflareChallenge(false);
    if (autoHideNavBar) {
      isNavbarVisible.current = true;
      navbarTranslateY.setValue(0);
      contentPadding.setValue(urlBarPosition === 'top' ? totalTopBarHeight : statusBarHeight);
    }
  }, [currentUrl, autoHideNavBar, navbarTranslateY, contentPadding, urlBarPosition, totalTopBarHeight, statusBarHeight]);


  // Pause/resume timer when navigating away from the browser screen
  useEffect(() => {
    if (!navigation) return;
    const focusUnsub = navigation.addListener('focus', () => setTimerScreenActive(true));
    const blurUnsub = navigation.addListener('blur', () => setTimerScreenActive(false));
    return () => {
      focusUnsub();
      blurUnsub();
    };
  }, [navigation, setTimerScreenActive]);

  useEffect(() => {
    // Handle Android hardware back button
    const backAction = () => {
      // Strict timer wall — consume back press, do nothing
      if (showStrictWall) return true;

      if (showTabSwitcher) {
        setShowTabSwitcher(false);
        return true;
      }

      // The browser stays mounted underneath Settings, History, etc. When another screen
      // is on top, let the navigator pop it (back to where the user came from) instead of
      // handling the gesture as a browser back / exit prompt.
      if (!navigation.isFocused()) return false;

      // If we have an active webview, try to go back
      if (currentUrl !== 'about:blank' && activeWebViewRef.current) {
        const activeTab = tabs[activeTabIndex];
        if (activeTab && activeTab.canGoBack) {
          activeWebViewRef.current.goBack();
          return true;
        } else {
          // Return to home
          setCurrentUrl('about:blank');
          return true;
        }
      }

      // If we are on Home page (about:blank), ask to exit
      if (currentUrl === 'about:blank') {
        if (!exitConfirmationEnabled) {
          return false; // Exit app
        }
        setExitModalVisible(true);
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation, currentUrl, tabs, activeTabIndex, showTabSwitcher, showStrictWall, exitConfirmationEnabled, setCurrentUrl]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.groupedBackground }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Address Bar - Top or Bottom based on setting */}
        {urlBarPosition === 'top' && (
          <Animated.View
            style={[
              styles.topBar,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.separator,
                transform: [{ translateY: navbarTranslateY }]
              }
            ]}
          >
            <AddressBar />
          </Animated.View>
        )}

        {/* Cloudflare challenge info banner — shown when the active tab hits a CF challenge page.
            Floats below the address bar without blocking the WebView content so the user
            can still interact with the Turnstile / IUAM challenge underneath. */}
        {isCloudflareChallenge && (
          <View style={[
            styles.cfBanner,
            urlBarPosition === 'top'
              ? { top: totalTopBarHeight }
              : { bottom: (keyboardHeight || 0) + (Platform.OS === 'ios' ? 80 : 70) },
            { backgroundColor: isDarkMode ? '#2a2000' : '#fff8e1' },
          ]}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#FF9800" />
            <Text style={[styles.cfBannerText, { color: isDarkMode ? '#ffd54f' : '#7a5800' }]}>
              {t('browser.cloudflareVerifying')}
            </Text>
            <TouchableOpacity
              style={styles.cfBannerReload}
              onPress={() => activeWebViewRef.current && activeWebViewRef.current.reload()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh" size={16} color="#FF9800" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cfBannerClose}
              onPress={() => setIsCloudflareChallenge(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={isDarkMode ? '#ffd54f' : '#7a5800'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Render Content */}
        <Animated.View style={{ flex: 1, paddingTop: contentPadding }}>
          {tabs.map((tab, index) => {
            const isActive = index === activeTabIndex;

            // 1. If it's about:blank and active: Show HomeScreen
            if (tab.url === 'about:blank') {
              if (isActive) return <HomeScreen key={tab.id} />;
              return null; // Don't persist blank tabs
            }

            // 2. If it's a real URL: Render BrowserTab (Persistent)
            return (
              <BrowserTab
                key={tab.id}
                tab={tab}
                isActive={isActive}
                userAgent={userAgent}
                adBlockEnabled={adBlockEnabled}
                enhancedCompatEnabled={enhancedCompatEnabled !== false}
                onUpdateState={(state) => handleTabUpdate(state, index)}
                onLoadEnd={handleLoadEnd}
                onRegisterRef={handleRegisterRef}
                onChallengeDetected={isActive ? handleChallengeDetected : undefined}
                onScroll={handleScroll}
                autoHideEnabled={autoHideNavBar}
                onLinkLongPress={isActive ? handleLinkLongPress : undefined}
                onOpenWindow={isActive ? addTab : undefined}
                backgroundPlayEnabled={backgroundPlayEnabled !== false}
                onMediaState={handleMediaState}
                darkPagesEnabled={darkPagesEnabled}
                textZoom={textZoom}
                onDownload={handleDownload}
                theme={theme}
                t={t}
              />
            );
          })}
        </Animated.View>

        {/* Address Bar - Bottom position */}
        {urlBarPosition === 'bottom' && (
          <Animated.View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.separator,
                transform: [{ translateY: navbarTranslateY }],
                bottom: keyboardHeight || 0,
                paddingBottom: keyboardHeight > 0 ? 0 : (Platform.OS === 'ios' ? 10 : 5), // Remove padding when keyboard is open
              }
            ]}
          >
            <AddressBar />
          </Animated.View>
        )}

      </KeyboardAvoidingView>

      <ExitModal
        visible={exitModalVisible}
        onClose={() => setExitModalVisible(false)}
        onConfirm={() => {
          if (dontAskAgain) {
            setExitConfirmation(false);
          }
          BackHandler.exitApp();
        }}
        theme={theme}
        dontAskAgain={dontAskAgain}
        setDontAskAgain={setDontAskAgain}
      />

      <TabSwitcher
        visible={showTabSwitcher}
        onClose={() => setShowTabSwitcher(false)}
        theme={theme}
      />

      <TimerSoftOverlay
        visible={showSoftOverlay}
        onExtend={extendTimer}
        extensionMs={extensionMs}
        theme={theme}
      />

      <LinkContextMenu
        visible={linkMenuVisible}
        url={longPressedLink.url}
        onClose={() => setLinkMenuVisible(false)}
        onOpenInNewTab={handleOpenInNewTab}
        onOpenInBackground={handleOpenInBackground}
        onCopyLink={handleCopyLink}
        onShare={handleShareLink}
        onAddBookmark={handleAddBookmark}
        theme={theme}
      />

      <TimerStrictWall
        visible={showStrictWall}
        theme={theme}
      />
    </SafeAreaView>
  );
};

const ExitModal = ({ visible, onClose, onConfirm, theme, dontAskAgain, setDontAskAgain }) => {
  const { colors, borderRadius, animation } = theme;
  const { t } = useBrowser();
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: colors.scrim }]}>
        <View style={[styles.confirmModal, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>{t('browser.exitTitle')}</Text>
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
            {t('browser.exitMessage')}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.checkboxContainer, pressed && { opacity: animation.pressOpacity }]}
            onPress={() => setDontAskAgain(!dontAskAgain)}
          >
            <View style={[styles.checkbox, { borderColor: colors.accent }, dontAskAgain && { backgroundColor: colors.accent }]}>
              {dontAskAgain && <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>{t('browser.dontAskAgain')}</Text>
          </Pressable>

          <View style={styles.confirmButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                styles.cancelButton,
                { backgroundColor: colors.surfaceAlt },
                pressed && { transform: [{ scale: animation.pressScale }] },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                styles.exitButton,
                { backgroundColor: colors.accent },
                pressed && { transform: [{ scale: animation.pressScale }] },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.exitButtonText, { color: colors.textOnPrimary }]}>{t('common.exit')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TabSwitcher = ({ visible, onClose, theme }) => {
  const { tabs, activeTabIndex, setActiveTabIndex, addTab, closeTab, t } = useBrowser();
  const [processingIndex, setProcessingIndex] = useState(null);
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderRadius, animation, iosSheet, typography } = theme;
  const translateY = useRef(new Animated.Value(0)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const sheetOffset = Dimensions.get('window').height;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(sheetOffset);
      scrimOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, ...animation.spring }),
        Animated.timing(scrimOpacity, { toValue: 1, duration: animation.fast, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: sheetOffset, duration: animation.normal, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 0, duration: animation.normal, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 100 || g.vy > 0.8) {
        onClose();
      } else {
        Animated.spring(translateY, { toValue: 0, ...animation.spring }).start();
      }
    },
  }), [onClose, translateY, animation]);

  const getTabTitle = (url) => {
    if (url === 'about:blank') return t('browser.homeTab');
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleCloseTab = (index) => {
    if (processingIndex !== null) return; // Prevent multiple rapid clicks
    setProcessingIndex(index);
    closeTab(index);
    setTimeout(() => setProcessingIndex(null), 300);
  };

  const handleAddTab = () => {
    if (processingIndex === 'add') return; // Prevent multiple rapid clicks
    setProcessingIndex('add');
    addTab();
    onClose(); // Create the tab AND close the sheet immediately (Chrome/iOS Safari behavior)
    setTimeout(() => setProcessingIndex(null), 300);
  };

  if (!mounted) return null;

  const hasTabs = tabs.length > 0;

  return (
    <Modal visible={mounted} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: scrimOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: iosSheet.sheetRadius,
              borderTopRightRadius: iosSheet.sheetRadius,
              paddingBottom: insets.bottom || spacing.lg,
              maxHeight: Dimensions.get('window').height * iosSheet.maxHeightRatio,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.grabHandle} {...panResponder.panHandlers}>
            <View style={[styles.grabHandleBar, { width: iosSheet.grabHandleWidth, height: iosSheet.grabHandleHeight, borderRadius: iosSheet.grabHandleRadius, backgroundColor: colors.textTertiary }]} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: typography.fontSizes.title3 }]}>{t('browser.tabsTitle', { count: tabs.length })}</Text>
            <Pressable
              style={({ pressed }) => [styles.sheetCloseButton, pressed && { opacity: animation.pressOpacity }]}
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {hasTabs ? (
            <FlatList
              data={tabs}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.tabItemCompact,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: activeTabIndex === index ? colors.accent : 'transparent',
                    },
                    pressed && { transform: [{ scale: animation.pressScale }] },
                  ]}
                  onPress={() => {
                    if (processingIndex === null) {
                      setActiveTabIndex(index);
                      onClose();
                    }
                  }}
                >
                  <View style={styles.tabInfoCompact}>
                    <Ionicons name="globe" size={16} color={activeTabIndex === index ? colors.accent : colors.textSecondary} />
                    <Text style={[styles.tabTitleCompact, { color: colors.text }]} numberOfLines={1}>
                      {getTabTitle(item.url)}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.closeTabButtonCompact,
                      processingIndex === index && { opacity: 0.5 },
                      pressed && { backgroundColor: colors.dangerSoft },
                    ]}
                    onPress={() => handleCloseTab(index)}
                  >
                    <Ionicons name="close" size={18} color={colors.danger} />
                  </Pressable>
                </Pressable>
              )}
              contentContainerStyle={styles.tabListCompact}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {t('browser.noTabs')}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.newTabButtonCompact,
              { backgroundColor: colors.accent },
              processingIndex === 'add' && { opacity: 0.5 },
              pressed && { transform: [{ scale: animation.pressScale }] },
            ]}
            onPress={handleAddTab}
          >
            <Ionicons name="add" size={20} color={colors.textOnPrimary} />
            <Text style={[styles.newTabButtonTextCompact, { color: colors.textOnPrimary }]}>{t('browser.newTab')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const MAX_EXTENSIONS = 3;
const TimerSoftOverlay = ({ visible, onExtend, extensionMs, theme }) => {
  const usedExtensions = Math.round((extensionMs || 0) / 600000);
  const remaining = MAX_EXTENSIONS - usedExtensions;
  const canExtend = remaining > 0;
  const { colors, spacing, borderRadius } = theme;
  const { t } = useBrowser();

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: colors.scrim }]}>
        <View style={[styles.confirmModal, { backgroundColor: colors.surface, borderRadius: borderRadius.md }]}>
          <Ionicons name="timer-outline" size={48} color={colors.warning} style={{ marginBottom: spacing.md }} />
          <Text style={[styles.confirmTitle, { color: colors.text }]}>{t('browser.limitReached')}</Text>
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
            {canExtend
              ? t('browser.limitCanExtend', { count: remaining })
              : t('browser.limitNoExtensions')}
          </Text>
          {canExtend && (
            <TouchableOpacity
              style={[styles.extendButton, { backgroundColor: colors.warning, borderRadius: borderRadius.md, marginTop: spacing.lg }]}
              onPress={onExtend}
              activeOpacity={0.7}
            >
              <Text style={[styles.extendButtonText, { color: colors.textOnPrimary }]}>{t('browser.extendButton')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const getMsUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
};

const TimerStrictWall = ({ visible, theme }) => {
  const [msUntilMidnight, setMsUntilMidnight] = useState(getMsUntilMidnight());
  const { colors } = theme;
  const { t } = useBrowser();

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setMsUntilMidnight(getMsUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const hours = Math.floor(msUntilMidnight / 3600000);
  const minutes = Math.floor((msUntilMidnight % 3600000) / 60000);
  const seconds = Math.floor((msUntilMidnight % 60000) / 1000);
  const countdown = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.timerWall, { backgroundColor: colors.groupedBackground }]}>
        <Ionicons name="lock-closed" size={64} color={colors.danger} />
        <Text style={[styles.timerWallTitle, { color: colors.text }]}>{t('browser.limitReached')}</Text>
        <Text style={[styles.timerWallSubtext, { color: colors.textSecondary }]}>
          {t('browser.strictWall')}
        </Text>
        <Text style={[styles.timerWallCountdown, { color: colors.danger }]}>{countdown}</Text>
        <Text style={[styles.timerWallUntil, { color: colors.textTertiary }]}>{t('browser.untilMidnight')}</Text>
      </View>
    </Modal>
  );
};

const LinkContextMenu = ({
  visible,
  url,
  onClose,
  onOpenInNewTab,
  onOpenInBackground,
  onCopyLink,
  onShare,
  onAddBookmark,
  theme,
}) => {
  const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
  const { t } = useBrowser();
  const { colors, spacing, animation, iosSheet, typography } = theme;
  const translateY = useRef(new Animated.Value(0)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const sheetOffset = Dimensions.get('window').height;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(sheetOffset);
      scrimOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, ...animation.spring }),
        Animated.timing(scrimOpacity, { toValue: 1, duration: animation.fast, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: sheetOffset, duration: animation.normal, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 0, duration: animation.normal, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 100 || g.vy > 0.8) {
        onClose();
      } else {
        Animated.spring(translateY, { toValue: 0, ...animation.spring }).start();
      }
    },
  }), [onClose, translateY, animation]);

  const items = [
    { icon: 'open-outline',         label: t('browser.linkOpenNewTab'),     onPress: onOpenInNewTab },
    { icon: 'browsers-outline',     label: t('browser.linkOpenBackground'), onPress: onOpenInBackground },
    { icon: 'copy-outline',         label: t('browser.linkCopy'),           onPress: onCopyLink },
    { icon: 'share-social-outline', label: t('browser.linkShare'),          onPress: onShare },
    { icon: 'bookmark-outline',     label: t('browser.linkAddBookmark'),    onPress: onAddBookmark },
  ];

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: scrimOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.contextMenuSheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: iosSheet.sheetRadius,
              borderTopRightRadius: iosSheet.sheetRadius,
              paddingBottom: spacing.xl,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.grabHandle} {...panResponder.panHandlers}>
            <View style={[styles.grabHandleBar, { width: iosSheet.grabHandleWidth, height: iosSheet.grabHandleHeight, borderRadius: iosSheet.grabHandleRadius, backgroundColor: colors.textTertiary }]} />
          </View>
          <View style={[styles.contextMenuHeader, { borderBottomColor: colors.separator }]}>
            <Ionicons name="link" size={14} color={colors.textSecondary} />
            <Text style={[styles.contextMenuUrl, { color: colors.textSecondary, fontSize: typography.fontSizes.footnote }]} numberOfLines={1}>
              {displayUrl}
            </Text>
          </View>
          {items.map(({ icon, label, onPress }) => (
            <Pressable
              key={label}
              style={({ pressed }) => [styles.contextMenuItem, pressed && { backgroundColor: colors.surfaceAlt }]}
              onPress={onPress}
            >
              <Ionicons name={icon} size={20} color={colors.text} style={styles.contextMenuIcon} />
              <Text style={[styles.contextMenuItemText, { color: colors.text }]}>{label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [styles.contextMenuCancel, { borderTopColor: colors.separator }, pressed && { opacity: animation.pressOpacity }]}
            onPress={onClose}
          >
            <Text style={[styles.contextMenuCancelText, { color: colors.accent }]}>{t('common.cancel')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }
    }),
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 10 : 5,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      web: {
        boxShadow: '0 -1px 2px rgba(0,0,0,0.1)',
      }
    }),
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  // Thin top progress bar — replaces full-screen loading overlay
  // Uses pointerEvents="none" so it never blocks the page (including CF challenges)
  progressBarTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#2196F3',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  // Cloudflare challenge info banner
  cfBanner: {
    position: 'absolute',
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 20,
    gap: 8,
    ...Platform.select({
      android: { elevation: 4 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
    }),
  },
  cfBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  cfBannerReload: {
    padding: 2,
  },
  cfBannerClose: {
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '600',
  },
  sheetCloseButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grabHandle: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  grabHandleBar: {
    backgroundColor: '#ccc',
  },
  tabListCompact: {
    paddingBottom: 16,
  },
  tabItemCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  tabInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tabTitleCompact: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  closeTabButtonCompact: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  newTabButtonCompact: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  newTabButtonTextCompact: {
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  confirmModal: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    marginHorizontal: '7.5%',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    marginBottom: 24,
    paddingLeft: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  exitButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  exitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  extendButton: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extendButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  timerWall: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  timerWallTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  timerWallSubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  timerWallCountdown: {
    fontSize: 52,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerWallUntil: {
    fontSize: 13,
    marginTop: 8,
  },
  contextMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  contextMenuSheet: {
    paddingBottom: 24,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
    }),
  },
  contextMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  contextMenuUrl: {
    flex: 1,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  contextMenuIcon: {
    width: 28,
  },
  contextMenuItemText: {
    fontSize: 16,
  },
  contextMenuCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 16,
    alignItems: 'center',
  },
  contextMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BrowserScreen;