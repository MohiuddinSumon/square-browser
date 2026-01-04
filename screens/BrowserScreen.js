import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar, RefreshControl, ScrollView, Modal, Text, TouchableOpacity, FlatList, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useBrowser } from '../context/BrowserContext';
import AddressBar from '../components/AddressBar';
import HomeScreen from '../components/HomeScreen';

const BrowserScreen = () => {
  const {
    currentUrl,
    setCurrentUrl,
    setCanGoBack,
    setCanGoForward,
    webViewRef,
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
  const webView = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  
  // Track the last URL the WebView told us about to avoid loops
  const lastReportedUrl = useRef(currentUrl);

  // We only want to update the source if the URL change came from "outside" (e.g. Address Bar)
  // or if we just switched tabs.
  const [sourceUrl, setSourceUrl] = useState(currentUrl);

  useEffect(() => {
    // Handle Android hardware back button
    const backAction = () => {
      if (showTabSwitcher) {
        setShowTabSwitcher(false);
        return true;
      }
      
      if (currentUrl !== 'about:blank' && webView.current) {
        // If we are in the webview, let it handle back if it can
        if (tabs[activeTabIndex].canGoBack) {
          webView.current.goBack();
          return true;
        } else {
          // If we can't go back in webview, return to home
          setCurrentUrl('about:blank');
          return true;
        }
      }

      // If we are on Home page, ask to exit
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
  }, [currentUrl, tabs, activeTabIndex, showTabSwitcher, exitConfirmationEnabled]);

  useEffect(() => {
    // If the context URL changed to something different than what the WebView last reported,
    // it means a user-initiated navigation (like typing in AddressBar or clicking Home)
    if (currentUrl !== lastReportedUrl.current) {
      setSourceUrl(currentUrl);
      lastReportedUrl.current = currentUrl;
    }
  }, [currentUrl]);

  const webViewSource = useMemo(() => ({ uri: sourceUrl }), [sourceUrl]);

  const webViewCallbackRef = useCallback((node) => {
    if (node) {
      webView.current = node;
      setWebViewRef(node);
    }
  }, [setWebViewRef]);

  const handleNavigationStateChange = useCallback((navState) => {
    // Update internal tracker
    const prevUrl = lastReportedUrl.current;
    lastReportedUrl.current = navState.url;

    // Only update context if something actually changed
    // IMPORTANT: We compare with the tab's url to prevent infinite loops
    if (navState.url !== tabs[activeTabIndex].url || 
        navState.canGoBack !== tabs[activeTabIndex].canGoBack || 
        navState.canGoForward !== tabs[activeTabIndex].canGoForward) {
      
      updateTabState(activeTabIndex, {
        canGoBack: navState.canGoBack,
        canGoForward: navState.canGoForward,
        url: navState.url
      });
    }
  }, [activeTabIndex, tabs, updateTabState]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (webView.current) {
      webView.current.reload();
    }
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const handleLoadEnd = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    if (nativeEvent.url && nativeEvent.url !== 'about:blank' && !nativeEvent.url.startsWith('file://')) {
      const title = nativeEvent.title || nativeEvent.url.split('/')[2] || nativeEvent.url;
      addHistoryEntry(nativeEvent.url, title);
    }
  };

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.topBar, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff', borderBottomColor: isDarkMode ? '#333' : '#eee' }]}>
          <AddressBar />
        </View>
        
        {currentUrl === 'about:blank' ? (
          <HomeScreen />
        ) : (
          <View style={styles.webviewContainer}>
            <WebView
              ref={webViewCallbackRef}
              source={webViewSource}
              style={styles.webview}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadEnd={handleLoadEnd}
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
              onRefresh={onRefresh}
            />
          </View>
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
    paddingTop: Platform.OS === 'android' ? 0 : 0, // Removed redundant paddingTop, SafeAreaView handles this
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

