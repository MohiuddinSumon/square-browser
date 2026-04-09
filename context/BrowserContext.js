/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * BrowserContext - Main context provider for browser state management
 * Handles tabs, history, bookmarks, and app-wide browser functionality
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, AppState, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadHistory, saveHistory, loadBookmarks, saveBookmark, removeBookmark, isBookmarked, saveUsage, loadUsage, saveTabs, loadTabs, saveActiveTabIndex, loadActiveTabIndex, saveTimerSettings, loadTimerSettings, saveTimerDaily, loadTimerDaily } from '../utils/storage';

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

  // User Agents
  const MOBILE_UA = Platform.OS === 'ios' 
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36';
  
  const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
        if (tabsInitialized) {
          saveTabs(tabs);
          saveActiveTabIndex(activeTabIndex);
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
  }, [recordCurrentActivity, tabs, activeTabIndex, tabsInitialized]);

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
      console.log('[BrowserContext] addHistoryEntry called with:', url, title);
      
      // Load current history to calculate visit count accurately
      const currentHistory = await loadHistory();
      console.log('[BrowserContext] Current history length:', currentHistory.length);
      
      const visitCount = currentHistory.filter(h => h.url === url).length + 1;

      const entry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        url,
        title: title || url,
        timestamp: new Date().toISOString(),
        visitCount,
      };

      console.log('[BrowserContext] Saving history entry:', entry);
      const success = await saveHistory(entry);
      console.log('[BrowserContext] Save success:', success);
      
      if (success) {
        // Reload history from storage to ensure consistency
        const updatedHistory = await loadHistory();
        console.log('[BrowserContext] Updated history length:', updatedHistory.length);
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
    // Ensure URL has protocol
    let formattedUrl = url.trim();

    // Handle about:blank
    if (formattedUrl === 'about:blank' || formattedUrl === '') {
      formattedUrl = 'about:blank';
    }
    // Already has protocol
    else if (formattedUrl.startsWith('http://') || formattedUrl.startsWith('https://')) {
      // Keep as is
    }
    // Check if it looks like a domain (has dots, no spaces)
    else if (formattedUrl.includes('.') && !formattedUrl.includes(' ')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    // Treat as search query
    else {
      formattedUrl = 'https://www.google.com/search?q=' + encodeURIComponent(formattedUrl);
    }

    // Use functional update and ref to get current active index
    setTabs(prev => {
      const currentIndex = activeTabIndexRef.current;
      if (currentIndex >= 0 && currentIndex < prev.length) {
        const updatedTabs = [...prev];
        updatedTabs[currentIndex] = { ...updatedTabs[currentIndex], url: formattedUrl };
        return updatedTabs;
      }
      return prev;
    });
  }, []);

  /**
   * Navigate to a URL in a new tab (for external links)
   */
  const navigateToNewTab = useCallback((url) => {
    // Ensure URL has protocol
    let formattedUrl = url.trim();

    // Handle about:blank
    if (formattedUrl === 'about:blank' || formattedUrl === '') {
      formattedUrl = 'about:blank';
    }
    // Already has protocol
    else if (formattedUrl.startsWith('http://') || formattedUrl.startsWith('https://')) {
      // Keep as is
    }
    // Check if it looks like a domain (has dots, no spaces)
    else if (formattedUrl.includes('.') && !formattedUrl.includes(' ')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    // Treat as search query
    else {
      formattedUrl = 'https://www.google.com/search?q=' + encodeURIComponent(formattedUrl);
    }

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
  }, []);

  /**
   * Tab Operations
   */
  const addTab = useCallback((url = 'about:blank') => {
    const newTab = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      url: url,
      canGoBack: false,
      canGoForward: false
    };
    setTabs(prev => {
      const newIndex = prev.length;
      activeTabIndexRef.current = newIndex;
      setActiveTabIndex(newIndex);
      return [...prev, newTab];
    });
  }, []);

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
  }), [
    history, bookmarks, tabs, activeTabIndex, activeTab, addTab, closeTab,
    setActiveTabIndex, updateTabState, currentUrl, navigateTo, navigateToNewTab, webViewRef,
    addHistoryEntry, toggleBookmark, checkIsBookmarked, refresh, desktopMode,
    adBlockEnabled, showTabSwitcher, todayStats, yesterdayStats, userAgent,
    isDarkMode, exitConfirmationEnabled, urlBarPosition, autoHideNavBar,
    timerEnabled, dailyLimitMs, strictMode, todayElapsedMs, limitReached,
    extensionMs, extendTimer, setTimerScreenActive,
  ]);

  return (
    <BrowserContext.Provider value={value}>
      {children}
    </BrowserContext.Provider>
  );
};

