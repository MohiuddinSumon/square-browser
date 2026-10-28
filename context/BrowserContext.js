/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * BrowserContext - Main context provider for browser state management
 * Handles tabs, history, bookmarks, and app-wide browser functionality
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, AppState, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadHistory, saveHistory, loadBookmarks, saveBookmark, saveBookmarks, removeBookmark, isBookmarked, saveUsage, loadUsage, saveTabs, loadTabs, saveActiveTabIndex, loadActiveTabIndex, saveTimerSettings, loadTimerSettings, saveTimerDaily, loadTimerDaily, loadSchedules, saveSchedules, loadBlocking, saveBlocking, loadCommitment, saveCommitment, loadPendingChanges, savePendingChanges } from '../utils/storage';
import { translate, DEFAULT_LANGUAGE, isSupportedLanguage } from '../i18n';
import { formatInputUrl, DEFAULT_SEARCH_ENGINE, isSupportedSearchEngine } from '../utils/url';
import {
  DEFAULT_BLOCKING, DEFAULT_COMMITMENT, COMMITMENT_DELAY_MS,
  getBlockReason, enforceSafeSearch, scheduleBlockUntil, isLoosening, checkPin,
} from '../utils/protection';

const BrowserContext = createContext();

export const useBrowser = () => {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowser must be used within BrowserProvider');
  }
  return context;
};

