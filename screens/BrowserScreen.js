import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, SafeAreaView, StatusBar, RefreshControl, ScrollView, Modal, Text, TouchableOpacity, FlatList } from 'react-native';
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
    showTabSwitcher,
    setShowTabSwitcher,
    isDarkMode,
  } = useBrowser();
  const webView = useRef(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // No need for separate useEffect for webViewRef if using callback ref
  // But let's keep it clean by updating context when the webview mounts
  const webViewCallbackRef = useCallback((node) => {
    if (node) {
      webView.current = node;
      setWebViewRef(node);
    }
  }, [setWebViewRef]);

  const handleNavigationStateChange = (navState) => {
    console.log('Navigation state changed:', navState.url);
    // Only update if the URL or navigation state actually changed
    updateTabState(activeTabIndex, {
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      url: navState.url
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (webView.current) {
      webView.current.reload();
    }
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const handleLoadEnd = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.log('Page load ended:', nativeEvent.url, nativeEvent.title);
    
    // Log to history when page finishes loading
    if (nativeEvent.url && nativeEvent.url !== 'about:blank' && !nativeEvent.url.startsWith('file://')) {
      // Use title from nativeEvent, or extract from URL if not available
      const title = nativeEvent.title || nativeEvent.url.split('/')[2] || nativeEvent.url;
      console.log('Adding to history:', nativeEvent.url, title);
      addHistoryEntry(nativeEvent.url, title);
    }
  };

  const handleLoad = (syntheticEvent) => {
    // Handled by handleNavigationStateChange
  };

  const adBlockScript = adBlockEnabled ? `
    (function() {
      const adSelectors = [
        '.adsbygoogle', '[id^="google_ads_"]', '.ad-box', '.ad-container', 
        '.ad-wrapper', '.banner-ad', '.sidebar-ad', '.video-ads',
        '.facebook-ads', '.sponsor-message', '.promoted-content'
      ];
      const removeAds = () => {
        adSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
            el.remove();
          });
        });
      };
      removeAds();
      setTimeout(removeAds, 1000);
      setTimeout(removeAds, 3000);
      setInterval(removeAds, 5000);
    })();
  ` : '';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1e1e1e' : '#fff' }]}>
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#fff' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
              source={{ uri: currentUrl }}
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
              javaScriptCanOpenWindowsAutomatically={true}
              mixedContentMode="never"
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <TabSwitcher 
        visible={showTabSwitcher} 
        onClose={() => setShowTabSwitcher(false)} 
      />
    </SafeAreaView>
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
});

export default BrowserScreen;

