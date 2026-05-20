/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * BrowserScreen - Main browser interface component
 * Handles tab management, WebView rendering, and navigation
 */
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar, RefreshControl, ScrollView, Modal, Text, TouchableOpacity, FlatList, BackHandler, Alert, Animated, Keyboard, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import AddressBar from '../components/AddressBar';
import HomeScreen from '../components/HomeScreen';

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
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: false,
    });

    // 2. Inject a realistic window.chrome object
    if (!window.chrome || !window.chrome.runtime) {
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

    // 3. Spoof navigator.plugins with realistic Chrome entries
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
  // Tracking / measurement (pure trackers, not login providers)
  'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
  'adsymptotic.com', 'amazon-adsystem.com',
];

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
}) => {
  // Track the navRequestId we last acted on — avoids reloading on WebView-internal
  // URL changes (redirects, link clicks) that also update tab.url in context.
  const lastNavRequestId = useRef(tab.navRequestId || 0);
  const [sourceUrl, setSourceUrl] = useState(tab.url);
  const webViewRef = useRef(null);

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

  function removeAds() {
    adSelectors.forEach(function(s) {
      try { document.querySelectorAll(s).forEach(function(el) { el.remove(); }); }
      catch(e) {}
    });
  }

  removeAds();
  setTimeout(removeAds, 800);
  setTimeout(removeAds, 2500);

  /* Watch for dynamically injected ads */
  try {
    new MutationObserver(function() { removeAds(); })
      .observe(document.documentElement, { childList: true, subtree: true });
  } catch(e) {}

  /* Block click-through to ad domains (catches tap-jacking overlays) */
  document.addEventListener('click', function(e) {
    var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!el) return;
    if (_isAd(el.href || '')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
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
        onLoadStart={() => { setIsLoading(true); setLoadProgress(0.1); }}
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
            }
          } catch (e) {
            // Ignore non-JSON messages
          }
        }}
        startInLoadingState={false}
        userAgent={userAgent}
        injectedJavaScriptBeforeContentLoaded={
          (enhancedCompatEnabled ? BOT_BYPASS_SCRIPT : 'true;') +
          (adBlockEnabled ? AD_BLOCK_NETWORK_SCRIPT : 'true;')
        }
        injectedJavaScript={adBlockScript + scrollTrackingScript + linkLongPressScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={Platform.OS !== 'web'}
        thirdPartyCookiesEnabled={Platform.OS !== 'web'}
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode="compatibility"
        pullToRefreshEnabled={true}
        onShouldStartLoadWithRequest={(request) => {
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
  } = useBrowser();

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
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentPadding, {
          toValue: urlBarPosition === 'top' ? statusBarHeight : statusBarHeight,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (shouldShow && !isNavbarVisible.current) {
      isNavbarVisible.current = true;
      Animated.parallel([
        Animated.timing(navbarTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentPadding, {
          toValue: urlBarPosition === 'top' ? totalTopBarHeight : statusBarHeight,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }

    lastScrollDirection.current = direction;
  }, [autoHideNavBar, navbarTranslateY, urlBarPosition, contentPadding, totalTopBarHeight, statusBarHeight]);

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
  }, [currentUrl, tabs, activeTabIndex, showTabSwitcher, showStrictWall, exitConfirmationEnabled, setCurrentUrl]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Address Bar - Top or Bottom based on setting */}
        {urlBarPosition === 'top' && (
          <Animated.View
            style={[
              styles.topBar,
              {
                backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                borderBottomColor: isDarkMode ? '#333' : '#eee',
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
              Cloudflare is verifying your browser — please wait…
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
                backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                borderTopColor: isDarkMode ? '#333' : '#eee',
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
        isDarkMode={isDarkMode}
        dontAskAgain={dontAskAgain}
        setDontAskAgain={setDontAskAgain}
      />

      <TabSwitcher
        visible={showTabSwitcher}
        onClose={() => setShowTabSwitcher(false)}
      />

      <TimerSoftOverlay
        visible={showSoftOverlay}
        onExtend={extendTimer}
        extensionMs={extensionMs}
        isDarkMode={isDarkMode}
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
        isDarkMode={isDarkMode}
      />

      <TimerStrictWall
        visible={showStrictWall}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
};

const ExitModal = ({ visible, onClose, onConfirm, isDarkMode, dontAskAgain, setDontAskAgain }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
        <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
          <Text style={[styles.confirmTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Exit SquareBrowser?</Text>
          <Text style={[styles.confirmText, { color: isDarkMode ? '#ccc' : '#666' }]}>
            Are you sure you want to close the application?
          </Text>
          
          <TouchableOpacity 
            style={styles.checkboxContainer} 
            onPress={() => setDontAskAgain(!dontAskAgain)}
          >
            <View style={[styles.checkbox, dontAskAgain && styles.checkboxChecked]}>
              {dontAskAgain && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.checkboxLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>Don't ask me again</Text>
          </TouchableOpacity>

          <View style={styles.confirmButtons}>
            <TouchableOpacity style={[styles.confirmButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmButton, styles.exitButton]} onPress={onConfirm}>
              <Text style={styles.exitButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TabSwitcher = ({ visible, onClose }) => {
  const { tabs, activeTabIndex, setActiveTabIndex, addTab, closeTab, isDarkMode } = useBrowser();
  const [processingIndex, setProcessingIndex] = useState(null);
  const insets = useSafeAreaInsets();

  const getTabTitle = (url) => {
    if (url === 'about:blank') return 'Home';
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
    setTimeout(() => setProcessingIndex(null), 300);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1A1A1A' : '#fff', paddingBottom: insets.bottom || 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Tabs ({tabs.length})</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={isDarkMode ? '#fff' : '#333'} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={tabs}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.tabItemCompact, { backgroundColor: isDarkMode ? '#2A2A2A' : '#f5f5f5', borderColor: activeTabIndex === index ? '#2196F3' : 'transparent' }]}
                onPress={() => {
                  if (processingIndex === null) {
                    setActiveTabIndex(index);
                    onClose();
                  }
                }}
                activeOpacity={processingIndex !== null ? 0.5 : 0.7}
              >
                <View style={styles.tabInfoCompact}>
                  <Ionicons name="globe" size={16} color={activeTabIndex === index ? '#2196F3' : '#666'} />
                  <Text style={[styles.tabTitleCompact, { color: isDarkMode ? '#fff' : '#000' }]} numberOfLines={1}>
                    {getTabTitle(item.url)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeTabButtonCompact, processingIndex === index && { opacity: 0.5 }]}
                  onPress={() => handleCloseTab(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color="#F44336" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.tabListCompact}
          />

          <TouchableOpacity
            style={[styles.newTabButtonCompact, processingIndex === 'add' && { opacity: 0.5 }]}
            onPress={handleAddTab}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newTabButtonTextCompact}>New Tab</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const MAX_EXTENSIONS = 3;
const TimerSoftOverlay = ({ visible, onExtend, extensionMs, isDarkMode }) => {
  const usedExtensions = Math.round((extensionMs || 0) / 600000);
  const remaining = MAX_EXTENSIONS - usedExtensions;
  const canExtend = remaining > 0;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
        <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
          <Ionicons name="timer-outline" size={48} color="#FF9800" style={{ marginBottom: 12 }} />
          <Text style={[styles.confirmTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Daily Limit Reached</Text>
          <Text style={[styles.confirmText, { color: isDarkMode ? '#ccc' : '#666' }]}>
            {canExtend
              ? `You've used your daily browsing time. You can extend by 10 minutes — ${remaining} extension${remaining === 1 ? '' : 's'} remaining today.`
              : "You've used all your extensions for today. Browser access resumes at midnight."}
          </Text>
          {canExtend && (
            <TouchableOpacity
              style={{
                width: '100%',
                height: 48,
                borderRadius: 12,
                backgroundColor: '#FF9800',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 16,
              }}
              onPress={onExtend}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Give me 10 more minutes</Text>
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

const TimerStrictWall = ({ visible, isDarkMode }) => {
  const [msUntilMidnight, setMsUntilMidnight] = useState(getMsUntilMidnight());

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
      <View style={[styles.timerWall, { backgroundColor: isDarkMode ? '#0A0A0A' : '#fff' }]}>
        <Ionicons name="lock-closed" size={64} color="#F44336" />
        <Text style={[styles.timerWallTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Daily Limit Reached</Text>
        <Text style={[styles.timerWallSubtext, { color: isDarkMode ? '#999' : '#666' }]}>
          You've set a strict limit. Browser access will resume at midnight.
        </Text>
        <Text style={[styles.timerWallCountdown, { color: '#F44336' }]}>{countdown}</Text>
        <Text style={[styles.timerWallUntil, { color: isDarkMode ? '#666' : '#999' }]}>until midnight</Text>
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
  isDarkMode,
}) => {
  const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
  const menuBg = isDarkMode ? '#1e1e1e' : '#fff';
  const textColor = isDarkMode ? '#fff' : '#000';
  const subtitleColor = isDarkMode ? '#999' : '#666';
  const dividerColor = isDarkMode ? '#333' : '#eee';

  const items = [
    { icon: 'open-outline',         label: 'Open in New Tab',        onPress: onOpenInNewTab },
    { icon: 'browsers-outline',     label: 'Open in Background Tab', onPress: onOpenInBackground },
    { icon: 'copy-outline',         label: 'Copy Link',              onPress: onCopyLink },
    { icon: 'share-social-outline', label: 'Share',                  onPress: onShare },
    { icon: 'bookmark-outline',     label: 'Add Bookmark',           onPress: onAddBookmark },
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.contextMenuOverlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.contextMenuSheet, { backgroundColor: menuBg }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.contextMenuHandle]} />
          <View style={[styles.contextMenuHeader, { borderBottomColor: dividerColor }]}>
            <Ionicons name="link" size={14} color={subtitleColor} />
            <Text style={[styles.contextMenuUrl, { color: subtitleColor }]} numberOfLines={1}>
              {displayUrl}
            </Text>
          </View>
          {items.map(({ icon, label, onPress }) => (
            <TouchableOpacity key={label} style={styles.contextMenuItem} onPress={onPress} activeOpacity={0.7}>
              <Ionicons name={icon} size={20} color={textColor} style={styles.contextMenuIcon} />
              <Text style={[styles.contextMenuItemText, { color: textColor }]}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.contextMenuCancel, { borderTopColor: dividerColor }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.contextMenuCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    padding: 4,
  },
  newTabButtonCompact: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  newTabButtonTextCompact: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmModal: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
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
    marginBottom: 24,
    paddingLeft: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2196F3',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  contextMenuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginVertical: 8,
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
    fontSize: 12,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#2196F3',
  },
});

export default BrowserScreen;

