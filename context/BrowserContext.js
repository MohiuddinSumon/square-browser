/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * BrowserContext - Main context provider for browser state management
 * Handles tabs, history, bookmarks, and app-wide browser functionality
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, AppState, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadHistory, saveHistory, loadBookmarks, saveBookmark, removeBookmark, isBookmarked, saveUsage, loadUsage, saveTabs, loadTabs, saveActiveTabIndex, loadActiveTabIndex } from '../utils/storage';

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
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        recordCurrentActivity();
        // Save tabs when app goes to background
        if (tabsInitialized) {
          saveTabs(tabs);
          saveActiveTabIndex(activeTabIndex);
        }
      } else if (nextAppState === 'active') {
        activityTracker.current.startTime = Date.now();
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
  }), [
    history, bookmarks, tabs, activeTabIndex, activeTab, addTab, closeTab,
    setActiveTabIndex, updateTabState, currentUrl, navigateTo, navigateToNewTab, webViewRef,
    addHistoryEntry, toggleBookmark, checkIsBookmarked, refresh, desktopMode,
    adBlockEnabled, showTabSwitcher, todayStats, yesterdayStats, userAgent,
    isDarkMode, exitConfirmationEnabled, urlBarPosition, autoHideNavBar
  ]);

  return (
    <BrowserContext.Provider value={value}>
      {children}
    </BrowserContext.Provider>
  );
};

