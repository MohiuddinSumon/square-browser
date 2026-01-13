/**
 * Copyright (c) 2025 OpenBrowser Contributors
 * 
 * storage.js - Local storage utilities for history, bookmarks, and usage statistics
 * All data is stored locally on the device using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@openbrowser_history';
const BOOKMARKS_KEY = '@openbrowser_bookmarks';

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

const USAGE_KEY = '@openbrowser_usage';

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