export const BrowserProvider = ({ children }) => {
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  
  // Tab Management
  const [tabs, setTabs] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [tabsInitialized, setTabsInitialized] = useState(false);

  const activeTab = tabsInitialized && tabs.length > 0 ? tabs[activeTabIndex] || tabs[0] : { url: 'about:blank', canGoBack: false, canGoForward: false };
  const currentUrl = tabsInitialized ? activeTab.url : 'about:blank';

  const [webViewRef, setWebViewRef] = useState(null);
  const [desktopMode, setDesktopMode] = useState(false);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [showTabSwitcher, setShowTabSwitcher] = useState(false);
  const [todayStats, setTodayStats] = useState({});
  const [yesterdayStats, setYesterdayStats] = useState({});
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [exitConfirmationEnabled, setExitConfirmationEnabled] = useState(true);
  const [urlBarPosition, setUrlBarPosition] = useState('top');
  const [autoHideNavBar, setAutoHideNavBar] = useState(false);
  // Enhanced Compatibility Mode — injects bot-bypass script to help pass Cloudflare challenges
  const [enhancedCompatEnabled, setEnhancedCompatEnabled] = useState(true);
  const [backgroundPlayEnabled, setBackgroundPlayEnabled] = useState(true);
  // Show light web pages in dark colors (separate from the app's own dark mode)
  const [darkPagesEnabled, setDarkPagesEnabled] = useState(false);
  // Web page text size in percent (Android only)
  const [textZoom, setTextZoom] = useState(100);
  // UI language. English unless the user picks another one in Settings (never follows the device).
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const t = useMemo(() => (key, vars) => translate(language, key, vars), [language]);
  // Search engine for address-bar searches. The ref lets navigateTo stay a stable callback.
  const [searchEngine, setSearchEngine] = useState(DEFAULT_SEARCH_ENGINE);
  const searchEngineRef = React.useRef(DEFAULT_SEARCH_ENGINE);
  const formatUrl = useCallback(
    (url) => formatInputUrl(url, searchEngineRef.current, blockingRef.current.safeSearch),
    []
  );

  // Accountability settings (see utils/protection.js). Refs mirror the state for callbacks
  // and intervals that must not be re-created.
  const [schedules, setSchedules] = useState([]);
  const schedulesRef = React.useRef([]);
  const [blocking, setBlocking] = useState(DEFAULT_BLOCKING);
  const blockingRef = React.useRef(DEFAULT_BLOCKING);
  const [commitment, setCommitment] = useState(DEFAULT_COMMITMENT);
  const [pendingChanges, setPendingChanges] = useState([]);
  const pendingChangesRef = React.useRef([]);
  // Date the current schedule window ends, or null when no schedule is blocking browsing
  const [scheduleUntil, setScheduleUntil] = useState(null);
  // { url, reason } for the last navigation the block list stopped; BrowserScreen shows it
  const [blockedNotice, setBlockedNotice] = useState(null);

  // Daily browsing timer state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [dailyLimitMs, setDailyLimitMs] = useState(3600000);
  const [strictMode, setStrictMode] = useState(false);
  const [todayElapsedMs, setTodayElapsedMs] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  // extensionMs tracks extra time granted via "Continue Anyway" taps (10 min each)
  const [extensionMs, setExtensionMs] = useState(0);

  // Mutable ref for timer — avoids stale closures in intervals/AppState handler
  const timerStateRef = React.useRef({
    enabled: false,
    limitMs: 3600000,
    elapsedMs: 0,
    sessionStartMs: Date.now(),
    isForeground: true,
    today: '',
    extensionMs: 0,
    limitReached: false,
  });

  const activityTracker = React.useRef({
    startTime: Date.now(),
    currentUrl: 'about:blank',
    lastSaved: Date.now()
  });

  // Ref to track the current active tab index for navigateTo
  const activeTabIndexRef = React.useRef(activeTabIndex);

  // Keep ref in sync with state
  useEffect(() => {
    activeTabIndexRef.current = activeTabIndex;
  }, [activeTabIndex]);

  // Refs so the AppState listener always reads fresh tabs/tabsInitialized
  // without needing to re-register on every tab change.
  const tabsRef = React.useRef(tabs);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  const tabsInitializedRef = React.useRef(tabsInitialized);
  useEffect(() => { tabsInitializedRef.current = tabsInitialized; }, [tabsInitialized]);

  // User Agents — last updated 2026-04-16, refresh every ~6 months as Chrome versions advance
  const MOBILE_UA = Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36';

  const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Safari/537.36';

  const userAgent = desktopMode ? DESKTOP_UA : MOBILE_UA;

  // Load initial data from storage
  useEffect(() => {
    const loadInitialData = async () => {
      const loadedHistory = await loadHistory();
      const loadedBookmarks = await loadBookmarks();
      setHistory(loadedHistory);
      setBookmarks(loadedBookmarks);

      // Load usage stats
      const today = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toISOString().split('T')[0];

      const tStats = await loadUsage(today);
      const yStats = await loadUsage(yesterday);
      setTodayStats(tStats);
      setYesterdayStats(yStats);

      // Load theme preference
      const savedTheme = await AsyncStorage.getItem('@squarebrowser_theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }

      const savedExitConfirm = await AsyncStorage.getItem('@squarebrowser_exit_confirm');
      if (savedExitConfirm !== null) {
        setExitConfirmationEnabled(savedExitConfirm === 'true');
      }

      const savedUrlBarPosition = await AsyncStorage.getItem('@squarebrowser_urlbar_position');
      if (savedUrlBarPosition) {
        setUrlBarPosition(savedUrlBarPosition);
      }

      const savedAutoHideNavBar = await AsyncStorage.getItem('@squarebrowser_autohide_navbar');
      if (savedAutoHideNavBar !== null) {
        setAutoHideNavBar(savedAutoHideNavBar === 'true');
      }

      const savedEnhancedCompat = await AsyncStorage.getItem('@squarebrowser_enhanced_compat');
      // Default is true (enabled) — only disable if explicitly set to 'false'
      if (savedEnhancedCompat !== null) {
        setEnhancedCompatEnabled(savedEnhancedCompat !== 'false');
      }

      const savedBackgroundPlay = await AsyncStorage.getItem('@squarebrowser_background_play');
      if (savedBackgroundPlay !== null) {
        setBackgroundPlayEnabled(savedBackgroundPlay !== 'false');
      }

      const savedDarkPages = await AsyncStorage.getItem('@squarebrowser_dark_pages');
      if (savedDarkPages !== null) {
        setDarkPagesEnabled(savedDarkPages === 'true');
      }

      const savedTextZoom = parseInt(await AsyncStorage.getItem('@squarebrowser_text_zoom'), 10);
      if (savedTextZoom >= 50 && savedTextZoom <= 300) {
        setTextZoom(savedTextZoom);
      }

      const savedLanguage = await AsyncStorage.getItem('@squarebrowser_language');
      if (savedLanguage && isSupportedLanguage(savedLanguage)) {
        setLanguage(savedLanguage);
      }

      const savedSearchEngine = await AsyncStorage.getItem('@squarebrowser_search_engine');
      if (savedSearchEngine && isSupportedSearchEngine(savedSearchEngine)) {
        searchEngineRef.current = savedSearchEngine;
        setSearchEngine(savedSearchEngine);
      }

      const savedSchedules = await loadSchedules();
      schedulesRef.current = savedSchedules;
      setSchedules(savedSchedules);
      setScheduleUntil(scheduleBlockUntil(savedSchedules));

      const savedBlocking = { ...DEFAULT_BLOCKING, ...(await loadBlocking()) };
      blockingRef.current = savedBlocking;
      setBlocking(savedBlocking);

      setCommitment({ ...DEFAULT_COMMITMENT, ...(await loadCommitment()) });

      const savedPending = await loadPendingChanges();
      pendingChangesRef.current = savedPending;
      setPendingChanges(savedPending);

      // Load timer settings and today's elapsed time
      const timerSettings = await loadTimerSettings();
      setTimerEnabled(timerSettings.enabled);
      setDailyLimitMs(timerSettings.dailyLimitMs);
      setStrictMode(timerSettings.strictMode);

      const timerDaily = await loadTimerDaily(today);
      setTodayElapsedMs(timerDaily.totalMs);

      // Sync timer ref
      timerStateRef.current.enabled = timerSettings.enabled;
      timerStateRef.current.limitMs = timerSettings.dailyLimitMs;
      timerStateRef.current.elapsedMs = timerDaily.totalMs;
      timerStateRef.current.today = today;
      timerStateRef.current.extensionMs = 0;
      timerStateRef.current.sessionStartMs = Date.now();

      if (timerSettings.enabled && timerDaily.totalMs >= timerSettings.dailyLimitMs) {
        setLimitReached(true);
        timerStateRef.current.limitReached = true;
      }

      // Load tab state
      const loadedTabs = await loadTabs();
      const loadedActiveTabIndex = await loadActiveTabIndex();
      setTabs(loadedTabs);
      activeTabIndexRef.current = Math.min(loadedActiveTabIndex, loadedTabs.length - 1);
      setActiveTabIndex(Math.min(loadedActiveTabIndex, loadedTabs.length - 1));
      setTabsInitialized(true);
    };
    loadInitialData();
  }, []);

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('@squarebrowser_theme', newMode ? 'dark' : 'light');
  };

  const setExitConfirmation = async (enabled) => {
    setExitConfirmationEnabled(enabled);
    await AsyncStorage.setItem('@squarebrowser_exit_confirm', enabled ? 'true' : 'false');
  };

  const setUrlBarPositionPref = async (position) => {
    setUrlBarPosition(position);
    await AsyncStorage.setItem('@squarebrowser_urlbar_position', position);
  };

  const setAutoHideNavBarPref = async (enabled) => {
    setAutoHideNavBar(enabled);
    await AsyncStorage.setItem('@squarebrowser_autohide_navbar', enabled ? 'true' : 'false');
  };

  const setEnhancedCompatPref = async (enabled) => {
    setEnhancedCompatEnabled(enabled);
    await AsyncStorage.setItem('@squarebrowser_enhanced_compat', enabled ? 'true' : 'false');
  };

  const setBackgroundPlayPref = async (enabled) => {
    setBackgroundPlayEnabled(enabled);
    await AsyncStorage.setItem('@squarebrowser_background_play', enabled ? 'true' : 'false');
  };

  const setDarkPagesPref = async (enabled) => {
    setDarkPagesEnabled(enabled);
    await AsyncStorage.setItem('@squarebrowser_dark_pages', enabled ? 'true' : 'false');
  };

  const setTextZoomPref = async (percent) => {
    setTextZoom(percent);
    await AsyncStorage.setItem('@squarebrowser_text_zoom', String(percent));
  };

  const setLanguagePref = async (code) => {
    if (!isSupportedLanguage(code)) return;
    setLanguage(code);
    await AsyncStorage.setItem('@squarebrowser_language', code);
  };

  const setSearchEnginePref = async (id) => {
    if (!isSupportedSearchEngine(id)) return;
    searchEngineRef.current = id;
    setSearchEngine(id);
    await AsyncStorage.setItem('@squarebrowser_search_engine', id);
  };

  /**
   * Timer Settings — save and update state + ref
   */
  const setTimerSettingsPref = async ({ enabled, limitMs, strict }) => {
    setTimerEnabled(enabled);
    setDailyLimitMs(limitMs);
    setStrictMode(strict);
    timerStateRef.current.enabled = enabled;
    timerStateRef.current.limitMs = limitMs;
    if (!enabled) {
      setLimitReached(false);
      setExtensionMs(0);
      timerStateRef.current.limitReached = false;
      timerStateRef.current.extensionMs = 0;
    }
    await saveTimerSettings({ enabled, dailyLimitMs: limitMs, strictMode: strict });
  };

  /**
   * Accountability settings. Every change goes through requestProtectionChange, which
   * applies it at once unless the commitment lock says it has to wait (see utils/protection.js).
   */
  const applyProtectionChange = useCallback(async (type, value) => {
    if (type === 'timer') {
      await setTimerSettingsPref({ enabled: value.enabled, limitMs: value.dailyLimitMs, strict: value.strictMode });
    } else if (type === 'schedules') {
      schedulesRef.current = value;
      setSchedules(value);
      setScheduleUntil(scheduleBlockUntil(value));
      await saveSchedules(value);
    } else if (type === 'blocking') {
      blockingRef.current = value;
      setBlocking(value);
      await saveBlocking(value);
    } else if (type === 'commitment') {
      setCommitment(value);
      await saveCommitment(value);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPending = useCallback(async (changes) => {
    pendingChangesRef.current = changes;
    setPendingChanges(changes);
    await savePendingChanges(changes);
  }, []);

  /**
   * Resolves { status }: 'applied', 'pending' (with applyAt), 'needPin' or 'badPin'.
   * options.pin: the partner's PIN; options.wait: skip the PIN and wait out the delay.
   */
  const requestProtectionChange = useCallback(async (type, value, options = {}) => {
    const current = {
      timer: { enabled: timerEnabled, dailyLimitMs, strictMode },
      schedules: schedulesRef.current,
      blocking: blockingRef.current,
      commitment,
    }[type];
    // A newer request replaces one of the same kind that is still waiting.
    const others = pendingChangesRef.current.filter((c) => c.type !== type);
    const apply = async () => {
      await setPending(others);
      await applyProtectionChange(type, value);
      return { status: 'applied' };
    };
    if (commitment.mode === 'off' || !isLoosening(type, current, value)) return apply();
    if (commitment.mode === 'pin' && !options.wait) {
      if (options.pin == null) return { status: 'needPin' };
      if (!checkPin(options.pin, commitment)) return { status: 'badPin' };
      return apply();
    }
    const applyAt = Date.now() + COMMITMENT_DELAY_MS;
    await setPending([...others, { type, value, applyAt }]);
    return { status: 'pending', applyAt };
  }, [timerEnabled, dailyLimitMs, strictMode, commitment, applyProtectionChange, setPending]);

  const cancelPendingChange = useCallback(async (type) => {
    await setPending(pendingChangesRef.current.filter((c) => c.type !== type));
  }, [setPending]);

  // Every 15s: apply changes whose wait is over, and see whether a schedule window started or ended.
  useEffect(() => {
    const tick = async () => {
      const due = pendingChangesRef.current.filter((c) => c.applyAt <= Date.now());
      if (due.length > 0) {
        await setPending(pendingChangesRef.current.filter((c) => c.applyAt > Date.now()));
        for (const change of due) await applyProtectionChange(change.type, change.value);
      }
      const until = scheduleBlockUntil(schedulesRef.current);
      setScheduleUntil((prev) =>
        (prev ? prev.getTime() : 0) === (until ? until.getTime() : 0) ? prev : until
      );
    };
    tick();
    const interval = setInterval(tick, 15000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [applyProtectionChange, setPending]);

  /**
   * Block list + SafeSearch verdict for a URL about to load:
   * { blocked: 'site' | 'adult' | null, safeUrl: string | null }
   */
  const inspectUrl = useCallback((url) => {
    const current = blockingRef.current;
    const blocked = getBlockReason(url, current);
    return { blocked, safeUrl: !blocked && current.safeSearch ? enforceSafeSearch(url) : null };
  }, []);

  /** Applies the block list / SafeSearch to a URL the app itself is about to open. */
  const screenUrl = useCallback((url) => {
    const verdict = inspectUrl(url);
    if (verdict.blocked) {
      setBlockedNotice({ url, reason: verdict.blocked });
      return null;
    }
    return verdict.safeUrl || url;
  }, [inspectUrl]);

  // Catch-all for pages that reached a tab without passing onShouldStartLoadWithRequest:
  // tabs restored at startup, back/forward, in-page (pushState) navigation, and sites added
  // to the block list while open. Blocked tabs go back to the home page; search pages get
  // SafeSearch.
  // Last SafeSearch rewrite per tab, so a site that drops the parameter cannot cause a reload loop.
  const safeRewriteAt = React.useRef({});
  useEffect(() => {
    if (!tabsInitialized) return;
    const fixes = {};
    let notice = null;
    tabs.forEach((tab, index) => {
      if (!tab.url || tab.url === 'about:blank') return;
      const verdict = inspectUrl(tab.url);
      if (verdict.blocked) {
        fixes[tab.id] = { url: 'about:blank', canGoBack: false, canGoForward: false };
        if (index === activeTabIndexRef.current) notice = { url: tab.url, reason: verdict.blocked };
      } else if (verdict.safeUrl && Date.now() - (safeRewriteAt.current[tab.id] || 0) > 5000) {
        safeRewriteAt.current[tab.id] = Date.now();
        fixes[tab.id] = { url: verdict.safeUrl };
      }
    });
    if (Object.keys(fixes).length === 0) return;
    setTabs(prev => prev.map(tab => (fixes[tab.id]
      ? { ...tab, ...fixes[tab.id], navRequestId: (tab.navRequestId || 0) + 1 }
      : tab)));
    if (notice) setBlockedNotice(notice);
  }, [tabs, blocking, tabsInitialized, inspectUrl]);

  /**
   * Grant 10 extra minutes when user taps "Continue Anyway".
   * Limited to 3 extensions (30 min total) per day.
   */
  const MAX_EXTENSIONS = 3;
  const extendTimer = useCallback(() => {
    const currentExtensions = Math.round((timerStateRef.current.extensionMs || 0) / 600000);
    if (currentExtensions >= MAX_EXTENSIONS) return;
    timerStateRef.current.extensionMs = (timerStateRef.current.extensionMs || 0) + 600000;
    timerStateRef.current.limitReached = false;
    setExtensionMs(prev => prev + 600000);
    setLimitReached(false);
  }, []);

  /**
   * Called by BrowserScreen focus/blur events to pause/resume the timer
   * when the user navigates to non-browser screens.
   */
  const setTimerScreenActive = useCallback(async (active) => {
    const ref = timerStateRef.current;
    if (active) {
      ref.sessionStartMs = Date.now();
      ref.isForeground = true;
    } else {
      if (!ref.isForeground || !ref.enabled) return;
      const liveElapsed = ref.elapsedMs + (Date.now() - ref.sessionStartMs);
      ref.elapsedMs = liveElapsed;
      ref.isForeground = false;
      setTodayElapsedMs(liveElapsed);
      const today = new Date().toISOString().split('T')[0];
      await saveTimerDaily(today, { totalMs: liveElapsed });
    }
  }, []);

  /**
   * Timer tick — 1-second interval that accumulates browsing time
   * and triggers limit enforcement when the daily budget is exhausted.
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      const ref = timerStateRef.current;
      if (!ref.enabled || !ref.isForeground) return;

      // Midnight rollover check
      const todayStr = new Date().toISOString().split('T')[0];
      if (ref.today && ref.today !== todayStr) {
        // New day — reset everything
        timerStateRef.current.elapsedMs = 0;
        timerStateRef.current.today = todayStr;
        timerStateRef.current.sessionStartMs = Date.now();
        timerStateRef.current.limitReached = false;
        timerStateRef.current.extensionMs = 0;
        setTodayElapsedMs(0);
        setLimitReached(false);
        setExtensionMs(0);
        await saveTimerDaily(todayStr, { totalMs: 0 });
        return;
      }

      const liveElapsed = ref.elapsedMs + (Date.now() - ref.sessionStartMs);
      setTodayElapsedMs(liveElapsed);

      if (liveElapsed >= ref.limitMs + ref.extensionMs && !ref.limitReached) {
        timerStateRef.current.limitReached = true;
        setLimitReached(true);
        await saveTimerDaily(todayStr || ref.today, { totalMs: liveElapsed });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Tracking Logic - Records browsing activity for usage statistics
   * Tracks time spent on each domain and updates daily statistics
   * This runs automatically when URL changes or app goes to background
   */
  const recordCurrentActivity = useCallback(async () => {
    const { startTime, currentUrl: trackingUrl } = activityTracker.current;
    if (trackingUrl === 'about:blank') return;
    
    try {
      // Ensure trackingUrl is a valid absolute URL for parsing
      let urlToParse = trackingUrl;
      if (!urlToParse.includes('://')) {
        urlToParse = 'https://' + urlToParse;
      }
      const domain = new URL(urlToParse).hostname;
      const duration = Date.now() - startTime;
      const today = new Date().toISOString().split('T')[0];
      
      await saveUsage(today, domain, duration);
      
      const updatedStats = await loadUsage(today);
      setTodayStats(updatedStats);
    } catch (e) {
      console.warn('[BrowserContext] Usage tracking error:', e.message);
    }
    
    // Reset tracker for next period
    activityTracker.current.startTime = Date.now();
  }, []);

  useEffect(() => {
    // URL Change Tracking
    if (currentUrl !== activityTracker.current.currentUrl) {
      recordCurrentActivity();
      activityTracker.current.currentUrl = currentUrl;
      activityTracker.current.startTime = Date.now();
    }
  }, [currentUrl, recordCurrentActivity]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        recordCurrentActivity();
        // Save tabs when app goes to background
        if (tabsInitializedRef.current) {
          saveTabs(tabsRef.current);
          saveActiveTabIndex(activeTabIndexRef.current);
        }
        // Flush timer progress to AsyncStorage
        const ref = timerStateRef.current;
        if (ref.enabled && ref.isForeground) {
          const liveElapsed = ref.elapsedMs + (Date.now() - ref.sessionStartMs);
          timerStateRef.current.elapsedMs = liveElapsed;
          timerStateRef.current.isForeground = false;
          const todayStr = new Date().toISOString().split('T')[0];
          await saveTimerDaily(todayStr, { totalMs: liveElapsed });
        }
      } else if (nextAppState === 'active') {
        activityTracker.current.startTime = Date.now();
        // Resume timer session — check for midnight rollover first
        const ref = timerStateRef.current;
        const todayStr = new Date().toISOString().split('T')[0];
        if (ref.today && ref.today !== todayStr) {
          // Crossed midnight while backgrounded — reset
          timerStateRef.current.elapsedMs = 0;
          timerStateRef.current.today = todayStr;
          timerStateRef.current.limitReached = false;
          timerStateRef.current.extensionMs = 0;
          setTodayElapsedMs(0);
          setLimitReached(false);
          setExtensionMs(0);
          await saveTimerDaily(todayStr, { totalMs: 0 });
        }
        timerStateRef.current.sessionStartMs = Date.now();
        timerStateRef.current.isForeground = true;
      }
    });

    return () => subscription.remove();
  }, [recordCurrentActivity]);

  // Save tabs whenever they change (after initialization)
  useEffect(() => {
    if (tabsInitialized) {
      saveTabs(tabs);
      saveActiveTabIndex(activeTabIndex);
    }
  }, [tabs, activeTabIndex, tabsInitialized]);

  /**
   * Add a history entry (append-only, cannot be deleted)
   */
  const addHistoryEntry = useCallback(async (url, title) => {
    try {
      const currentHistory = await loadHistory();
      const visitCount = currentHistory.filter(h => h.url === url).length + 1;

      const entry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url,
        title: title || url,
        timestamp: new Date().toISOString(),
        visitCount,
      };

      const success = await saveHistory(entry);
      if (success) {
        const updatedHistory = await loadHistory();
        setHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Error adding history entry:', error);
    }
  }, []);

  /**
   * Navigate to a URL in the current tab
   */
  const navigateTo = useCallback((url) => {
    const formattedUrl = screenUrl(formatUrl(url));
    if (!formattedUrl) return;

    // Use functional update and ref to get current active index.
    // navRequestId increments on every external (address-bar) navigation so BrowserTab
    // can distinguish these from WebView-internal redirect/link navigations.
    setTabs(prev => {
      const currentIndex = activeTabIndexRef.current;
      if (currentIndex >= 0 && currentIndex < prev.length) {
        const updatedTabs = [...prev];
        updatedTabs[currentIndex] = {
          ...updatedTabs[currentIndex],
          url: formattedUrl,
          navRequestId: (updatedTabs[currentIndex].navRequestId || 0) + 1,
        };
        return updatedTabs;
      }
      return prev;
    });
  }, [formatUrl, screenUrl]);

  /**
   * Navigate to a URL in a new tab (for external links)
   */
  const navigateToNewTab = useCallback((url) => {
    const formattedUrl = screenUrl(formatUrl(url));
    if (!formattedUrl) return;

    // Create new tab with the URL
    const newTab = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      url: formattedUrl,
      canGoBack: false,
      canGoForward: false
    };

    setTabs(prev => {
      const newIndex = prev.length;
      activeTabIndexRef.current = newIndex;
      setActiveTabIndex(newIndex);
      return [...prev, newTab];
    });
  }, [formatUrl, screenUrl]);

  /**
   * Tab Operations
   */
  const addTab = useCallback((url = 'about:blank') => {
    const screenedUrl = url === 'about:blank' ? url : screenUrl(url);
    if (!screenedUrl) return;
    const newTab = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      url: screenedUrl,
      canGoBack: false,
      canGoForward: false
    };
    setTabs(prev => {
      const newIndex = prev.length;
      activeTabIndexRef.current = newIndex;
      setActiveTabIndex(newIndex);
      return [...prev, newTab];
    });
  }, [screenUrl]);

  const addTabInBackground = useCallback((url = 'about:blank') => {
    const formattedUrl = screenUrl(formatUrl(url));
    if (!formattedUrl) return;
    const newTab = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      url: formattedUrl,
      canGoBack: false,
      canGoForward: false,
    };
    setTabs(prev => [...prev, newTab]);
  }, [formatUrl, screenUrl]);

  const closeTab = useCallback((index) => {
    setTabs(prev => {
      if (prev.length === 1) {
        // Don't close the last tab, just reset it
        activeTabIndexRef.current = 0;
        setActiveTabIndex(0);
        return [{ id: Date.now().toString(), url: 'about:blank', canGoBack: false, canGoForward: false }];
      }
      const newTabs = prev.filter((_, i) => i !== index);
      const currentActiveIndex = activeTabIndexRef.current;
      // Adjust active tab index if needed
      if (currentActiveIndex > index || (currentActiveIndex === index && currentActiveIndex === newTabs.length)) {
        activeTabIndexRef.current = Math.max(0, currentActiveIndex - 1);
        setActiveTabIndex(Math.max(0, currentActiveIndex - 1));
      }
      return newTabs;
    });
  }, []);

  const updateTabState = useCallback((index, state) => {
    setTabs(prev => {
      const newTabs = [...prev];
      if (newTabs[index]) {
        newTabs[index] = { ...newTabs[index], ...state };
      }
      return newTabs;
    });
  }, []);

  /**
   * Add or remove bookmark
   */
  const toggleBookmark = useCallback(async (url, title) => {
    const existing = await isBookmarked(url);
    if (existing) {
      // Remove bookmark
      const success = await removeBookmark(existing.id);
      if (success) {
        setBookmarks(prev => prev.filter(b => b.id !== existing.id));
      }
      return false;
    } else {
      // Add bookmark
      const bookmark = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url,
        title: title || url,
        timestamp: new Date().toISOString(),
      };
      const success = await saveBookmark(bookmark);
      if (success) {
        setBookmarks(prev => [...prev, bookmark]);
      }
      return true;
    }
  }, []);

  /**
   * Import bookmarks ([{ url, title }]); returns how many were new
   */
  const importBookmarks = useCallback(async (items) => {
    const now = new Date().toISOString();
    const count = await saveBookmarks(items.map((b, i) => ({
      id: Date.now().toString() + i + Math.random().toString(36).substr(2, 5),
      url: b.url,
      title: b.title || b.url,
      timestamp: now,
    })));
    if (count > 0) setBookmarks(await loadBookmarks());
    return count;
  }, []);

  /**
   * Check if current URL is bookmarked
   */
  const checkIsBookmarked = useCallback(async (url) => {
    const bookmark = await isBookmarked(url);
    return bookmark !== null;
  }, []);

  /**
   * Go back in browser history
   */
  const goBack = useCallback(() => {
    if (webViewRef && activeTab.canGoBack) {
      webViewRef.goBack();
    }
  }, [webViewRef, activeTab.canGoBack]);

  /**
   * Go forward in browser history
   */
  const goForward = useCallback(() => {
    if (webViewRef && activeTab.canGoForward) {
      webViewRef.goForward();
    }
  }, [webViewRef, activeTab.canGoForward]);

  /**
   * Refresh current page
   */
  const refresh = useCallback(() => {
    if (webViewRef) {
      webViewRef.reload();
    }
  }, [webViewRef]);

  const value = React.useMemo(() => ({
    history,
    bookmarks,
    tabs,
    activeTabIndex,
    activeTab,
    addTab,
    addTabInBackground,
    closeTab,
    setActiveTabIndex,
    updateTabState,
    currentUrl,
    setCurrentUrl: (url) => navigateTo(url),
    canGoBack: activeTab.canGoBack,
    canGoForward: activeTab.canGoForward,
    setCanGoBack: (val) => updateTabState(activeTabIndex, { canGoBack: val }),
    setCanGoForward: (val) => updateTabState(activeTabIndex, { canGoForward: val }),
    webViewRef,
    setWebViewRef,
    addHistoryEntry,
    toggleBookmark,
    importBookmarks,
    checkIsBookmarked,
    refresh,
    desktopMode,
    setDesktopMode,
    adBlockEnabled,
    setAdBlockEnabled,
    showTabSwitcher,
    setShowTabSwitcher,
    todayStats,
    yesterdayStats,
    isDarkMode,
    toggleDarkMode,
    exitConfirmationEnabled,
    setExitConfirmation,
    urlBarPosition,
    setUrlBarPositionPref,
    autoHideNavBar,
    setAutoHideNavBarPref,
    enhancedCompatEnabled,
    setEnhancedCompatPref,
    backgroundPlayEnabled,
    setBackgroundPlayPref,
    darkPagesEnabled,
    setDarkPagesPref,
    textZoom,
    setTextZoomPref,
    language,
    setLanguagePref,
    searchEngine,
    setSearchEnginePref,
    t,
    userAgent,
    navigateTo,
    navigateToNewTab,
    timerEnabled,
    dailyLimitMs,
    strictMode,
    todayElapsedMs,
    limitReached,
    extensionMs,
    setTimerSettingsPref,
    extendTimer,
    setTimerScreenActive,
    schedules,
    blocking,
    commitment,
    pendingChanges,
    scheduleUntil,
    requestProtectionChange,
    cancelPendingChange,
    inspectUrl,
    blockedNotice,
    setBlockedNotice,
  }), [
    history, bookmarks, tabs, activeTabIndex, activeTab, addTab, addTabInBackground, closeTab,
    setActiveTabIndex, updateTabState, currentUrl, navigateTo, navigateToNewTab, webViewRef,
    addHistoryEntry, toggleBookmark, importBookmarks, checkIsBookmarked, refresh, desktopMode,
    adBlockEnabled, showTabSwitcher, todayStats, yesterdayStats, userAgent,
    isDarkMode, exitConfirmationEnabled, urlBarPosition, autoHideNavBar, enhancedCompatEnabled, backgroundPlayEnabled,
    darkPagesEnabled, textZoom,
    language, t, searchEngine,
    timerEnabled, dailyLimitMs, strictMode, todayElapsedMs, limitReached,
    extensionMs, extendTimer, setTimerScreenActive,
    schedules, blocking, commitment, pendingChanges, scheduleUntil,
    requestProtectionChange, cancelPendingChange, inspectUrl, blockedNotice,
  ]);

  return (
    <BrowserContext.Provider value={value}>
      {children}
    </BrowserContext.Provider>
  );
};

