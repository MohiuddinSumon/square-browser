import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar, RefreshControl, ScrollView, Modal, Text, TouchableOpacity, FlatList, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import AddressBar from '../components/AddressBar';
import HomeScreen from '../components/HomeScreen';

// --- BrowserTab Component ---
// Encapsulates logic for a SINGLE tab's WebView to ensure persistence and state management
const BrowserTab = ({ 
  tab, 
  isActive, 
  userAgent, 
  adBlockEnabled, 
  onUpdateState, 
  onLoadEnd, 
  onRegisterRef 
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

  return (
    <View style={[styles.webviewContainer, { display: isActive ? 'flex' : 'none' }]}>
      <WebView
        ref={handleWebViewRef}
        source={webViewSource}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={(e) => onLoadEnd(e, tab.id)}
        startInLoadingState={true}
        renderLoading={() => (
           <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color="#2196F3" />
           </View>
        )}
        userAgent={userAgent}
        injectedJavaScript={adBlockScript}
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


const BrowserScreen = () => {
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
  } = useBrowser();

  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  
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


  useEffect(() => {
    // Handle Android hardware back button
    const backAction = () => {
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
  }, [currentUrl, tabs, activeTabIndex, showTabSwitcher, exitConfirmationEnabled, setCurrentUrl]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.topBar, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
          <AddressBar />
        </View>
        
        {/* Render Content */}
        <View style={{ flex: 1 }}>
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
              />
            );
          })}
        </View>

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
    </SafeAreaView>
  );
};

const ExitModal = ({ visible, onClose, onConfirm, isDarkMode, dontAskAgain, setDontAskAgain }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModal, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
          <Text style={[styles.confirmTitle, { color: isDarkMode ? '#fff' : '#000' }]}>Exit OpenBrowser?</Text>
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
  const { tabs, activeTabIndex, setActiveTabIndex, addTab, closeTab } = useBrowser();

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tabs ({tabs.length})</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={tabs}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={[styles.tabItem, activeTabIndex === index && styles.activeTabItem]}
                onPress={() => {
                  setActiveTabIndex(index);
                  onClose();
                }}
              >
                <Text style={styles.tabUrl} numberOfLines={2}>
                  {item.url === 'about:blank' ? 'Home Page' : item.url}
                </Text>
                <TouchableOpacity 
                  style={styles.closeTabButton}
                  onPress={() => closeTab(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.tabList}
          />

          <TouchableOpacity 
            style={styles.newTabButton}
            onPress={() => {
              addTab();
              onClose();
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.newTabButtonText}>New Tab</Text>
          </TouchableOpacity>
        </View>
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
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabList: {
    paddingBottom: 20,
  },
  tabItem: {
    width: '47%',
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: '1.5%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  activeTabItem: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
  },
  tabUrl: {
    fontSize: 12,
    color: '#333',
  },
  closeTabButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  newTabButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  newTabButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
});

export default BrowserScreen;

