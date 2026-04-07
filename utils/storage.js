/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * storage.js - Local storage utilities for history, bookmarks, and usage statistics
 * All data is stored locally on the device using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@squarebrowser_history';
const BOOKMARKS_KEY = '@squarebrowser_bookmarks';

/**
 * Save a history entry (append-only)
 * @param {Object} entry - History entry with { id, url, title, timestamp, visitCount }
 */
export const saveHistory = async (entry) => {
  try {
    const existingHistory = await loadHistory();
    const updatedHistory = [...existingHistory, entry];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
};

/**
 * Load all history entries
 * @returns {Array} Array of history entries
 */
export const loadHistory = async () => {
  try {
    const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
    return [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

/**
 * Save a bookmark
 * @param {Object} bookmark - Bookmark object with { id, url, title, timestamp }
 */
export const saveBookmark = async (bookmark) => {
  try {
    const existingBookmarks = await loadBookmarks();
    // Check if bookmark already exists
    const exists = existingBookmarks.some(b => b.url === bookmark.url);
    if (!exists) {
      const updatedBookmarks = [...existingBookmarks, bookmark];
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving bookmark:', error);
    return false;
  }
};

/**
 * Remove a bookmark by ID
 * @param {string} id - Bookmark ID to remove
 */
export const removeBookmark = async (id) => {
  try {
    const existingBookmarks = await loadBookmarks();
    const updatedBookmarks = existingBookmarks.filter(b => b.id !== id);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
    return true;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }
};

/**
 * Load all bookmarks
 * @returns {Array} Array of bookmarks
 */
export const loadBookmarks = async () => {
  try {
    const bookmarksJson = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (bookmarksJson) {
      return JSON.parse(bookmarksJson);
    }
    return [];
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    return [];
  }
};

/**
 * Check if a URL is bookmarked
 * @param {string} url - URL to check
 * @returns {Object|null} Bookmark object if found, null otherwise
 */
export const isBookmarked = async (url) => {
  try {
    const bookmarks = await loadBookmarks();
    return bookmarks.find(b => b.url === url) || null;
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return null;
  }
};

const TABS_KEY = '@squarebrowser_tabs';
const ACTIVE_TAB_INDEX_KEY = '@squarebrowser_active_tab_index';
const USAGE_KEY = '@squarebrowser_usage';

/**
 * Save usage duration for a domain on a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} domain - Domain name
 * @param {number} duration - Duration in milliseconds to add
 */
export const saveUsage = async (date, domain, duration) => {
  try {
    const usageDataJson = await AsyncStorage.getItem(USAGE_KEY);
    const usageData = usageDataJson ? JSON.parse(usageDataJson) : {};
    
    if (!usageData[date]) {
      usageData[date] = {};
    }
    
    if (!usageData[date][domain]) {
      usageData[date][domain] = 0;
    }
    
    usageData[date][domain] += duration;
    
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usageData));
    return true;
  } catch (error) {
    console.error('Error saving usage:', error);
    return false;
  }
};

/**
 * Load usage statistics for a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Object} Object with domain keys and duration values
 */
export const loadUsage = async (date) => {
  try {
    const usageDataJson = await AsyncStorage.getItem(USAGE_KEY);
    if (usageDataJson) {
      const usageData = JSON.parse(usageDataJson);
      return usageData[date] || {};
    }
    return {};
  } catch (error) {
    console.error('Error loading usage:', error);
    return {};
  }
};

/**
 * Save tabs state
 * @param {Array} tabs - Array of tab objects
 */
export const saveTabs = async (tabs) => {
  try {
    await AsyncStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    return true;
  } catch (error) {
    console.error('Error saving tabs:', error);
    return false;
  }
};

/**
 * Load tabs state
 * @returns {Array} Array of tab objects
 */
export const loadTabs = async () => {
  try {
    const tabsJson = await AsyncStorage.getItem(TABS_KEY);
    if (tabsJson) {
      const tabs = JSON.parse(tabsJson);
      // Validate and return tabs, or default to single blank tab
      if (Array.isArray(tabs) && tabs.length > 0) {
        return tabs;
      }
    }
    // Return default tab state
    return [{ id: Date.now().toString(), url: 'about:blank', canGoBack: false, canGoForward: false }];
  } catch (error) {
    console.error('Error loading tabs:', error);
    return [{ id: Date.now().toString(), url: 'about:blank', canGoBack: false, canGoForward: false }];
  }
};

/**
 * Save active tab index
 * @param {number} index - Active tab index
 */
export const saveActiveTabIndex = async (index) => {
  try {
    await AsyncStorage.setItem(ACTIVE_TAB_INDEX_KEY, JSON.stringify(index));
    return true;
  } catch (error) {
    console.error('Error saving active tab index:', error);
    return false;
  }
};

/**
 * Load active tab index
 * @returns {number} Active tab index
 */
export const loadActiveTabIndex = async () => {
  try {
    const indexJson = await AsyncStorage.getItem(ACTIVE_TAB_INDEX_KEY);
    if (indexJson) {
      const index = JSON.parse(indexJson);
      // Ensure index is a valid number
      if (typeof index === 'number' && index >= 0) {
        return index;
      }
    }
    return 0;
  } catch (error) {
    console.error('Error loading active tab index:', error);
    return 0;
  }
};

const TIMER_SETTINGS_KEY = '@squarebrowser_timer_settings';
const TIMER_DAILY_PREFIX = '@squarebrowser_timer_daily_';

/**
 * Save timer settings
 * @param {Object} settings - { enabled, dailyLimitMs, strictMode }
 */
export const saveTimerSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving timer settings:', error);
    return false;
  }
};

/**
 * Load timer settings
 * @returns {Object} { enabled, dailyLimitMs, strictMode }
 */
export const loadTimerSettings = async () => {
  try {
    const json = await AsyncStorage.getItem(TIMER_SETTINGS_KEY);
    if (json) {
      return JSON.parse(json);
    }
    return { enabled: false, dailyLimitMs: 3600000, strictMode: false };
  } catch (error) {
    console.error('Error loading timer settings:', error);
    return { enabled: false, dailyLimitMs: 3600000, strictMode: false };
  }
};

/**
 * Save daily timer record
 * @param {string} date - YYYY-MM-DD
 * @param {Object} record - { totalMs, reminderDismissed }
 */
export const saveTimerDaily = async (date, record) => {
  try {
    await AsyncStorage.setItem(TIMER_DAILY_PREFIX + date, JSON.stringify({ ...record, date }));
    return true;
  } catch (error) {
    console.error('Error saving timer daily:', error);
    return false;
  }
};

/**
 * Load daily timer record
 * @param {string} date - YYYY-MM-DD
 * @returns {Object} { totalMs, reminderDismissed, date }
 */
export const loadTimerDaily = async (date) => {
  try {
    const json = await AsyncStorage.getItem(TIMER_DAILY_PREFIX + date);
    if (json) {
      return JSON.parse(json);
    }
    return { totalMs: 0, reminderDismissed: false, date };
  } catch (error) {
    console.error('Error loading timer daily:', error);
    return { totalMs: 0, reminderDismissed: false, date };
  }
};
