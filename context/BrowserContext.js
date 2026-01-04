import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { loadHistory, saveHistory, loadBookmarks, saveBookmark, removeBookmark, isBookmarked } from '../utils/storage';

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
  const [currentUrl, setCurrentUrl] = useState('about:blank');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [webViewRef, setWebViewRef] = useState(null);
  const [desktopMode, setDesktopMode] = useState(false);
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);

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
    };
    loadInitialData();
  }, []);

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
   * Navigate to a URL
   */
  const navigateTo = useCallback((url) => {
    // Ensure URL has protocol
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && url !== 'about:blank') {
      // Check if it looks like a domain
      if (url.includes('.') && !url.includes(' ')) {
        formattedUrl = 'https://' + url;
      } else {
        // Treat as search query
        formattedUrl = 'https://www.google.com/search?q=' + encodeURIComponent(url);
      }
    }
    setCurrentUrl(formattedUrl);
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
    if (webViewRef && canGoBack) {
      webViewRef.goBack();
    }
  }, [webViewRef, canGoBack]);

  /**
   * Go forward in browser history
   */
  const goForward = useCallback(() => {
    if (webViewRef && canGoForward) {
      webViewRef.goForward();
    }
  }, [webViewRef, canGoForward]);

  /**
   * Refresh current page
   */
  const refresh = useCallback(() => {
    if (webViewRef) {
      webViewRef.reload();
    }
  }, [webViewRef]);

  const value = {
    history,
    bookmarks,
    currentUrl,
    setCurrentUrl,
    canGoBack,
    setCanGoBack,
    canGoForward,
    setCanGoForward,
    webViewRef,
    setWebViewRef,
    addHistoryEntry,
    navigateTo,
    toggleBookmark,
    checkIsBookmarked,
    goBack,
    goForward,
    refresh,
    desktopMode,
    setDesktopMode,
    adBlockEnabled,
    setAdBlockEnabled,
    userAgent,
  };

  return (
    <BrowserContext.Provider value={value}>
      {children}
    </BrowserContext.Provider>
  );
};

