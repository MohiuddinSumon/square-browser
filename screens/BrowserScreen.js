/**
 * Copyright (c) 2025 SquareBrowser Contributors
 *
 * BrowserScreen - Main browser interface component
 * Handles tab management, WebView rendering, and navigation
 */
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar, RefreshControl, ScrollView, Modal, Text, TouchableOpacity, FlatList, BackHandler, Alert, Animated, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import AddressBar from '../components/AddressBar';
import HomeScreen from '../components/HomeScreen';

/**
 * BrowserTab Component
 * Encapsulates logic for a SINGLE tab's WebView to ensure persistence and state management.
 * Each tab maintains its own WebView instance for proper navigation history.
 */
const BrowserTab = ({
  tab,
  isActive,
  userAgent,
  adBlockEnabled,
  onUpdateState,
  onLoadEnd,
  onRegisterRef,
  onScroll,
  autoHideEnabled
}) => {
  // Track the last URL the WebView told us about to avoid loops
  const lastReportedUrl = useRef(tab.url);
  const [sourceUrl, setSourceUrl] = useState(tab.url);
  const webViewRef = useRef(null);

  // Sync sourceUrl ONLY when tab.url changes EXTERNALLY (e.g. address bar)
  // and differs from what we last reported.
  useEffect(() => {
    if (tab.url !== lastReportedUrl.current) {
      setSourceUrl(tab.url);
      lastReportedUrl.current = tab.url;
    }
  }, [tab.url]);

  const webViewSource = useMemo(() => ({ uri: sourceUrl }), [sourceUrl]);

  const handleNavigationStateChange = useCallback((navState) => {
    // Update internal tracker
    lastReportedUrl.current = navState.url;
    // Notify parent to update context/tab state
    onUpdateState(navState);
  }, [onUpdateState]);

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

  const adBlockScript = adBlockEnabled ? `
    (function() {
      const adSelectors = ['.adsbygoogle', '[id^="google_ads_"]', '.ad-box', '.ad-container', '.banner-ad', '.video-ads'];
      const removeAds = () => {
        adSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });
      };
      removeAds();
      setTimeout(removeAds, 2000);
    })();
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

  return (
    <View style={[styles.webviewContainer, { display: isActive ? 'flex' : 'none' }]}>
      <WebView
        ref={handleWebViewRef}
        source={webViewSource}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={(e) => onLoadEnd(e, tab.id)}
        onMessage={(event) => {
          if (autoHideEnabled && onScroll) {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'scroll') {
                onScroll(data.direction, data.scrollY);
              }
            } catch (e) {
              // Ignore non-JSON messages
            }
          }
        }}
        startInLoadingState={true}
        renderLoading={() => (
           <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color="#2196F3" />
           </View>
        )}
        userAgent={userAgent}
        injectedJavaScript={adBlockScript + scrollTrackingScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={Platform.OS !== 'web'}
        thirdPartyCookiesEnabled={Platform.OS !== 'web'}
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode="compatibility"
        pullToRefreshEnabled={true}
      />
    </View>
  );
};


const BrowserScreen = ({ navigation }) => {
  const {
    currentUrl,
    setCurrentUrl,
    setWebViewRef,
    adBlockEnabled,
    userAgent,
    tabs,
    activeTabIndex,
    addTab,
    closeTab,
    setActiveTabIndex,
    updateTabState,
    addHistoryEntry,
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
    extendTimer,
    setTimerScreenActive,
  } = useBrowser();

  const showSoftOverlay = timerEnabled && limitReached && !strictMode;
  const showStrictWall = timerEnabled && limitReached && strictMode;

  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

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

  // Reset navbar visibility when URL changes
  useEffect(() => {
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
                onUpdateState={(state) => handleTabUpdate(state, index)}
                onLoadEnd={handleLoadEnd}
                onRegisterRef={handleRegisterRef}
                onScroll={handleScroll}
                autoHideEnabled={autoHideNavBar}
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
      <View style={styles.modalOverlay}>
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

const TimerSoftOverlay = ({ visible, onExtend, isDarkMode }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
          <Ionicons name="timer-outline" size={48} color="#FF9800" style={{ marginBottom: 12 }} />
          <Text style={[styles.confirmTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Daily Limit Reached</Text>
          <Text style={[styles.confirmText, { color: isDarkMode ? '#ccc' : '#666' }]}>
            You've used your daily browsing time. You can extend by 10 minutes at a time.
          </Text>
          <TouchableOpacity
            style={[styles.confirmButton, styles.exitButton, { width: '100%', marginTop: 16, backgroundColor: '#FF9800' }]}
            onPress={onExtend}
          >
            <Text style={styles.exitButtonText}>Give me 10 more minutes</Text>
          </TouchableOpacity>
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
});

export default BrowserScreen;

